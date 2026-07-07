/**
 * Trading OS - Import Decision Engine
 * Version: v3.0.0-core
 */

const TOS_IMPORT_DECISION = {
  ACTIONS: {
    IMPORT: 'IMPORT',
    IGNORE: 'IGNORE',
    RESIDUAL: 'RESIDUAL',
    ASK_LATER: 'ASK_LATER'
  },

  applyDecision(reviewId, action, reason) {
    if (!reviewId) throw new Error('Missing reviewId');
    if (!action) throw new Error('Missing action');

    const sheet = TOS_SHEETS_API.get(TOS_SHEETS.IMPORT_REVIEW);
    const data = sheet.getDataRange().getValues();
    const headers = data[3]; // row 4 headers
    const reviewIdCol = headers.indexOf('ReviewID');
    const decisionCol = headers.indexOf('Decision');
    const reasonCol = headers.indexOf('DecisionReason');
    const decidedAtCol = headers.indexOf('DecidedAt');

    if (reviewIdCol === -1) throw new Error('ReviewID column not found');
    if (decisionCol === -1) throw new Error('Decision column not found');

    const rowIndex = data.findIndex((row, index) => index > 3 && row[reviewIdCol] === reviewId);

    if (rowIndex === -1) {
      throw new Error(`ReviewID not found: ${reviewId}`);
    }

    sheet.getRange(rowIndex + 1, decisionCol + 1).setValue(action);

    if (reasonCol !== -1) {
      sheet.getRange(rowIndex + 1, reasonCol + 1).setValue(reason || '');
    }

    if (decidedAtCol !== -1) {
      sheet.getRange(rowIndex + 1, decidedAtCol + 1).setValue(new Date());
    }

    TOS_LOGGER.success('IMPORT_DECISION', `${reviewId} marked as ${action}`);
  }
};