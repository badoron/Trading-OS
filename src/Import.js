/**
 * Trading OS - Import Review Engine
 * Version: v3.0.0-core
 */

const TOS_IMPORT = {
  addMockDDC() {
    const sheet = TOS_SHEETS_API.get(TOS_SHEETS.IMPORT_REVIEW);

    const now = new Date();
    const importId = 'IMP-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss');

    sheet.appendRow([
      importId,
      now,
      'MOCK',
      'DDC',
      'DAL',
      'DETECTED',
      'REVIEW_REQUIRED',
      'OPEN',
      1,
      400,
      5,
      92,
      'WARNING',
      'Wing Width 5 exceeds preferred 4. Override allowed.',
      'PENDING',
      '',
      ''
    ]);

    TOS_LOGGER.success('IMPORT', `Mock DDC added to IMPORT_REVIEW: ${importId}`);
    SpreadsheetApp.getUi().alert('Mock DDC added to IMPORT_REVIEW ✅');
  }
};