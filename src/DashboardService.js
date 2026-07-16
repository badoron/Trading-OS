/**
 * Trading OS - Dashboard Service
 *
 * Connects Google Sheets data to:
 * - TOS_DASHBOARD_BUILDER
 * - TOS_DASHBOARD_RENDERER
 *
 * Responsibilities:
 * - Read MASTER_TRADES
 * - Read TRADE_LEGS
 * - Normalize sheet rows
 * - Build dashboard model
 * - Render DASHBOARD
 */

const TOS_DASHBOARD_SERVICE = {
  MASTER_TRADES: 'MASTER_TRADES',
  TRADE_LEGS: 'TRADE_LEGS',

  /**
   * Normalizes MASTER_TRADES table rows.
   *
   * @param {Object} table Normalized sheet table.
   * @return {Object[]} Normalized master trades.
   */
  normalizeMasterTrades_(table) {
    const safeTable = table || {
      headers: [],
      rows: []
    };

    return (safeTable.rows || []).map(item => {
      return {
        rowNumber:
          item.rowNumber,

        tradeId:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'TradeID'
            )
          ),

        strategyId:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'StrategyID'
            )
          ).toUpperCase(),

        symbol:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'Symbol'
            )
          ),

        workflowStatus:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'WorkflowStatus'
            )
          ).toUpperCase(),

        entryDate:
          this.getCell_(
            item.row,
            safeTable.headers,
            'EntryDate'
          ),

        exitDate:
          this.getCell_(
            item.row,
            safeTable.headers,
            'ExitDate'
          ),

        realizedPnL:
          this.number_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'RealizedPnL'
            )
          ),

        exitReason:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'ExitReason'
            )
          )
      };
    });
  },

  /**
   * Normalizes TRADE_LEGS table rows.
   *
   * @param {Object} table Normalized sheet table.
   * @return {Object[]} Normalized trade legs.
   */
  normalizeTradeLegs_(table) {
    const safeTable = table || {
      headers: [],
      rows: []
    };

    return (safeTable.rows || []).map(item => {
      return {
        rowNumber:
          item.rowNumber,

        legId:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'LegID'
            )
          ),

        tradeId:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'TradeID'
            )
          ),

        brokerContractId:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'BrokerContractID'
            )
          ),

        expiration:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'Expiration'
            )
          ),

        longShort:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'LongShort'
            )
          ).toUpperCase(),

        legStatus:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'LegStatus'
            )
          ).toUpperCase(),

        marketValue:
          this.number_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'MarketValue'
            )
          ),

        unrealizedPnL:
          this.number_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'UnrealizedPnL'
            )
          )
      };
    });
  },

  /**
   * Groups normalized legs by TradeID.
   *
   * @param {Object[]} legs Normalized trade legs.
   * @return {Object} Legs grouped by TradeID.
   */
  groupLegsByTradeId_(legs) {
    const map = {};

    (legs || []).forEach(leg => {
      const tradeId =
        this.text_(
          leg && leg.tradeId
        );

      if (!tradeId) {
        return;
      }

      if (!map[tradeId]) {
        map[tradeId] = [];
      }

      map[tradeId].push(leg);
    });

    return map;
  },

  /**
   * Builds dashboard model from normalized data.
   *
   * @param {Object[]} trades Normalized master trades.
   * @param {Object[]} legs Normalized trade legs.
   * @return {Object} Dashboard model.
   */
  buildModel_(trades, legs) {
    const safeTrades =
      trades || [];

    const safeLegs =
      legs || [];

    const legsByTradeId =
      this.groupLegsByTradeId_(
        safeLegs
      );

    return TOS_DASHBOARD_BUILDER
      .buildDashboardModel_(
        safeTrades,
        safeLegs,
        legsByTradeId
      );
  },

  /**
   * Builds and renders dashboard from supplied data.
   *
   * Used by unit tests and the real refresh method.
   *
   * @param {Object[]} trades Normalized master trades.
   * @param {Object[]} legs Normalized trade legs.
   * @param {Object} renderer Renderer implementation.
   * @return {Object} Render result.
   */
  refreshFromData_(
    trades,
    legs,
    renderer
  ) {
    const effectiveRenderer =
      renderer ||
      TOS_DASHBOARD_RENDERER;

    const model =
      this.buildModel_(
        trades,
        legs
      );

    return effectiveRenderer.render(
      model
    );
  },

  /**
   * Reads real sheet data and refreshes DASHBOARD.
   *
   * @return {Object} Refresh result.
   */
  refreshDashboard() {
    const ss =
      SpreadsheetApp.getActiveSpreadsheet();

    const masterSheet =
      ss.getSheetByName(
        this.MASTER_TRADES
      );

    const legsSheet =
      ss.getSheetByName(
        this.TRADE_LEGS
      );

    if (!masterSheet) {
      throw new Error(
        'Missing sheet: ' +
        this.MASTER_TRADES
      );
    }

    if (!legsSheet) {
      throw new Error(
        'Missing sheet: ' +
        this.TRADE_LEGS
      );
    }

    const masterTable =
      this.getTable_(
        masterSheet,
        [
          'TradeID',
          'StrategyID',
          'Symbol',
          'WorkflowStatus'
        ]
      );

    const legsTable =
      this.getTable_(
        legsSheet,
        [
          'LegID',
          'TradeID',
          'BrokerContractID'
        ]
      );

    const trades =
      this.normalizeMasterTrades_(
        masterTable
      );

    const legs =
      this.normalizeTradeLegs_(
        legsTable
      );

    const result =
      this.refreshFromData_(
        trades,
        legs,
        TOS_DASHBOARD_RENDERER
      );

    Logger.log(
      'Dashboard refresh completed.' +
      ' Trades=' +
      trades.length +
      ', Legs=' +
      legs.length +
      ', DDC=' +
      (
        result.ddcTrades !== undefined
          ? result.ddcTrades
          : 0
      )
    );

    return result;
  },

  /**
   * Reads a table with dynamic header row detection.
   *
   * @param {Object} sheet Google Sheet.
   * @param {string[]} requiredHeaders Required columns.
   * @return {Object} Normalized table.
   */
  getTable_(
    sheet,
    requiredHeaders
  ) {
    const headerInfo =
      this.findHeaderRow_(
        sheet,
        requiredHeaders
      );

    const headers =
      headerInfo.headers;

    const headerRow =
      headerInfo.row;

    const lastRow =
      sheet.getLastRow();

    const rows = [];

    if (lastRow > headerRow) {
      const values = sheet
        .getRange(
          headerRow + 1,
          1,
          lastRow - headerRow,
          headers.length
        )
        .getValues();

      values.forEach(
        (row, index) => {
          const isEmpty =
            row.every(value => {
              return (
                this.text_(value) === ''
              );
            });

          if (!isEmpty) {
            rows.push({
              rowNumber:
                headerRow +
                1 +
                index,

              row: row
            });
          }
        }
      );
    }

    return {
      headerRow: headerRow,
      headers: headers,
      rows: rows
    };
  },

  /**
   * Finds a row containing all required headers.
   *
   * @param {Object} sheet Google Sheet.
   * @param {string[]} requiredHeaders Required columns.
   * @return {Object} Header row information.
   */
  findHeaderRow_(
    sheet,
    requiredHeaders
  ) {
    const maxRows =
      Math.min(
        sheet.getLastRow(),
        20
      );

    const maxCols =
      sheet.getLastColumn();

    for (
      let rowNumber = 1;
      rowNumber <= maxRows;
      rowNumber++
    ) {
      const headers = sheet
        .getRange(
          rowNumber,
          1,
          1,
          maxCols
        )
        .getValues()[0]
        .map(value => {
          return this.text_(value);
        });

      const allFound =
        requiredHeaders.every(
          requiredHeader => {
            return (
              headers.indexOf(
                requiredHeader
              ) !== -1
            );
          }
        );

      if (allFound) {
        return {
          row: rowNumber,
          headers: headers
        };
      }
    }

    throw new Error(
      'Could not find header row in sheet: ' +
      sheet.getName()
    );
  },

  /**
   * Reads one value from a normalized row.
   *
   * @param {Array} row Row values.
   * @param {string[]} headers Header names.
   * @param {string} name Column name.
   * @return {*} Cell value.
   */
  getCell_(
    row,
    headers,
    name
  ) {
    const index =
      headers.indexOf(name);

    if (index < 0) {
      return '';
    }

    return row[index];
  },

  text_(value) {
    return String(
      value === null ||
      value === undefined
        ? ''
        : value
    ).trim();
  },

  number_(value) {
    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return value;
    }

    const normalized =
      this.text_(value);

    if (!normalized) {
      return 0;
    }

    const parsed = Number(
      normalized.replace(/,/g, '')
    );

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }
};

/**
 * Real dashboard refresh.
 *
 * Writes to DASHBOARD only.
 */
function refreshTradingOSDashboard() {
  return TOS_DASHBOARD_SERVICE
    .refreshDashboard();
}

/**
 * Backward-compatible test-style entry point.
 *
 * Writes to DASHBOARD.
 */
function testDashboardRefresh() {
  return refreshTradingOSDashboard();
}