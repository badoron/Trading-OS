/**
 * Trading OS - Trade Monitor
 * Updates existing TRADE_LEGS from IBKR Open Positions.
 */

const TOS_TRADE_MONITOR = {
  TRADE_LEGS: 'TRADE_LEGS',

  updateOpenLegsFromIBKR() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(this.TRADE_LEGS);
    if (!sheet) throw new Error('Missing sheet: ' + this.TRADE_LEGS);

    const table = this.getTable_(sheet, ['LegID', 'BrokerContractID']);

    const xml = TOS_IBKR_FLEX.getLastXml();
    if (!xml) throw new Error('No cached IBKR XML found.');

    const parsed = TOS_IBKR_FLEX_PARSER.parse(xml);
    const positions = parsed.openPositions || [];

    const posByConid = {};
    positions.forEach(p => {
      if (p.conid) posByConid[String(p.conid)] = p;
    });

    let updated = 0;
    let missing = 0;

    table.rows.forEach(item => {
      const rowNumber = item.rowNumber;
      const row = item.row;
      const conid = String(this.getCell_(row, table.headers, 'BrokerContractID') || '').trim();

      if (!conid) return;

      const p = posByConid[conid];

      if (!p) {
        missing++;
        return;
      }

      this.setCell_(sheet, rowNumber, table.headers, 'CurrentPrice', p.markPrice || '');
      this.setCell_(sheet, rowNumber, table.headers, 'MarketValue', p.positionValue || '');
      this.setCell_(sheet, rowNumber, table.headers, 'UnrealizedPnL', p.fifoPnlUnrealized || '');
      this.setCell_(sheet, rowNumber, table.headers, 'CurrentIV', '');
      this.setCell_(sheet, rowNumber, table.headers, 'Source', 'IBKR_OPEN_POSITION');

      updated++;
    });

    Logger.log('Trade monitor update completed. Updated=' + updated + ', MissingOpenPositions=' + missing);

    return { updated, missing };
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

function testTradeMonitor() {
  return TOS_TRADE_MONITOR.updateOpenLegsFromIBKR();
}