/**
 * Trading OS - Residual Position Manager
 *
 * Persists residual LONG option positions in a dedicated sheet.
 *
 * בשלב זה המודול רק מגדיר את מבנה הגיליון ויודע ליצור אותו.
 * עדיין אינו קורא או משנה עסקאות.
 */

const TOS_RESIDUAL_POSITION_MANAGER = {
  HEADERS: [
    'ResidualID',
    'TradeID',
    'LegID',
    'BrokerContractID',
    'Symbol',
    'OptionType',
    'Strike',
    'Expiration',
    'Quantity',
    'CostBasis',
    'MarketValue',
    'UnrealizedPnL',
    'ResidualStatus',
    'DetectedAt',
    'LastUpdatedAt',
    'ClosedAt',
    'SuggestedAction',
    'Notes'
  ],

  /**
   * Returns the residual positions sheet.
   * Creates and initializes it when missing.
   *
   * @return {GoogleAppsScript.Spreadsheet.Sheet}
   */

/**
 * Returns all existing Residual IDs.
 *
 * Used to prevent duplicate inserts.
 *
 * @return {Object<string, boolean>}
 */
getExistingResidualIds_() {
  const sheet = this.ensureSheet_();

  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return {};
  }

  const ids = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getValues();

  const result = {};

  ids.forEach(function (row) {
    const id = String(row[0] || '').trim();

    if (id) {
      result[id] = true;
    }
  });

  return result;
},
/**
 * Builds a stable Residual ID from the trade and leg.
 *
 * @param {*} tradeId Trading OS trade ID.
 * @param {*} legId Trading OS leg ID.
 * @param {*} brokerContractId IBKR contract ID.
 * @return {string}
 */
buildResidualId_(
  tradeId,
  legId,
  brokerContractId
) {
  const normalizedTradeId =
    String(tradeId || '').trim();

  const normalizedLegId =
    String(legId || '').trim();

  const normalizedContractId =
    String(brokerContractId || '').trim();

  return [
    'RES',
    normalizedTradeId,
    normalizedLegId,
    normalizedContractId
  ].join('|');
},
/**
 * Builds one RESIDUAL_POSITIONS sheet row.
 *
 * The method only maps data. It does not write to the sheet.
 *
 * @param {string} tradeId Trading OS trade ID.
 * @param {Object} leg Residual LONG leg.
 * @param {Date|string} detectedAt Residual detection time.
 * @return {Array<*>} Row matching HEADERS order.
 */
buildRow_(
  tradeId,
  leg,
  detectedAt
) {
  const safeLeg = leg || {};

  const normalizedTradeId =
    String(
      tradeId ||
      safeLeg.tradeId ||
      ''
    ).trim();

  const legId =
    String(
      safeLeg.legId ||
      ''
    ).trim();

  const brokerContractId =
    String(
      safeLeg.brokerContractId ||
      ''
    ).trim();

  const timestamp =
    detectedAt ||
    new Date();

  return [
    this.buildResidualId_(
      normalizedTradeId,
      legId,
      brokerContractId
    ),
    normalizedTradeId,
    legId,
    brokerContractId,
    safeLeg.symbol || '',
    safeLeg.optionType ||
      safeLeg.callPut ||
      '',
    safeLeg.strike || '',
    safeLeg.expiration || '',
    safeLeg.quantity || '',
    safeLeg.costBasis ||
      safeLeg.entryPrice ||
      '',
    safeLeg.marketValue || '',
    safeLeg.unrealizedPnL || '',
    'OPEN',
    timestamp,
    timestamp,
    '',
    '',
    ''
  ];
},
/**
 * Persists classified residual LONG legs.
 *
 * Existing Residual IDs are skipped, making the operation idempotent.
 * This method does not classify legs and does not modify trades.
 *
 * @param {string} tradeId Trading OS trade ID.
 * @param {Object[]} residualLegs Already classified residual LONG legs.
 * @param {Date|string=} detectedAt Optional detection time.
 * @return {Object} Write summary.
 */
