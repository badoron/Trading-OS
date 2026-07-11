/**
 * Trading OS - Trade Lifecycle Monitor
 *
 * Updates imported trade lifecycle according to IBKR Open Positions.
 *
 * Generic lifecycle rules:
 * - All original legs are still open: OPEN
 * - At least one leg disappeared, but at least one leg remains: PARTIAL_EXIT
 * - No legs remain open: CLOSED_PENDING_EXIT_SYNC
 *
 * A trade is never considered fully closed while any original leg
 * is still present in IBKR Open Positions.
 */

const TOS_TRADE_LIFECYCLE_MONITOR = {
  MASTER_TRADES: 'MASTER_TRADES',
  TRADE_LEGS: 'TRADE_LEGS',

  syncLifecycleFromOpenPositions() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const masterSheet = ss.getSheetByName(this.MASTER_TRADES);
    const legsSheet = ss.getSheetByName(this.TRADE_LEGS);

    if (!masterSheet) {
      throw new Error('Missing sheet: ' + this.MASTER_TRADES);
    }

    if (!legsSheet) {
      throw new Error('Missing sheet: ' + this.TRADE_LEGS);
    }

    const xml = TOS_IBKR_FLEX.getLastXml();

    if (!xml) {
      throw new Error(
        'No cached IBKR XML found. Run testIBKRFlexConnection successfully first.'
      );
    }

    const parsed = TOS_IBKR_FLEX_PARSER.parse(xml);
    const openPositions = parsed.openPositions || [];
    const openConids = this.buildOpenConidMap_(openPositions);

    const masterTable = this.getTable_(
      masterSheet,
      ['TradeID', 'WorkflowStatus']
    );

    const legsTable = this.getTable_(
      legsSheet,
      ['TradeID', 'BrokerContractID', 'LongShort']
    );

    const legsByTradeId = this.groupLegsByTradeId_(legsTable);

    const result = {
      open: 0,
      partialExit: 0,
      closedPendingExitSync: 0,
      skipped: 0
    };

    masterTable.rows.forEach(item => {
      const tradeId = this.text_(
        this.getCell_(item.row, masterTable.headers, 'TradeID')
      );

      if (!tradeId) {
        result.skipped++;
        return;
      }

      const tradeLegs = legsByTradeId[tradeId] || [];

      if (tradeLegs.length === 0) {
        result.skipped++;
        Logger.log('Skipped trade without legs: ' + tradeId);
        return;
      }

      const lifecycle = this.evaluateLifecycle_(
        tradeLegs,
        openConids
      );

      this.applyLifecycle_(
        masterSheet,
        item.rowNumber,
        masterTable.headers,
        lifecycle
      );

      if (lifecycle.status === 'OPEN') {
        result.open++;
      } else if (lifecycle.status === 'PARTIAL_EXIT') {
        result.partialExit++;
      } else if (
        lifecycle.status === 'CLOSED_PENDING_EXIT_SYNC'
      ) {
        result.closedPendingExitSync++;
      }

      Logger.log(
        'Trade=' + tradeId +
        ' | TotalLegs=' + lifecycle.totalLegs +
        ' | OpenLegs=' + lifecycle.openLegs +
        ' | ClosedLegs=' + lifecycle.closedLegs +
        ' | OpenShorts=' + lifecycle.openShorts +
        ' | OpenLongs=' + lifecycle.openLongs +
        ' | Status=' + lifecycle.status
      );
    });

    Logger.log(
      'Lifecycle sync completed.' +
      ' Open=' + result.open +
      ', PartialExit=' + result.partialExit +
      ', ClosedPendingExitSync=' +
      result.closedPendingExitSync +
      ', Skipped=' + result.skipped
    );

    return result;
  },

  evaluateLifecycle_(tradeLegs, openConids) {
    const totalLegs = tradeLegs.length;

    const openLegs = tradeLegs.filter(leg => {
      return (
        openConids[this.text_(leg.brokerContractId)] === true
      );
    });

    const openShorts = openLegs.filter(leg => {
      return (
        this.text_(leg.longShort).toUpperCase() === 'SHORT'
      );
    });

    const openLongs = openLegs.filter(leg => {
      return (
        this.text_(leg.longShort).toUpperCase() === 'LONG'
      );
    });

    const closedLegs = totalLegs - openLegs.length;

    let status;
    let exitReason = '';
    let setExitDate = false;

    if (openLegs.length === totalLegs) {
      status = 'OPEN';
    } else if (openLegs.length > 0) {
      status = 'PARTIAL_EXIT';
      exitReason =
        closedLegs +
        ' of ' +
        totalLegs +
        ' legs are no longer open. Remaining legs are still monitored.';
    } else {
      status = 'CLOSED_PENDING_EXIT_SYNC';
      exitReason =
        'All original trade legs are absent from IBKR Open Positions. Exit synchronization is required.';
      setExitDate = true;
    }

    return {
      status: status,
      exitReason: exitReason,
      setExitDate: setExitDate,
      totalLegs: totalLegs,
      openLegs: openLegs.length,
      closedLegs: closedLegs,
      openShorts: openShorts.length,
      openLongs: openLongs.length
    };
  },

  applyLifecycle_(sheet, rowNumber, headers, lifecycle) {
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

    if (lifecycle.status === 'CLOSED_PENDING_EXIT_SYNC') {
      const existingExitDate = this.getSheetCell_(
        sheet,
        rowNumber,
        headers,
        'ExitDate'
      );

      if (!existingExitDate) {
        this.setCell_(
          sheet,
          rowNumber,
          headers,
          'ExitDate',
          new Date()
        );
      }
    } else {
      this.setCell_(
        sheet,
        rowNumber,
        headers,
        'ExitDate',
        ''
      );
    }
  },

  buildOpenConidMap_(positions) {
    const map = {};

    positions.forEach(position => {
      const conid = this.text_(position.conid);

      if (conid) {
        map[conid] = true;
      }
    });

    return map;
  },

  groupLegsByTradeId_(table) {
    const map = {};

    table.rows.forEach(item => {
      const tradeId = this.text_(
        this.getCell_(item.row, table.headers, 'TradeID')
      );

      if (!tradeId) {
        return;
      }

      if (!map[tradeId]) {
        map[tradeId] = [];
      }

      map[tradeId].push({
        rowNumber: item.rowNumber,

        brokerContractId: this.getCell_(
          item.row,
          table.headers,
          'BrokerContractID'
        ),

        longShort: this.getCell_(
          item.row,
          table.headers,
          'LongShort'
        )
      });
    });

    return map;
  },

  getTable_(sheet, requiredHeaders) {
    const headerInfo = this.findHeaderRow_(
      sheet,
      requiredHeaders
    );

    const headers = headerInfo.headers;
    const headerRow = headerInfo.row;
    const lastRow = sheet.getLastRow();
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

      values.forEach((row, index) => {
        const isEmpty = row.every(value => {
          return this.text_(value) === '';
        });

        if (!isEmpty) {
          rows.push({
            rowNumber: headerRow + 1 + index,
            row: row
          });
        }
      });
    }

    return {
      headerRow: headerRow,
      headers: headers,
      rows: rows
    };
  },

  findHeaderRow_(sheet, requiredHeaders) {
    const maxRows = Math.min(sheet.getLastRow(), 20);
    const maxCols = sheet.getLastColumn();

    for (
      let rowNumber = 1;
      rowNumber <= maxRows;
      rowNumber++
    ) {
      const headers = sheet
        .getRange(rowNumber, 1, 1, maxCols)
        .getValues()[0]
        .map(value => this.text_(value));

      const allFound = requiredHeaders.every(header => {
        return headers.indexOf(header) !== -1;
      });

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

  getCell_(row, headers, name) {
    const index = headers.indexOf(name);

    if (index < 0) {
      return '';
    }

    return row[index];
  },

  getSheetCell_(sheet, rowNumber, headers, name) {
    const index = headers.indexOf(name);

    if (index < 0) {
      return '';
    }

    return sheet
      .getRange(rowNumber, index + 1)
      .getValue();
  },

  setCell_(sheet, rowNumber, headers, name, value) {
    const index = headers.indexOf(name);

    if (index < 0) {
      return;
    }

    sheet
      .getRange(rowNumber, index + 1)
      .setValue(value);
  },

  text_(value) {
    return String(
      value === null || value === undefined ? '' : value
    ).trim();
  }
};

function testTradeLifecycleMonitor() {
  return TOS_TRADE_LIFECYCLE_MONITOR
    .syncLifecycleFromOpenPositions();
}

/**
 * Backward compatibility with the previous function name.
 */
function testClosedTradeDetection() {
  return TOS_TRADE_LIFECYCLE_MONITOR
    .syncLifecycleFromOpenPositions();
}