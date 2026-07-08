/**
 * Trading OS - IBKR Import Review Writer
 */

const TOS_IBKR_IMPORT_REVIEW_WRITER = {
  SHEET_NAME: 'IMPORT_REVIEW',

  writeFromCachedXml() {
    const xml = TOS_IBKR_FLEX.getLastXml();

    if (!xml) {
      throw new Error('No cached IBKR XML found.');
    }

    const parsed = TOS_IBKR_FLEX_PARSER.parse(xml);
    const trades = parsed.trades || [];

    if (trades.length === 0) {
      Logger.log('No IBKR trades found.');
      return 0;
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(this.SHEET_NAME);

    if (!sheet) {
      throw new Error('Missing sheet: ' + this.SHEET_NAME);
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rows = trades.map(trade => this.buildRow_(headers, trade));

    sheet
      .getRange(sheet.getLastRow() + 1, 1, rows.length, headers.length)
      .setValues(rows);

    Logger.log('Inserted IBKR trades into IMPORT_REVIEW: ' + rows.length);

    return rows.length;
  },

  buildRow_(headers, trade) {
    const row = new Array(headers.length).fill('');
    const now = new Date();
    const reviewId = 'IBKR-REV-' + (trade.tradeID || trade.transactionID || new Date().getTime());

    const values = {
      ReviewID: reviewId,
      SyncID: 'IBKR-' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss'),
      DetectedGroupID: trade.tradeID || '',
      SourcePositionIDs: trade.transactionID || '',
      Symbol: trade.underlyingSymbol || trade.symbol || '',
      AssetClass: trade.assetCategory || '',
      StrategyGuess: 'Manual Review',
      LegCount: 1,
      ExpirationSummary: trade.expiry || '',
      NetCreditDebit: trade.tradePrice || '',
      CurrentStatus: 'NEW',
      RecommendedAction: 'REVIEW',
      Priority: 'NORMAL',
      ReviewStatus: 'PENDING'
    };

    headers.forEach((header, index) => {
      if (Object.prototype.hasOwnProperty.call(values, header)) {
        row[index] = values[header];
      }
    });

    return row;
  }
};

function testWriteIBKRTradesToImportReview() {
  return TOS_IBKR_IMPORT_REVIEW_WRITER.writeFromCachedXml();
}