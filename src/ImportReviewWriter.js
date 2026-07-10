/**
 * Trading OS - Import Review Writer
 * Writes Strategy Candidates into IMPORT_REVIEW using safe upsert.
 * Preserves manual workflow fields on updates.
 */

const TOS_IMPORT_REVIEW_WRITER = {
  SHEET_NAME: 'IMPORT_REVIEW',

  PRESERVED_FIELDS: [
    'Decision',
    'DecisionReason',
    'ImportDecision',
    'ApprovedStrategyID',
    'CreateOrLinkTradeID',
    'IgnoreReason',
    'ReviewerNotes',
    'ReviewedAt',
    'ReviewStatus',
    'UserComments'
  ],

  writeDDCGroups(groups) {
    if (!groups || groups.length === 0) {
      Logger.log('No DDC groups to import.');
      return 0;
    }

    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(this.SHEET_NAME);

    if (!sheet) {
      throw new Error('Missing sheet: ' + this.SHEET_NAME);
    }

    const headerInfo = this.findHeaderRow_(sheet);
    const headers = headerInfo.headers;
    const headerRow = headerInfo.row;

    const detectedGroupCol = this.findColumn_(headers, 'DetectedGroupID');
    const existingMap = this.buildExistingMap_(
      sheet,
      detectedGroupCol,
      headerRow
    );

    let inserted = 0;
    let updated = 0;

    groups.forEach(group => {
      const existingRowNumber = existingMap[group.groupId];

      if (existingRowNumber) {
        const existingRow = sheet
          .getRange(existingRowNumber, 1, 1, headers.length)
          .getValues()[0];

        const updatedRow = this.buildRow_(
          headers,
          group,
          existingRow
        );

        sheet
          .getRange(existingRowNumber, 1, 1, headers.length)
          .setValues([updatedRow]);

        updated++;
      } else {
        const newRow = this.buildRow_(headers, group, null);

        sheet
          .getRange(sheet.getLastRow() + 1, 1, 1, headers.length)
          .setValues([newRow]);

        inserted++;
      }
    });

    Logger.log(
      'DDC Import Review upsert completed. Inserted=' +
      inserted +
      ', Updated=' +
      updated
    );

    return inserted + updated;
  },

  findHeaderRow_(sheet) {
    const maxRows = Math.min(sheet.getLastRow(), 20);
    const maxCols = sheet.getLastColumn();

    for (let r = 1; r <= maxRows; r++) {
      const headers = sheet
        .getRange(r, 1, 1, maxCols)
        .getValues()[0]
        .map(h => String(h).trim());

      if (
        headers.indexOf('ReviewID') !== -1 &&
        headers.indexOf('DetectedGroupID') !== -1
      ) {
        Logger.log('IMPORT_REVIEW header row detected: ' + r);

        return {
          row: r,
          headers: headers
        };
      }
    }

    throw new Error(
      'Could not find IMPORT_REVIEW header row with ReviewID and DetectedGroupID.'
    );
  },

  findColumn_(headers, name) {
    const index = headers.indexOf(name);

    if (index < 0) {
      throw new Error('Missing column: ' + name);
    }

    return index + 1;
  },

  buildExistingMap_(sheet, detectedGroupCol, headerRow) {
    const map = {};
    const lastRow = sheet.getLastRow();

    if (lastRow <= headerRow) {
      return map;
    }

    const values = sheet
      .getRange(
        headerRow + 1,
        detectedGroupCol,
        lastRow - headerRow,
        1
      )
      .getValues();

    values.forEach((row, index) => {
      const id = String(row[0] || '').trim();

      if (id) {
        map[id] = headerRow + 1 + index;
      }
    });

    return map;
  },

  buildRow_(headers, group, existingRow) {
    const row = new Array(headers.length).fill('');

    const calculatedValues = {
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
      RecommendationReason:
        'Active DDC detected from IBKR open positions.',
      Priority: 'NORMAL'
    };

    headers.forEach((header, index) => {
      if (
        Object.prototype.hasOwnProperty.call(
          calculatedValues,
          header
        )
      ) {
        row[index] = calculatedValues[header];
      }
    });

    if (existingRow) {
      this.preserveManualFields_(
        headers,
        existingRow,
        row
      );
    } else {
      this.setValueByHeader_(
        headers,
        row,
        'ReviewStatus',
        'PENDING'
      );
    }

    return row;
  },

  preserveManualFields_(headers, existingRow, targetRow) {
    this.PRESERVED_FIELDS.forEach(fieldName => {
      const index = headers.indexOf(fieldName);

      if (index < 0) {
        return;
      }

      targetRow[index] = existingRow[index];
    });
  },

  setValueByHeader_(headers, row, name, value) {
    const index = headers.indexOf(name);

    if (index < 0) {
      return;
    }

    row[index] = value;
  }
};

function testImportReviewWriter() {
  const groups =
    TOS_OPEN_POSITION_GROUPER.detectActiveDdcFromCachedXml();

  return TOS_IMPORT_REVIEW_WRITER.writeDDCGroups(groups);
}