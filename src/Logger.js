/**
 * Trading OS - Logger
 * Version: v3.0.0-core
 */

const TOS_LOGGER = {
  log(moduleName, message, status) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(TOS_SHEETS.SYNC_LOG);

    if (!sheet) {
      sheet = ss.insertSheet(TOS_SHEETS.SYNC_LOG);
      sheet.appendRow(['Timestamp', 'Module', 'Message', 'Status', 'Version']);
    }

    sheet.appendRow([
      new Date(),
      moduleName || 'SYSTEM',
      message || '',
      status || TOS_LOG_STATUS.INFO,
      TOS_VERSION
    ]);
  },

  info(moduleName, message) {
    this.log(moduleName, message, TOS_LOG_STATUS.INFO);
  },

  success(moduleName, message) {
    this.log(moduleName, message, TOS_LOG_STATUS.SUCCESS);
  },

  warn(moduleName, message) {
    this.log(moduleName, message, TOS_LOG_STATUS.WARN);
  },

  error(moduleName, message) {
    this.log(moduleName, message, TOS_LOG_STATUS.ERROR);
  }
};