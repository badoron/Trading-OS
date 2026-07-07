/**
 * Trading OS - Sheets Access Layer
 * Version: v3.0.0-core
 */

const TOS_SHEETS_API = {
  get(name) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(name);

    if (!sheet) {
      throw new Error(`Required sheet not found: ${name}`);
    }

    return sheet;
  },

  exists(name) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    return !!ss.getSheetByName(name);
  },

  getRequiredSheetsStatus() {
    return Object.values(TOS_SHEETS).map(name => ({
      name,
      exists: this.exists(name)
    }));
  }
};