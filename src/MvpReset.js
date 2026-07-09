/**
 * Trading OS - MVP Reset
 * Clears data rows only. Keeps headers and formatting.
 */

function resetMvpData() {
  const sheets = [
    'IMPORT_REVIEW',
    'MASTER_TRADES',
    'TRADE_LEGS'
  ];

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  sheets.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error('Missing sheet: ' + sheetName);

    const headerRow = findHeaderRowForReset_(sheet);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow > headerRow) {
      sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastCol).clearContent();
    }

    Logger.log('Reset sheet: ' + sheetName + ' from row ' + (headerRow + 1));
  });

  Logger.log('MVP reset completed.');
}

function findHeaderRowForReset_(sheet) {
  const maxRows = Math.min(sheet.getLastRow(), 20);
  const maxCols = sheet.getLastColumn();

  for (let r = 1; r <= maxRows; r++) {
    const values = sheet.getRange(r, 1, 1, maxCols).getValues()[0]
      .map(v => String(v).trim());

    if (
      values.indexOf('ReviewID') !== -1 ||
      values.indexOf('TradeID') !== -1 ||
      values.indexOf('LegID') !== -1
    ) {
      return r;
    }
  }

  throw new Error('Header row not found in sheet: ' + sheet.getName());
}