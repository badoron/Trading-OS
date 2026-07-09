/**
 * Trading OS - Import Review Writer
 * Writes Strategy Candidates into IMPORT_REVIEW using upsert.
 */

const TOS_IMPORT_REVIEW_WRITER = {
  SHEET_NAME: 'IMPORT_REVIEW',

  writeDDCGroups(groups) {
    if (!groups || groups.length === 0) {
      Logger.log('No DDC groups to import.');
      return 0;
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(this.SHEET_NAME);
    if (!sheet) throw new Error('Missing sheet: ' + this.SHEET_NAME);

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const detectedGroupCol = headers.indexOf('DetectedGroupID') + 1;

    if (detectedGroupCol <= 0) {
      throw new Error('Missing column: DetectedGroupID');
    }

    const existingMap = this.buildExistingMap_(sheet, detectedGroupCol);

    let inserted = 0;
    let updated = 0;

    groups.forEach(group => {
      const row = this.buildRow_(headers, group);

      if (existingMap[group.groupId]) {
        sheet.getRange(existingMap[group.groupId], 1, 1, headers.length).setValues([row]);
        updated++;
      } else {
        sheet.getRange(sheet.getLastRow() + 1, 1, 1, headers.length).setValues([row]);
        inserted++;
      }
    });

    Logger.log('DDC Import Review upsert completed. Inserted=' + inserted + ', Updated=' + updated);

    return inserted + updated;
  },

  buildExistingMap_(sheet, detectedGroupCol) {
    const map = {};
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) return map;

    const values = sheet.getRange(2, detectedGroupCol, lastRow - 1, 1).getValues();

    values.forEach((row, index) => {
      const id = row[0];
      if (id) map[id] = index + 2;
    });

    return map;
  },

  buildRow_(headers, group) {
    const row = new Array(headers.length).fill('');

    const values = {
      ReviewID: group.groupId,
      SyncID: 'IBKR_OPEN_POSITIONS',
      DetectedGroupID: group.groupId,
      SourcePositionIDs: group.sourcePositionIds.join(','),
      Symbol: group.symbol,
      AssetClass: group.assetClass,
      StrategyGuess: 'DDC',
      LegCount: group.legCount,
      ExpirationSummary: group.expirationSummary,
      NetCreditDebit: group.netCostBasis,
      UnrealizedPnL: group.marketValue - group.netCostBasis,
      Confidence: 'HIGH',
      CurrentStatus: 'OPEN',
      RecommendedAction: 'REVIEW',
      RecommendationReason: 'Active DDC detected from IBKR open positions.',
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

function testImportReviewWriter() {
  const groups = TOS_OPEN_POSITION_GROUPER.detectActiveDdcFromCachedXml();
  return TOS_IMPORT_REVIEW_WRITER.writeDDCGroups(groups);
}