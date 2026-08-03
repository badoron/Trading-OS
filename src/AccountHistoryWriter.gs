/**
 * Trading OS - Account History Writer
 *
 * Responsibilities:
 * - Defines ACCOUNT_HISTORY schema.
 * - Converts a history record into a sheet row.
 *
 * Non-responsibilities:
 * - Reading sheets.
 * - Creating history records.
 * - Counting trades.
 * - Writing into the spreadsheet (handled by the Service).
 */

const TOS_ACCOUNT_HISTORY_WRITER = {

  SHEET_NAME: 'ACCOUNT_HISTORY',

  COLUMNS: [
    { key: 'timestamp',          header: 'Timestamp' },
    { key: 'reportDate',         header: 'ReportDate' },
    { key: 'runId',              header: 'RunId' },
    { key: 'accountId',          header: 'AccountId' },
    { key: 'currency',           header: 'Currency' },
    { key: 'netLiquidation',     header: 'NetLiquidation' },
    { key: 'cash',               header: 'Cash' },
    { key: 'stockValue',         header: 'StockValue' },
    { key: 'optionsValue',       header: 'OptionsValue' },
    { key: 'openTrades',         header: 'OpenTrades' },
    { key: 'partialExitTrades',  header: 'PartialExitTrades' },
    { key: 'closedTrades',       header: 'ClosedTrades' },
    { key: 'totalTrades',        header: 'TotalTrades' }
  ],

  getHeaders_() {
    return this.COLUMNS.map(function(column) {
      return column.header;
    });
  },

  buildRow_(record) {
    const safeRecord = record || {};

    return this.COLUMNS.map(function(column) {
      return safeRecord[column.key];
    });
  }

};