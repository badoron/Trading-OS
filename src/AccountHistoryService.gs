/**
 * Trading OS - Account History Service
 *
 * Orchestration and Google Sheets infrastructure layer
 * for storing account-history snapshots.
 *
 * Responsibilities:
 * - Validate the supplied spreadsheet.
 * - Build the account-history context.
 * - Build the normalized history record.
 * - Create or reuse the ACCOUNT_HISTORY sheet.
 * - Write headers when the sheet is empty.
 * - Append one snapshot row.
 *
 * Non-responsibilities:
 * - Counting trade statuses directly.
 * - Normalizing account values directly.
 * - Defining the sheet schema directly.
 * - Parsing IBKR data.
 */

const TOS_ACCOUNT_HISTORY_SERVICE = {

  /**
   * Records one account-history snapshot.
   *
   * @param {Object=} input Snapshot input.
   * @return {Object} Snapshot result.
   */
  recordSnapshot(input) {
    const safeInput =
      input || {};

    const spreadsheet =
      safeInput.spreadsheet;

    this.validateSpreadsheet_(
      spreadsheet
    );

    const context =
      TOS_ACCOUNT_HISTORY_CONTEXT_BUILDER.build({
        accountInfo:
          safeInput.accountInfo,

        trades:
          safeInput.trades,

        runId:
          safeInput.runId,

        timestamp:
          safeInput.timestamp
      });

    const record =
      TOS_ACCOUNT_HISTORY_BUILDER.build(
        context
      );

    const sheet =
      this.getOrCreateSheet_(
        spreadsheet
      );

    this.ensureHeaders_(
      sheet
    );

    const row =
      TOS_ACCOUNT_HISTORY_WRITER.buildRow_(
        record
      );

    sheet.appendRow(
      row
    );

    return {
      appended: true,

      sheetName:
        TOS_ACCOUNT_HISTORY_WRITER
          .SHEET_NAME,

      record: record
    };
  },

  /**
   * Validates the spreadsheet dependency.
   *
   * @param {*} spreadsheet Spreadsheet-like object.
   */
  validateSpreadsheet_(spreadsheet) {
    const valid =
      spreadsheet &&
      typeof spreadsheet.getSheetByName ===
        'function' &&
      typeof spreadsheet.insertSheet ===
        'function';

    if (!valid) {
      throw new Error(
        'AccountHistoryService requires a valid spreadsheet.'
      );
    }
  },

  /**
   * Returns the ACCOUNT_HISTORY sheet,
   * creating it when it does not exist.
   *
   * @param {Object} spreadsheet Spreadsheet.
   * @return {Object} Sheet.
   */
  getOrCreateSheet_(spreadsheet) {
    const sheetName =
      TOS_ACCOUNT_HISTORY_WRITER
        .SHEET_NAME;

    let sheet =
      spreadsheet.getSheetByName(
        sheetName
      );

    if (!sheet) {
      sheet =
        spreadsheet.insertSheet(
          sheetName
        );
    }

    return sheet;
  },

  /**
   * Writes the account-history headers when
   * the sheet is currently empty.
   *
   * Existing sheet contents are preserved.
   *
   * @param {Object} sheet Account-history sheet.
   */
  ensureHeaders_(sheet) {
    if (
      !sheet ||
      typeof sheet.getLastRow !==
        'function' ||
      typeof sheet.getRange !==
        'function'
    ) {
      throw new Error(
        'AccountHistoryService requires a valid sheet.'
      );
    }

    const headers =
      TOS_ACCOUNT_HISTORY_WRITER
        .getHeaders_();

    if (
      sheet.getLastRow() === 0
    ) {
      sheet
        .getRange(
          1,
          1,
          1,
          headers.length
        )
        .setValues([
          headers
        ]);

      return;
    }

    const lastColumn =
      typeof sheet.getLastColumn ===
        'function'
        ? sheet.getLastColumn()
        : 0;

    if (lastColumn < headers.length) {
      throw new Error(
        'ACCOUNT_HISTORY schema mismatch. ' +
        'Expected headers: ' +
        headers.join(', ') +
        '. No snapshot was written.'
      );
    }

    const scanRowCount =
      Math.min(
        sheet.getLastRow(),
        20
      );

    const values =
      sheet
        .getRange(
          1,
          1,
          scanRowCount,
          lastColumn
        )
        .getValues();

    const matchingHeaderRow =
      values.some(function (row) {
        return headers.every(
          function (header, index) {
            return String(
              row[index] === null ||
              row[index] === undefined
                ? ''
                : row[index]
            ).trim() === header;
          }
        );
      });

    if (!matchingHeaderRow) {
      throw new Error(
        'ACCOUNT_HISTORY schema mismatch. ' +
        'Expected headers: ' +
        headers.join(', ') +
        '. No snapshot was written.'
      );
    }
  }

};