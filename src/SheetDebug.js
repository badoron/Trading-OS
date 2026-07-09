function debugCoreImportHeaders() {
  ['MASTER_TRADES', 'TRADE_LEGS'].forEach(sheetName => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      Logger.log('Missing sheet: ' + sheetName);
      return;
    }

    Logger.log('====================');
    Logger.log(sheetName);
    Logger.log('====================');

    const maxRows = Math.min(sheet.getLastRow(), 20);
    const maxCols = sheet.getLastColumn();

    for (let r = 1; r <= maxRows; r++) {
      const values = sheet.getRange(r, 1, 1, maxCols).getValues()[0];
      const nonEmpty = values.filter(v => String(v).trim() !== '');

      if (nonEmpty.length >= 3) {
        Logger.log('Row ' + r + ': ' + values.join(' | '));
      }
    }
  });
}