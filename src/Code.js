/**
 * Trading OS - Main.gs
 * Version: v3.0-core-001
 */

const TOS = {
  VERSION: 'v3.0-core-001',

  SHEETS: {
    HOME: 'HOME',
    DASHBOARD: 'DASHBOARD',
    ACTION_QUEUE: 'ACTION_QUEUE',
    SYNC_LOG: 'SYNC_LOG',
    QA_REPORT: 'QA_REPORT',
    QA_CHECKLIST: 'QA_CHECKLIST'
  },

  MENU: {
    NAME: 'Trading OS'
  }
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(TOS.MENU.NAME)
    .addItem('🌅 Morning Routine', 'tosMorningRoutine')
    .addSeparator()
    .addItem('➕ New Trade Wizard', 'tosNewTradeWizard')
    .addItem('🎯 Scan Opportunities', 'tosScanOpportunities')
    .addSeparator()
    .addItem('🧹 Health Check', 'tosHealthCheck')
    .addItem('🌙 End of Day', 'tosEndOfDay')
    .addToUi();

  tosLog_('SYSTEM', 'Menu loaded', 'SUCCESS');
}

function tosMorningRoutine() {
  tosRunSafe_('Morning Routine', function () {
    tosLog_('MORNING', 'Started', 'INFO');
    tosUpdateActionQueue_('Morning Routine', 'Completed');
    tosLog_('MORNING', 'Completed', 'SUCCESS');
    SpreadsheetApp.getUi().alert('Morning Routine completed.');
  });
}

function tosNewTradeWizard() {
  tosRunSafe_('New Trade Wizard', function () {
    tosLog_('NEW_TRADE', 'Wizard opened', 'INFO');
    SpreadsheetApp.getUi().alert(
      'New Trade Wizard is ready.\n\nNext version will connect this to IMPORT_REVIEW and MASTER_TRADES.'
    );
  });
}

function tosScanOpportunities() {
  tosRunSafe_('Scan Opportunities', function () {
    tosLog_('SCANNER', 'Scan started', 'INFO');
    tosUpdateActionQueue_('Scan Opportunities', 'Completed');
    tosLog_('SCANNER', 'Scan completed', 'SUCCESS');
    SpreadsheetApp.getUi().alert('Scan Opportunities completed.');
  });
}

function tosEndOfDay() {
  tosRunSafe_('End of Day', function () {
    tosLog_('EOD', 'Started', 'INFO');
    tosUpdateActionQueue_('End of Day', 'Completed');
    tosLog_('EOD', 'Completed', 'SUCCESS');
    SpreadsheetApp.getUi().alert('End of Day completed.');
  });
}

function tosHealthCheck() {
  tosRunSafe_('Health Check', function () {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requiredSheets = Object.values(TOS.SHEETS);
    const missing = requiredSheets.filter(name => !ss.getSheetByName(name));

    if (missing.length > 0) {
      tosLog_('QA', 'Missing sheets: ' + missing.join(', '), 'FAIL');
      SpreadsheetApp.getUi().alert('Health Check failed:\n\nMissing sheets:\n' + missing.join('\n'));
      return;
    }

    tosLog_('QA', 'Health Check passed', 'SUCCESS');
    SpreadsheetApp.getUi().alert('Health Check passed ✅');
  });
}

function tosRunSafe_(moduleName, callback) {
  try {
    callback();
  } catch (err) {
    tosLog_(moduleName, err.message, 'ERROR');
    SpreadsheetApp.getUi().alert(moduleName + ' failed:\n\n' + err.message);
  }
}

function tosLog_(module, message, status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TOS.SHEETS.SYNC_LOG);

  if (!sheet) {
    sheet = ss.insertSheet(TOS.SHEETS.SYNC_LOG);
    sheet.appendRow(['Timestamp', 'Module', 'Message', 'Status', 'Version']);
  }

  sheet.appendRow([
    new Date(),
    module,
    message,
    status,
    TOS.VERSION
  ]);
}

function tosUpdateActionQueue_(actionName, status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TOS.SHEETS.ACTION_QUEUE);

  if (!sheet) {
    tosLog_('ACTION_QUEUE', 'ACTION_QUEUE sheet missing', 'WARN');
    return;
  }

  sheet.appendRow([
    new Date(),
    actionName,
    status,
    TOS.VERSION
  ]);
}
