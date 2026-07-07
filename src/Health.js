/**
 * Trading OS - Health Framework
 * Version: v3.0.0-core
 */

const TOS_HEALTH = {
  run() {
    const results = [];

    results.push(this.checkRequiredSheets_());
    results.push(this.checkLogger_());
    results.push(this.checkVersion_());

    const flat = results.flat();
    const errors = flat.filter(r => r.status === 'ERROR');
    const warnings = flat.filter(r => r.status === 'WARN');

    flat.forEach(r => {
      TOS_LOGGER.log('HEALTH', `${r.name}: ${r.message}`, r.status);
    });

    const message =
      `Trading OS Health Check\n\n` +
      `Checks: ${flat.length}\n` +
      `Errors: ${errors.length}\n` +
      `Warnings: ${warnings.length}\n\n` +
      (errors.length === 0 ? '✅ PASS' : '❌ FAIL');

    SpreadsheetApp.getUi().alert(message);

    return {
      checks: flat.length,
      errors: errors.length,
      warnings: warnings.length,
      passed: errors.length === 0
    };
  },

  checkRequiredSheets_() {
    return TOS_SHEETS_API.getRequiredSheetsStatus().map(item => ({
      name: `Sheet ${item.name}`,
      status: item.exists ? 'SUCCESS' : 'ERROR',
      message: item.exists ? 'Exists' : 'Missing'
    }));
  },

  checkLogger_() {
    try {
      TOS_LOGGER.info('HEALTH', 'Logger test');
      return [{
        name: 'Logger',
        status: 'SUCCESS',
        message: 'Logger is working'
      }];
    } catch (err) {
      return [{
        name: 'Logger',
        status: 'ERROR',
        message: err.message
      }];
    }
  },

  checkVersion_() {
    return [{
      name: 'Script Version',
      status: TOS_VERSION ? 'SUCCESS' : 'ERROR',
      message: TOS_VERSION || 'Missing version'
    }];
  }
};