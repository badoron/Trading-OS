/**
 * Trading OS - Pipeline Audit Logger
 *
 * Writes standardized pipeline audit records
 * to the dedicated PIPELINE_AUDIT sheet.
 *
 * Columns:
 * - Timestamp
 * - RunID
 * - Module
 * - Status
 * - Message
 * - DurationMs
 */

const TOS_PIPELINE_AUDIT_LOGGER = {
  SHEET_NAME: 'PIPELINE_AUDIT',

  HEADERS: [
    'Timestamp',
    'RunID',
    'Module',
    'Status',
    'Message',
    'DurationMs'
  ],

  /**
   * Creates a stable run ID from timestamp + suffix.
   *
   * @param {Date} timestamp Run start time.
   * @param {string} suffix Unique suffix.
   * @return {string} Run ID.
   */
  createRunId_(timestamp, suffix) {
    const date =
      timestamp instanceof Date
        ? timestamp
        : new Date();

    const generatedSuffix =
      typeof Utilities !== 'undefined'
        ? Utilities
            .getUuid()
            .replace(/-/g, '')
            .slice(0, 8)
        : 'LOCAL000';

    const safeSuffix = this.text_(
      suffix || generatedSuffix
    ).toUpperCase();

    return (
      'RUN-' +
      this.pad_(date.getUTCFullYear(), 4) +
      this.pad_(date.getUTCMonth() + 1, 2) +
      this.pad_(date.getUTCDate(), 2) +
      '-' +
      this.pad_(date.getUTCHours(), 2) +
      this.pad_(date.getUTCMinutes(), 2) +
      this.pad_(date.getUTCSeconds(), 2) +
      '-' +
      safeSuffix
    );
  },

  /**
   * Returns the dedicated pipeline audit sheet.
   * Creates it with headers when it does not exist.
   *
   * @param {Object} spreadsheet Google Spreadsheet or test double.
   * @return {Object} PIPELINE_AUDIT sheet.
   */
  getOrCreateSheet_(spreadsheet) {
    let sheet =
      spreadsheet.getSheetByName(
        this.SHEET_NAME
      );

    if (sheet) {
      return sheet;
    }

    sheet =
      spreadsheet.insertSheet(
        this.SHEET_NAME
      );

    sheet.appendRow(
      this.HEADERS.slice()
    );

    return sheet;
  },

  /**
   * Writes one normalized audit record.
   *
   * @param {Object} sheet Google Sheet or compatible test double.
   * @param {Object} record Audit record.
   * @return {Object} Write summary.
   */
  writeRecord_(sheet, record) {
    const runId = this.text_(
      record && record.runId
    );

    const moduleName = this.text_(
      record && record.module
    );

    if (!runId || !moduleName) {
      return {
        written: 0,
        skipped: 1
      };
    }

    const timestamp =
      record &&
      record.timestamp instanceof Date
        ? record.timestamp
        : new Date();

    const status = this.text_(
      record && record.status
    ).toUpperCase();

    const message = this.text_(
      record && record.message
    );

    const durationMs = this.number_(
      record && record.durationMs
    );

    sheet.appendRow([
      timestamp,
      runId,
      moduleName,
      status,
      message,
      durationMs
    ]);

    return {
      written: 1,
      skipped: 0
    };
  },

  /**
   * Writes one audit record to PIPELINE_AUDIT.
   *
   * The sheet is created automatically on first use.
   *
   * @param {Object} record Audit record.
   * @return {Object} Write summary.
   */
  log(record) {
    const ss =
      SpreadsheetApp.getActiveSpreadsheet();

    const sheet =
      this.getOrCreateSheet_(ss);

    return this.writeRecord_(
      sheet,
      record
    );
  },

  /**
   * Formats standard module result details.
   *
   * @param {Object} details Module result.
   * @return {string} Readable detail string.
   */
  formatDetails_(details) {
    const source = details || {};
    const parts = [];

    const fields = [
      ['updated', 'Updated'],
      ['missing', 'Missing'],
      ['skipped', 'Skipped'],
      ['open', 'Open'],
      ['partialExit', 'PartialExit'],
      [
        'closedPendingExitSync',
        'ClosedPendingExitSync'
      ],
      ['readyToClose', 'ReadyToClose'],
      ['writesPerformed', 'WritesPerformed']
    ];

    fields.forEach(function (field) {
      const key = field[0];
      const label = field[1];

      if (
        source[key] !== null &&
        source[key] !== undefined
      ) {
        parts.push(
          label + '=' + source[key]
        );
      }
    });

    return parts.join(', ');
  },

  text_(value) {
    return String(
      value === null ||
      value === undefined
        ? ''
        : value
    ).trim();
  },

  number_(value) {
    const normalized =
      this.text_(value);

    if (!normalized) {
      return 0;
    }

    const parsed = Number(
      normalized.replace(/,/g, '')
    );

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  },

  pad_(value, length) {
    return String(value).padStart(
      length,
      '0'
    );
  }
};