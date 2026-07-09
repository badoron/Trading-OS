/**
 * Trading OS - Trade Lifecycle Monitor
 * Detects imported trades that no longer exist in IBKR Open Positions.
 */

const TOS_TRADE_LIFECYCLE_MONITOR = {
  MASTER_TRADES: 'MASTER_TRADES',

  detectClosedTrades() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(this.MASTER_TRADES);
    if (!sheet) throw new Error('Missing sheet: ' + this.MASTER_TRADES);

    const table = this.getTable_(sheet, ['TradeID', 'WorkflowStatus', 'EntryDecisionID']);

    const activeGroups = TOS_OPEN_POSITION_GROUPER.detectActiveDdcFromCachedXml();
    const activeGroupIds = {};
    activeGroups.forEach(g => activeGroupIds[g.groupId] = true);

    let closed = 0;
    let stillOpen = 0;
    let skipped = 0;

    table.rows.forEach(item => {
      const rowNumber = item.rowNumber;
      const row = item.row;

      const tradeId = String(this.getCell_(row, table.headers, 'TradeID') || '').trim();
      const status = String(this.getCell_(row, table.headers, 'WorkflowStatus') || '').trim().toUpperCase();
      const groupId = String(this.getCell_(row, table.headers, 'EntryDecisionID') || '').trim();

      if (!tradeId || !groupId) {
        skipped++;
        return;
      }

      if (status !== 'OPEN') {
        skipped++;
        return;
      }

      if (activeGroupIds[groupId]) {
        stillOpen++;
        return;
      }

      this.setCell_(sheet, rowNumber, table.headers, 'WorkflowStatus', 'CLOSED_PENDING_EXIT_SYNC');
      this.setCell_(sheet, rowNumber, table.headers, 'ExitDate', new Date());
      this.setCell_(sheet, rowNumber, table.headers, 'ExitReason', 'Trade no longer found in IBKR Open Positions.');

      closed++;
    });

    Logger.log(
      'Closed trade detection completed. Closed=' +
      closed +
      ', StillOpen=' +
      stillOpen +
      ', Skipped=' +
      skipped
    );

    return { closed, stillOpen, skipped };
  },

  getTable_(sheet, requiredHeaders) {
    const headerInfo = this.findHeaderRow_(sheet, requiredHeaders);
    const headers = headerInfo.headers;
    const headerRow = headerInfo.row;
    const lastRow = sheet.getLastRow();

    const rows = [];

    if (lastRow > headerRow) {
      const values = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, headers.length).getValues();

      values.forEach((row, index) => {
        rows.push({
          rowNumber: headerRow + 1 + index,
          row
        });
      });
    }

    return { headerRow, headers, rows };
  },

  findHeaderRow_(sheet, requiredHeaders) {
    const maxRows = Math.min(sheet.getLastRow(), 20);
    const maxCols = sheet.getLastColumn();

    for (let r = 1; r <= maxRows; r++) {
      const headers = sheet.getRange(r, 1, 1, maxCols).getValues()[0].map(h => String(h).trim());
      const ok = requiredHeaders.every(h => headers.indexOf(h) !== -1);

      if (ok) return { row: r, headers };
    }

    throw new Error('Could not find header row in sheet: ' + sheet.getName());
  },

  getCell_(row, headers, name) {
    const index = headers.indexOf(name);
    if (index < 0) return '';
    return row[index];
  },

  setCell_(sheet, rowNumber, headers, name, value) {
    const index = headers.indexOf(name);
    if (index < 0) return;
    sheet.getRange(rowNumber, index + 1).setValue(value);
  }
};

function testClosedTradeDetection() {
  return TOS_TRADE_LIFECYCLE_MONITOR.detectClosedTrades();
}