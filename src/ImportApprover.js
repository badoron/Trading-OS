/**
 * Trading OS - Import Approver
 *
 * Imports approved rows from IMPORT_REVIEW into:
 * - MASTER_TRADES
 * - TRADE_LEGS
 *
 * Supported approval values:
 * - IMPORT
 * - APPROVE
 * - APPROVED
 */

const TOS_IMPORT_APPROVER = {
  IMPORT_REVIEW: 'IMPORT_REVIEW',
  MASTER_TRADES: 'MASTER_TRADES',
  TRADE_LEGS: 'TRADE_LEGS',

  approvePendingImports() {
    const ss =
      SpreadsheetApp.getActiveSpreadsheet();

    const reviewSheet =
      ss.getSheetByName(
        this.IMPORT_REVIEW
      );

    const masterSheet =
      ss.getSheetByName(
        this.MASTER_TRADES
      );

    const legsSheet =
      ss.getSheetByName(
        this.TRADE_LEGS
      );

    if (!reviewSheet) {
      throw new Error(
        'Missing sheet: ' +
        this.IMPORT_REVIEW
      );
    }

    if (!masterSheet) {
      throw new Error(
        'Missing sheet: ' +
        this.MASTER_TRADES
      );
    }

    if (!legsSheet) {
      throw new Error(
        'Missing sheet: ' +
        this.TRADE_LEGS
      );
    }

    const review =
      this.getTable_(
        reviewSheet,
        [
          'ReviewID',
          'DetectedGroupID'
        ]
      );

    const master =
      this.getTable_(
        masterSheet,
        ['TradeID']
      );

    const legsTable =
      this.getTable_(
        legsSheet,
        [
          'LegID',
          'TradeID'
        ]
      );

    Logger.log(
      'Review rows: ' +
      review.rows.length
    );

    const groups =
      TOS_OPEN_POSITION_GROUPER
        .detectActiveDdcFromCachedXml();

    const groupMap = {};

    groups.forEach(group => {
      groupMap[group.groupId] = group;
    });

    const existingTradeIds =
      this.getExistingIds_(
        master,
        'TradeID'
      );

    let imported = 0;
    let skipped = 0;

    review.rows.forEach(item => {
      const rowNumber =
        item.rowNumber;

      const row =
        item.row;

      const decision =
        this.text_(
          this.getCell_(
            row,
            review.headers,
            'Decision'
          )
        ).toUpperCase();

      const importDecision =
        this.text_(
          this.getCell_(
            row,
            review.headers,
            'ImportDecision'
          )
        ).toUpperCase();

      const reviewStatus =
        this.text_(
          this.getCell_(
            row,
            review.headers,
            'ReviewStatus'
          )
        ).toUpperCase();

      const groupId =
        this.text_(
          this.getCell_(
            row,
            review.headers,
            'DetectedGroupID'
          )
        );

      Logger.log(
        'Review row ' +
        rowNumber +
        ' | Decision=[' +
        decision +
        ']' +
        ' | ImportDecision=[' +
        importDecision +
        ']' +
        ' | ReviewStatus=[' +
        reviewStatus +
        ']' +
        ' | Group=[' +
        groupId +
        ']'
      );

      /*
       * The IMPORT_REVIEW dropdown uses "Import".
       *
       * Older versions and manual tests used:
       * - APPROVE
       * - APPROVED
       *
       * All three values are supported for backward compatibility.
       */
      const isApproved =
        this.isImportApproved_(
          decision,
          importDecision,
          reviewStatus
        );

      if (!isApproved) {
        return;
      }

      const group =
        groupMap[groupId];

      if (!group) {
        this.setCell_(
          reviewSheet,
          rowNumber,
          review.headers,
          'ReviewStatus',
          'ERROR'
        );

        this.setCell_(
          reviewSheet,
          rowNumber,
          review.headers,
          'DecisionReason',
          'Approved group was not found in current open positions.'
        );

        skipped++;
        return;
      }

      const tradeId =
        this.buildTradeId_(
          group.groupId
        );

      if (existingTradeIds[tradeId]) {
        this.updateReviewImported_(
          reviewSheet,
          rowNumber,
          review.headers,
          tradeId,
          'Already imported.'
        );

        skipped++;
        return;
      }

      this.appendMasterTrade_(
        masterSheet,
        master.headers,
        tradeId,
        group
      );

      this.appendTradeLegs_(
        legsSheet,
        legsTable.headers,
        tradeId,
        group
      );

      this.updateReviewImported_(
        reviewSheet,
        rowNumber,
        review.headers,
        tradeId,
        'Imported to MASTER_TRADES and TRADE_LEGS.'
      );

      existingTradeIds[tradeId] = true;
      imported++;
    });

    Logger.log(
      'Import approval completed.' +
      ' Imported=' +
      imported +
      ', Skipped=' +
      skipped
    );

    return {
      imported: imported,
      skipped: skipped
    };
  },

  /**
   * Determines whether a review row requests an import.
   *
   * The normal UI value is IMPORT.
   * APPROVE and APPROVED remain supported for backward compatibility.
   */
  isImportApproved_(
    decision,
    importDecision,
    reviewStatus
  ) {
    const approvedValues = {
      IMPORT: true,
      APPROVE: true,
      APPROVED: true
    };

    return (
      approvedValues[
        this.text_(
          decision
        ).toUpperCase()
      ] === true ||
      approvedValues[
        this.text_(
          importDecision
        ).toUpperCase()
      ] === true ||
      approvedValues[
        this.text_(
          reviewStatus
        ).toUpperCase()
      ] === true
    );
  },

  appendMasterTrade_(
    sheet,
    headers,
    tradeId,
    group
  ) {
    const values = {
      TradeID: tradeId,
      StrategyID: 'DDC',

      AccountID:
        this.first_(
          group.legs,
          'accountId'
        ),

      Symbol: group.symbol,
      WorkflowStatus: 'OPEN',
      EntryDate: new Date(),
      ExitDate: '',
      Lots: 1,

      EntrySource:
        'IBKR_OPEN_POSITIONS',

      BrokerPositionID:
        group.sourcePositionIds.join(','),

      StrategyVersion:
        'DDC-MVP-1',

      EntryDecisionID:
        group.groupId,

      RealizedPnL: '',

      Tags:
        'IBKR,DDC,MVP',

      EntryThesis:
        'Imported from active IBKR open positions.',

      ExitReason: ''
    };

    this.appendMappedRow_(
      sheet,
      headers,
      values
    );
  },

  appendTradeLegs_(
    sheet,
    headers,
    tradeId,
    group
  ) {
    group.legs.forEach(
      (leg, index) => {
        const values = {
          LegID:
            tradeId +
            '-L' +
            (index + 1),

          TradeID:
            tradeId,

          StrategyID:
            'DDC',

          Symbol:
            leg.underlyingSymbol ||
            group.symbol,

          BrokerContractID:
            leg.conid || '',

          Expiration:
            leg.expiry || '',

          CallPut:
            leg.putCall || '',

          LongShort:
            leg.side || '',

          Quantity:
            leg.position || '',

          Strike:
            leg.strike || '',

          EntryPrice:
            leg.costBasisPrice ||
            leg.openPrice ||
            '',

          ExitPrice: '',

          CurrentPrice:
            leg.markPrice || '',

          MarketValue:
            leg.positionValue || '',

          UnrealizedPnL:
            leg.fifoPnlUnrealized ||
            '',

          Source:
            'IBKR_OPEN_POSITION'
        };

        this.appendMappedRow_(
          sheet,
          headers,
          values
        );
      }
    );
  },

  updateReviewImported_(
    sheet,
    rowNumber,
    headers,
    tradeId,
    reason
  ) {
    this.setCell_(
      sheet,
      rowNumber,
      headers,
      'CreateOrLinkTradeID',
      tradeId
    );

    this.setCell_(
      sheet,
      rowNumber,
      headers,
      'ImportDecision',
      'IMPORTED'
    );

    this.setCell_(
      sheet,
      rowNumber,
      headers,
      'ReviewStatus',
      'IMPORTED'
    );

    this.setCell_(
      sheet,
      rowNumber,
      headers,
      'DecisionReason',
      reason
    );

    this.setCell_(
      sheet,
      rowNumber,
      headers,
      'ReviewedAt',
      new Date()
    );
  },

  appendMappedRow_(
    sheet,
    headers,
    values
  ) {
    const row =
      new Array(
        headers.length
      ).fill('');

    headers.forEach(
      (header, index) => {
        if (
          Object.prototype
            .hasOwnProperty.call(
              values,
              header
            )
        ) {
          row[index] =
            values[header];
        }
      }
    );

    sheet
      .getRange(
        sheet.getLastRow() + 1,
        1,
        1,
        headers.length
      )
      .setValues([row]);
  },

  getTable_(
    sheet,
    requiredHeaders
  ) {
    const headerInfo =
      this.findHeaderRow_(
        sheet,
        requiredHeaders
      );

    const headers =
      headerInfo.headers;

    const headerRow =
      headerInfo.row;

    const lastRow =
      sheet.getLastRow();

    const rows = [];

    if (lastRow > headerRow) {
      const values = sheet
        .getRange(
          headerRow + 1,
          1,
          lastRow - headerRow,
          headers.length
        )
        .getValues();

      values.forEach(
        (row, index) => {
          rows.push({
            rowNumber:
              headerRow +
              1 +
              index,

            row: row
          });
        }
      );
    }

    return {
      headerRow: headerRow,
      headers: headers,
      rows: rows
    };
  },

  findHeaderRow_(
    sheet,
    requiredHeaders
  ) {
    const maxRows =
      Math.min(
        sheet.getLastRow(),
        20
      );

    const maxCols =
      sheet.getLastColumn();

    for (
      let rowNumber = 1;
      rowNumber <= maxRows;
      rowNumber++
    ) {
      const headers = sheet
        .getRange(
          rowNumber,
          1,
          1,
          maxCols
        )
        .getValues()[0]
        .map(header => {
          return this.text_(
            header
          );
        });

      const allFound =
        requiredHeaders.every(
          requiredHeader => {
            return (
              headers.indexOf(
                requiredHeader
              ) !== -1
            );
          }
        );

      if (allFound) {
        Logger.log(
          sheet.getName() +
          ' header row detected: ' +
          rowNumber
        );

        return {
          row: rowNumber,
          headers: headers
        };
      }
    }

    throw new Error(
      'Could not find header row in sheet: ' +
      sheet.getName()
    );
  },

  getExistingIds_(
    table,
    idColumn
  ) {
    const map = {};

    const columnIndex =
      table.headers.indexOf(
        idColumn
      );

    if (columnIndex < 0) {
      return map;
    }

    table.rows.forEach(item => {
      const id =
        this.text_(
          item.row[columnIndex]
        );

      if (id) {
        map[id] = true;
      }
    });

    return map;
  },

  getCell_(
    row,
    headers,
    name
  ) {
    const index =
      headers.indexOf(name);

    if (index < 0) {
      return '';
    }

    return row[index];
  },

  setCell_(
    sheet,
    rowNumber,
    headers,
    name,
    value
  ) {
    const index =
      headers.indexOf(name);

    if (index < 0) {
      return;
    }

    sheet
      .getRange(
        rowNumber,
        index + 1
      )
      .setValue(value);
  },

  first_(
    items,
    field
  ) {
    if (
      !items ||
      items.length === 0
    ) {
      return '';
    }

    return (
      items[0][field] ||
      ''
    );
  },

  buildTradeId_(groupId) {
    const digest =
      Utilities.computeDigest(
        Utilities.DigestAlgorithm.MD5,
        groupId,
        Utilities.Charset.UTF_8
      );

    const hex =
      digest
        .map(byte => {
          const value =
            (
              byte < 0
                ? byte + 256
                : byte
            ).toString(16);

          return (
            value.length === 1
              ? '0' + value
              : value
          );
        })
        .join('');

    return (
      'TRD-' +
      hex
        .substring(0, 12)
        .toUpperCase()
    );
  },

  text_(value) {
    return String(
      value === null ||
      value === undefined
        ? ''
        : value
    ).trim();
  }
};

function testApproveImports() {
  return TOS_IMPORT_APPROVER
    .approvePendingImports();
}