/**
 * Trading OS - Logger
 * Version: v3.0.0-core
 */

const TOS_LOGGER = {
  log(moduleName, message, status) {
    const sheet = TOS_SHEETS_API.get(TOS_SHEETS.SYNC_LOG);

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