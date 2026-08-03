/**
 * Trading OS - non-destructive release preflight.
 * Validates runtime dependencies, required configuration and core sheets.
 */

const TOS_RELEASE_PREFLIGHT = {
  REQUIRED_FUNCTIONS: [
    'runTradingOSApplication',
    'runDdcPipeline',
    'runTradingOSStabilizationMigration',
    'testFullTradingOSRegression'
  ],

  REQUIRED_SHEETS: [
    TOS_SHEETS.MASTER_TRADES,
    TOS_SHEETS.TRADE_LEGS,
    TOS_SHEETS.IMPORT_REVIEW,
    TOS_SHEETS.DASHBOARD,
    TOS_SHEETS.HOME
  ],

  evaluate(input) {
    const checks = [];
    const source = input || {};

    checks.push(this.check_(
      'version',
      /^v3\.1\.0-rc\.\d+$/.test(String(source.version || '')),
      'Expected a v3.1.0 release-candidate version.'
    ));

    (source.functions || []).forEach(item => {
      checks.push(this.check_(
        'function:' + item.name,
        item.available === true,
        'Required function is unavailable: ' + item.name
      ));
    });

    (source.config || []).forEach(item => {
      checks.push(this.check_(
        'config:' + item.key,
        item.present === true,
        'Required Script Property is missing: ' + item.key
      ));
    });

    (source.sheets || []).forEach(item => {
      checks.push(this.check_(
        'sheet:' + item.name,
        item.exists === true,
        'Required sheet is missing: ' + item.name
      ));
    });

    const failed = checks.filter(check => !check.ok);

    return {
      ok: failed.length === 0,
      version: source.version || '',
      checks: checks,
      failures: failed.map(check => check.message)
    };
  },

  check_(name, ok, message) {
    return {
      name: name,
      ok: ok === true,
      message: ok === true ? 'OK' : message
    };
  }
};

function runTradingOSReleasePreflight() {
  const globalObject = typeof globalThis !== 'undefined' ? globalThis : this;
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const input = {
    version: TOS_VERSION,
    functions: TOS_RELEASE_PREFLIGHT.REQUIRED_FUNCTIONS.map(name => ({
      name: name,
      available: typeof globalObject[name] === 'function'
    })),
    config: Object.keys(TOS_CONFIG.KEYS).map(keyName => {
      const key = TOS_CONFIG.KEYS[keyName];
      return {
        key: key,
        present: !!TOS_CONFIG.get(key)
      };
    }),
    sheets: TOS_RELEASE_PREFLIGHT.REQUIRED_SHEETS.map(name => ({
      name: name,
      exists: !!spreadsheet.getSheetByName(name)
    }))
  };

  const report = TOS_RELEASE_PREFLIGHT.evaluate(input);

  report.checks.forEach(check => {
    Logger.log(
      (check.ok ? 'PASS' : 'FAIL') +
      ' | ' + check.name +
      ' | ' + check.message
    );
  });

  if (!report.ok) {
    const error = new Error(
      '[' + TOS_ERROR_CODE.PREFLIGHT_FAILED + '] ' +
      report.failures.join(' | ')
    );
    error.code = TOS_ERROR_CODE.PREFLIGHT_FAILED;
    throw error;
  }

  Logger.log('Release preflight passed for ' + TOS_VERSION + '.');
  return report;
}
