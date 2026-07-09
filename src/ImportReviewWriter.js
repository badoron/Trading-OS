/**
 * Trading OS - Import Review Writer
 * Writes Strategy Candidates into IMPORT_REVIEW
 */

const TOS_IMPORT_REVIEW_WRITER = {

  SHEET_NAME: 'IMPORT_REVIEW',

  writeDDCGroups(groups) {

    if (!groups || groups.length === 0) {
      Logger.log('No DDC groups to import.');
      return;
    }

    const sheet =
      SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName(this.SHEET_NAME);

    const headers =
      sheet
        .getRange(1,1,1,sheet.getLastColumn())
        .getValues()[0];

    const rows = groups.map(g => this.buildRow_(headers,g));

    sheet
      .getRange(
        sheet.getLastRow()+1,
        1,
        rows.length,
        headers.length
      )
      .setValues(rows);

    Logger.log('Inserted ' + rows.length + ' DDC strategies.');
  },

  buildRow_(headers,g){

    const row = new Array(headers.length).fill('');

    const values = {

      ReviewID:
        Utilities.getUuid(),

      SyncID:
        g.groupId,

      DetectedGroupID:
        g.groupId,

      SourcePositionIDs:
        g.sourcePositionIds.join(','),

      Symbol:
        g.symbol,

      AssetClass:
        g.assetClass,

      StrategyGuess:
        'DDC',

      LegCount:
        g.legCount,

      ExpirationSummary:
        g.expirationSummary,

      NetCreditDebit:
        g.netCostBasis,

      CurrentStatus:
        'OPEN',

      RecommendedAction:
        'REVIEW',

      Priority:
        'NORMAL',

      ReviewStatus:
        'PENDING'
    };

    headers.forEach((h,i)=>{

      if(values.hasOwnProperty(h))
        row[i]=values[h];

    });

    return row;
  }

};

function testImportReviewWriter(){

  const groups =
    TOS_OPEN_POSITION_GROUPER
      .detectActiveDdcFromCachedXml();

  TOS_IMPORT_REVIEW_WRITER
    .writeDDCGroups(groups);

}