saveResidualLegs_(
  tradeId,
  residualLegs,
  detectedAt
) {
  const safeLegs =
    Array.isArray(residualLegs)
      ? residualLegs
      : [];

  const result = {
    received: safeLegs.length,
    inserted: 0,
    skipped: 0,
    rows: []
  };

  if (safeLegs.length === 0) {
    return result;
  }

  const sheet =
    this.ensureSheet_();

  const existingIds =
    this.getExistingResidualIds_();

  const timestamp =
    detectedAt ||
    new Date();

  safeLegs.forEach(function (leg) {
    const safeLeg = leg || {};

    const residualId =
      TOS_RESIDUAL_POSITION_MANAGER
        .buildResidualId_(
          tradeId,
          safeLeg.legId,
          safeLeg.brokerContractId
        );

    if (existingIds[residualId]) {
      result.skipped++;
      return;
    }

    const row =
      TOS_RESIDUAL_POSITION_MANAGER
        .buildRow_(
          tradeId,
          safeLeg,
          timestamp
        );

    result.rows.push(row);
    result.inserted++;

    existingIds[residualId] = true;
  });

  if (result.rows.length > 0) {
    sheet
      .getRange(
        sheet.getLastRow() + 1,
        1,
        result.rows.length,
        this.HEADERS.length
      )
      .setValues(result.rows);
  }

  return result;
},


  /**
   * Synchronizes persisted residual positions with the current IBKR
   * OpenPositions snapshot.
   *
   * Rules:
   * - OPEN residual still present at IBKR: refresh live values and timestamp.
   * - OPEN residual missing from IBKR: mark CLOSED and set ClosedAt.
   * - CLOSED residuals are left unchanged.
   *
   * @param {Object[]} openPositions Current normalized/raw IBKR positions.
   * @param {Date|string=} synchronizedAt Optional synchronization time.
   * @return {Object} Synchronization summary.
   */
  synchronizeWithOpenPositions_(openPositions, synchronizedAt) {
    const sheet = this.ensureSheet_();
    const lastRow = sheet.getLastRow();
    const result = {
      openResiduals: 0,
      refreshed: 0,
      closed: 0,
      unchanged: 0,
      writesPerformed: 0
    };

    if (lastRow <= 1) {
      return result;
    }

    const timestamp = synchronizedAt || new Date();
    const values = sheet
      .getRange(2, 1, lastRow - 1, this.HEADERS.length)
      .getValues();
    const openByContractId = this.buildOpenPositionMap_(openPositions);
    const headerIndex = this.buildHeaderIndex_();
    const changedRows = [];

    values.forEach(function (row, index) {
      const status = String(
        row[headerIndex.ResidualStatus] || ''
      ).trim().toUpperCase();

      if (status !== 'OPEN') {
        result.unchanged++;
        return;
      }

      result.openResiduals++;

      const contractId = TOS_RESIDUAL_POSITION_MANAGER.normalizeContractId_(
        row[headerIndex.BrokerContractID]
      );
      const brokerPosition = openByContractId[contractId];

      if (brokerPosition) {
        row[headerIndex.Quantity] =
          TOS_RESIDUAL_POSITION_MANAGER.valueOrExisting_(
            brokerPosition.position,
            brokerPosition.quantity,
            row[headerIndex.Quantity]
          );
        row[headerIndex.CostBasis] =
          TOS_RESIDUAL_POSITION_MANAGER.valueOrExisting_(
            brokerPosition.costBasisMoney,
            brokerPosition.costBasis,
            row[headerIndex.CostBasis]
          );
        row[headerIndex.MarketValue] =
          TOS_RESIDUAL_POSITION_MANAGER.valueOrExisting_(
            brokerPosition.positionValue,
            brokerPosition.marketValue,
            row[headerIndex.MarketValue]
          );
        row[headerIndex.UnrealizedPnL] =
          TOS_RESIDUAL_POSITION_MANAGER.valueOrExisting_(
            brokerPosition.fifoPnlUnrealized,
            brokerPosition.unrealizedPnL,
            row[headerIndex.UnrealizedPnL]
          );
        row[headerIndex.LastUpdatedAt] = timestamp;
        result.refreshed++;
      } else {
        row[headerIndex.ResidualStatus] = 'CLOSED';
        row[headerIndex.LastUpdatedAt] = timestamp;
        row[headerIndex.ClosedAt] = timestamp;
        row[headerIndex.SuggestedAction] = '';
        result.closed++;
      }

      changedRows.push({
        sheetRow: index + 2,
        values: row
      });
    });

    changedRows.forEach(function (item) {
      sheet
        .getRange(item.sheetRow, 1, 1, TOS_RESIDUAL_POSITION_MANAGER.HEADERS.length)
        .setValues([item.values]);
      result.writesPerformed++;
    });

    Logger.log(
      'Residual position sync completed. Open=' +
      result.openResiduals +
      ', Refreshed=' + result.refreshed +
      ', Closed=' + result.closed +
      ', Unchanged=' + result.unchanged +
      ', WritesPerformed=' + result.writesPerformed
    );

    return result;
  },

  /** @return {Object<string, number>} */
  buildHeaderIndex_() {
    const result = {};
    this.HEADERS.forEach(function (header, index) {
      result[header] = index;
    });
    return result;
  },

  /**
   * Builds a lookup of current IBKR OpenPositions by contract ID.
   *
   * @param {Object[]} openPositions Broker open positions.
   * @return {Object<string, Object>}
   */
  buildOpenPositionMap_(openPositions) {
    const result = {};
    (Array.isArray(openPositions) ? openPositions : [])
      .forEach(function (position) {
        const safePosition = position || {};
        const contractId = TOS_RESIDUAL_POSITION_MANAGER
          .normalizeContractId_(
            safePosition.conid ||
            safePosition.brokerContractId ||
            safePosition.contractId
          );

        if (contractId) {
          result[contractId] = safePosition;
        }
      });
    return result;
  },

  /** @param {*} value @return {string} */
  normalizeContractId_(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/,/g, '')
      .trim();
  },

  /**
   * Returns the first supplied value that is not blank.
   * Zero is considered a valid value.
   *
   * @return {*}
   */
  valueOrExisting_() {
    const values = Array.prototype.slice.call(arguments);
    for (let index = 0; index < values.length; index++) {
      const value = values[index];
      if (value !== '' && value !== null && value !== undefined) {
        return value;
      }
    }
    return '';
  },

  ensureSheet_() {
    const spreadsheet =
      SpreadsheetApp.getActiveSpreadsheet();

    let sheet =
      spreadsheet.getSheetByName(
        TOS_SHEETS.RESIDUAL_POSITIONS
      );

    if (!sheet) {
      sheet =
        spreadsheet.insertSheet(
          TOS_SHEETS.RESIDUAL_POSITIONS
        );
    }

    const headerRange =
      sheet.getRange(
        1,
        1,
        1,
        this.HEADERS.length
      );

    const currentHeaders =
      headerRange
        .getValues()[0]
        .map(function (value) {
          return String(value || '').trim();
        });

    const headersMatch =
      this.HEADERS.every(
        function (header, index) {
          return currentHeaders[index] === header;
        }
      );

    if (!headersMatch) {
      headerRange
        .setValues([
          this.HEADERS.slice()
        ])
        .setFontWeight('bold')
        .setWrap(true);

      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(
        1,
        this.HEADERS.length
      );
    }

    return sheet;
  }
};
/**
 * Manual test runner.
 * Creates the RESIDUAL_POSITIONS sheet when missing.
 */
function testResidualPositionManagerEnsureSheet() {
  const sheet =
    TOS_RESIDUAL_POSITION_MANAGER.ensureSheet_();

  Logger.log(
    'Residual positions sheet ready: ' +
    sheet.getName()
  );

  Logger.log(
    'Headers count: ' +
    TOS_RESIDUAL_POSITION_MANAGER.HEADERS.length
  );
}