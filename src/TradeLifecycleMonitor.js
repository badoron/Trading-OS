/**
 * Trading OS - Trade Lifecycle Monitor
 *
 * Updates imported trade lifecycle according to IBKR Open Positions.
 *
 * Lifecycle rules:
 * - All original legs are still open: OPEN
 * - At least one SHORT leg remains open after any leg disappears: PARTIAL_EXIT
 * - All SHORT legs are closed and LONG legs remain: COMPLETED_WITH_RESIDUAL
 * - No original legs remain open: CLOSED_PENDING_EXIT_SYNC
 *
 * DDC rule:
 * - A trade remains one trade until its final original leg closes.
 * - A finalized CLOSED trade must never be monitored or reopened again.
 *
 * ExitDate is not updated by this module.
 * The final exit timestamp is written later from IBKR closing executions.
 */

const TOS_TRADE_LIFECYCLE_MONITOR = {
  MASTER_TRADES: 'MASTER_TRADES',
  TRADE_LEGS: 'TRADE_LEGS',

  /**
   * Synchronizes MASTER_TRADES lifecycle from the current
   * IBKR Open Positions snapshot.
   *
   * @return {Object} Lifecycle synchronization summary.
   */
syncLifecycleFromOpenPositions() {
  const snapshot =
    TOS_BROKER_SNAPSHOT_SERVICE.load();

  return this.syncLifecycleFromSnapshot_(
    snapshot
  );
},

/**
 * Synchronizes MASTER_TRADES lifecycle using a supplied
 * normalized broker snapshot.
 *
 * This method does not load or parse IBKR XML.
 *
 * @param {Object} snapshot Normalized broker snapshot.
 * @return {Object} Lifecycle synchronization summary.
 */
syncLifecycleFromSnapshot_(snapshot) {
  if (!snapshot) {
    throw new Error(
      'Broker snapshot is required.'
    );
  }

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

const openPositions =
  snapshot.openPositions || [];

    const openConids =
      this.buildOpenConidMap_(
        openPositions
      );

    const masterTable =
      this.getTable_(
        masterSheet,
        [
          'TradeID',
          'WorkflowStatus'
        ]
      );

   const legsTable =
  this.getTable_(
    legsSheet,
    [
      'LegID',
      'TradeID',
      'Symbol',
      'BrokerContractID',
      'Expiration',
      'CallPut',
      'LongShort',
      'Quantity',
      'Strike',
      'EntryPrice',
      'MarketValue',
      'UnrealizedPnL'
    ]
  );

    const legsByTradeId =
      this.groupLegsByTradeId_(
        legsTable
      );

    const result = {
      open: 0,
      partialExit: 0,
      completedWithResidual: 0,
      closedPendingExitSync: 0,
      ignoredClosed: 0,
      skipped: 0
    };

    masterTable.rows.forEach(item => {
      const tradeId = this.text_(
        this.getCell_(
          item.row,
          masterTable.headers,
          'TradeID'
        )
      );

      const currentStatus =
        this.text_(
          this.getCell_(
            item.row,
            masterTable.headers,
            'WorkflowStatus'
          )
        ).toUpperCase();

      if (!tradeId) {
        result.skipped++;
        return;
      }

      /*
       * A finalized CLOSED trade is immutable from the lifecycle
       * monitor's point of view.
       *
       * Without this guard, a later pipeline run would see zero
       * open positions for the already-closed trade and incorrectly
       * return it to CLOSED_PENDING_EXIT_SYNC.
       */
      if (
        !this.shouldMonitorTrade_(
          currentStatus
        )
      ) {
        result.ignoredClosed++;

        Logger.log(
          'Ignored finalized trade=' +
          tradeId +
          ' | Status=' +
          currentStatus
        );

        return;
      }

      const tradeLegs =
        legsByTradeId[tradeId] || [];

      if (tradeLegs.length === 0) {
        result.skipped++;

        Logger.log(
          'Skipped trade without legs: ' +
          tradeId
        );

        return;
      }

      const lifecycle =
        this.evaluateLifecycle_(
          tradeLegs,
          openConids
        );

      this.applyLifecycle_(
        masterSheet,
        item.rowNumber,
        masterTable.headers,
        lifecycle
      );
if (
  lifecycle.status ===
    'COMPLETED_WITH_RESIDUAL' &&
  lifecycle.residualLegs.length > 0
) {
  const residualSaveResult =
    TOS_RESIDUAL_POSITION_MANAGER
      .saveResidualLegs_(
        tradeId,
        lifecycle.residualLegs,
        new Date().toISOString()
      );

  Logger.log(
    'Residual positions saved.' +
    ' Trade=' +
    tradeId +
    ' | Received=' +
    residualSaveResult.received +
    ' | Inserted=' +
    residualSaveResult.inserted +
    ' | Skipped=' +
    residualSaveResult.skipped
  );
}
      if (
        lifecycle.status === 'OPEN'
      ) {
        result.open++;
      } else if (
        lifecycle.status ===
        'PARTIAL_EXIT'
      ) {
        result.partialExit++;
      } else if (
        lifecycle.status ===
        'COMPLETED_WITH_RESIDUAL'
      ) {
        result.completedWithResidual++;
      } else if (
        lifecycle.status ===
        'CLOSED_PENDING_EXIT_SYNC'
      ) {
        result.closedPendingExitSync++;
      }

      Logger.log(
        'Trade=' +
        tradeId +
        ' | TotalLegs=' +
        lifecycle.totalLegs +
        ' | OpenLegs=' +
        lifecycle.openLegs +
        ' | ClosedLegs=' +
        lifecycle.closedLegs +
        ' | OpenShorts=' +
        lifecycle.openShorts +
        ' | OpenLongs=' +
        lifecycle.openLongs +
        ' | Status=' +
        lifecycle.status
      );
    });

    Logger.log(
      'Lifecycle sync completed.' +
      ' Open=' +
      result.open +
      ', PartialExit=' +
      result.partialExit +
      ', CompletedWithResidual=' +
      result.completedWithResidual +
      ', ClosedPendingExitSync=' +
      result.closedPendingExitSync +
      ', IgnoredClosed=' +
      result.ignoredClosed +
      ', Skipped=' +
      result.skipped
    );

    return result;
  },

  /**
   * Determines whether a trade may be processed by the lifecycle monitor.
   *
   * A finalized CLOSED trade must never be processed again.
   * Other statuses remain eligible, including blank legacy values.
   *
   * @param {*} workflowStatus Current workflow status.
   * @return {boolean} Whether the trade should be monitored.
   */
  shouldMonitorTrade_(workflowStatus) {
    return (
      this.text_(
        workflowStatus
      ).toUpperCase() !== 'CLOSED'
    );
  },

  /**
   * Calculates the lifecycle state of one trade.
   *
   * @param {Object[]} tradeLegs Original trade legs.
   * @param {Object} openConids Map of currently open IBKR conids.
   * @return {Object} Lifecycle calculation.
   */
  evaluateLifecycle_(
    tradeLegs,
    openConids
  ) {
    const safeTradeLegs = tradeLegs || [];
    const classification =
      TOS_RESIDUAL_POSITION_CLASSIFIER.fromOpenPositionSnapshot_(
        safeTradeLegs,
        openConids || {}
      );

    let status = 'OPEN';
    let exitReason = '';
    const setExitDate = false;

    if (classification.openLegs === classification.totalLegs) {
      status = 'OPEN';
    } else if (classification.openShorts > 0) {
      status = 'PARTIAL_EXIT';
      exitReason =
        classification.closedLegs + ' of ' + classification.totalLegs +
        ' legs are no longer open. At least one SHORT leg remains open.';
    } else if (classification.hasResidual) {
      status = 'COMPLETED_WITH_RESIDUAL';
      exitReason =
        'All original SHORT legs are closed. ' +
        classification.openLongs + ' LONG residual leg(s) remain open.';
    } else if (classification.openLegs === 0) {
      status = 'CLOSED_PENDING_EXIT_SYNC';
      exitReason =
        'All original trade legs are absent from IBKR Open Positions. ' +
        'Exit synchronization is required.';
    } else {
      status = 'PARTIAL_EXIT';
      exitReason =
        'Lifecycle cannot be completed because one or more open legs have ' +
        'an unknown LongShort value.';
    }

    return {
      status: status,
      exitReason: exitReason,
      setExitDate: setExitDate,
      totalLegs: classification.totalLegs,
      openLegs: classification.openLegs,
      closedLegs: classification.closedLegs,
      openShorts: classification.openShorts,
      openLongs: classification.openLongs,
      strategyComplete: classification.strategyComplete,
      hasResidual: classification.hasResidual,
      residualLegs: classification.residualLegs
    };
  },

  /**
   * Applies the calculated lifecycle to MASTER_TRADES.
   *
   * ExitDate is intentionally untouched.
   *
   * @param {Object} sheet MASTER_TRADES sheet.
   * @param {number} rowNumber Target row.
   * @param {string[]} headers Sheet headers.
   * @param {Object} lifecycle Lifecycle calculation.
   */
  applyLifecycle_(
    sheet,
    rowNumber,
    headers,
    lifecycle
  ) {
    this.setCell_(
      sheet,
      rowNumber,
      headers,
      'WorkflowStatus',
      lifecycle.status
    );

    this.setCell_(
      sheet,
      rowNumber,
      headers,
      'ExitReason',
      lifecycle.exitReason
    );
  },

  /**
   * Builds a lookup map of current IBKR Open Position conids.
   *
   * @param {Object[]} positions Parsed IBKR Open Positions.
   * @return {Object} conid => true map.
   */
  buildOpenConidMap_(positions) {
    const map = {};

    (positions || []).forEach(
      position => {
        const conid =
          this.text_(
            position &&
            position.conid
          );

        if (conid) {
          map[conid] = true;
        }
      }
    );

    return map;
  },

  /**
   * Groups TRADE_LEGS records by TradeID.
   *
   * @param {Object} table Normalized table data.
   * @return {Object} Legs grouped by TradeID.
   */
  groupLegsByTradeId_(table) {
    const map = {};

    table.rows.forEach(item => {
      const tradeId =
        this.text_(
          this.getCell_(
            item.row,
            table.headers,
            'TradeID'
          )
        );

     if (!tradeId) {
  return;
}

if (!map[tradeId]) {
  map[tradeId] = [];
}

map[tradeId].push({
  rowNumber:
    item.rowNumber,

  legId:
    this.getCell_(
      item.row,
      table.headers,
      'LegID'
    ),

  symbol:
    this.getCell_(
      item.row,
      table.headers,
      'Symbol'
    ),

  optionType:
    this.getCell_(
      item.row,
      table.headers,
      'CallPut'
    ),

  strike:
    this.getCell_(
      item.row,
      table.headers,
      'Strike'
    ),

  expiration:
    this.getCell_(
      item.row,
      table.headers,
      'Expiration'
    ),

  quantity:
    this.getCell_(
      item.row,
      table.headers,
      'Quantity'
    ),

  costBasis:
    this.getCell_(
      item.row,
      table.headers,
      'EntryPrice'
    ),

  marketValue:
    this.getCell_(
      item.row,
      table.headers,
      'MarketValue'
    ),

  unrealizedPnL:
    this.getCell_(
      item.row,
      table.headers,
      'UnrealizedPnL'
    ),

  brokerContractId:
    this.getCell_(
      item.row,
      table.headers,
      'BrokerContractID'
    ),

  longShort:
    this.getCell_(
      item.row,
      table.headers,
      'LongShort'
    )
});
    });

    return map;
  },

  /**
   * Reads a sheet table using a dynamically detected header row.
   *
   * @param {Object} sheet Google Sheet.
   * @param {string[]} requiredHeaders Required column names.
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
   * @param {string[]} requiredHeaders Required column names.
   * @return {Object} Header row and values.
   */
  findHeaderRow_(
    sheet,
    requiredHeaders
  ) {
    const lastRow =
      sheet.getLastRow();

    const maxRows =
      Math.min(
        lastRow,
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
          return this.text_(
            value
          );
        });

      const allFound =
        requiredHeaders.every(
          header => {
            return (
              headers.indexOf(
                header
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
   * Reads a value from a normalized row.
   *
   * @param {Array} row Row values.
   * @param {string[]} headers Header names.
   * @param {string} name Requested column.
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

  /**
   * Writes a value only when the column exists.
   *
   * @param {Object} sheet Google Sheet.
   * @param {number} rowNumber Target row.
   * @param {string[]} headers Header names.
   * @param {string} name Requested column.
   * @param {*} value Value to write.
   */
  setCell_(
    sheet,
    rowNumber,
    headers,
    name,
    value
  ) {
    const index =
      headers.indexOf(name);

    if (index < 0) {
      return;
    }

    sheet
      .getRange(
        rowNumber,
        index + 1
      )
      .setValue(value);
  },

  /**
   * Converts values to trimmed strings.
   *
   * @param {*} value Any value.
   * @return {string} Normalized string.
   */
  text_(value) {
    return String(
      value === null ||
      value === undefined
        ? ''
        : value
    ).trim();
  }
};

/**
 * Real lifecycle integration execution.
 *
 * Performs writes to MASTER_TRADES.
 */
function testTradeLifecycleMonitor() {
  return TOS_TRADE_LIFECYCLE_MONITOR
    .syncLifecycleFromOpenPositions();
}

/**
 * Backward compatibility with the previous function name.
 *
 * Performs writes to MASTER_TRADES.
 */
function testClosedTradeDetection() {
  return TOS_TRADE_LIFECYCLE_MONITOR
    .syncLifecycleFromOpenPositions();
}