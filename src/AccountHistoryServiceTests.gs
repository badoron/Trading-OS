/**
 * Trading OS - Account History Service Tests
 *
 * Tests orchestration and spreadsheet interaction for
 * storing account-history snapshots.
 *
 * The tests use an in-memory spreadsheet mock and do not
 * read or write the real Google Spreadsheet.
 */

function testAccountHistoryServiceCreatesSheetAndWritesSnapshot() {
  const spreadsheet =
    createAccountHistorySpreadsheetMock_();

  const timestamp =
    new Date('2026-07-18T20:00:00Z');

  const result =
    TOS_ACCOUNT_HISTORY_SERVICE.recordSnapshot({
      spreadsheet: spreadsheet,

      accountInfo: {
        accountId: 'U3511632',
        currency: 'USD',
        reportDate: '20260718',
        netLiquidation: 2500.50,
        totalCashValue: 2400.25,
        stockValue: 0,
        optionsValue: 100.25
      },

      trades: [
        { Status: 'OPEN' },
        { Status: 'PARTIAL_EXIT' },
        { Status: 'CLOSED' }
      ],

      runId: 'RUN-ACCOUNT-HISTORY-1',
      timestamp: timestamp
    });

  const sheet =
    spreadsheet.getSheetByName(
      TOS_ACCOUNT_HISTORY_WRITER.SHEET_NAME
    );

  assertAccountHistoryServiceEqual_(
    'sheet created',
    true,
    sheet !== null
  );

  assertAccountHistoryServiceEqual_(
    'two rows written',
    2,
    sheet.getData().length
  );

  assertAccountHistoryServiceDeepEqual_(
    'headers',
    TOS_ACCOUNT_HISTORY_WRITER.getHeaders_(),
    sheet.getData()[0]
  );

  assertAccountHistoryServiceDeepEqual_(
    'snapshot row',
    TOS_ACCOUNT_HISTORY_WRITER.buildRow_(
      result.record
    ),
    sheet.getData()[1]
  );

  assertAccountHistoryServiceEqual_(
    'result appended',
    true,
    result.appended
  );

  assertAccountHistoryServiceEqual_(
    'result sheet name',
    'ACCOUNT_HISTORY',
    result.sheetName
  );

  assertAccountHistoryServiceEqual_(
    'open trade count',
    1,
    result.record.openTrades
  );

  assertAccountHistoryServiceEqual_(
    'partial-exit trade count',
    1,
    result.record.partialExitTrades
  );

  assertAccountHistoryServiceEqual_(
    'closed trade count',
    1,
    result.record.closedTrades
  );

  assertAccountHistoryServiceEqual_(
    'total trade count',
    3,
    result.record.totalTrades
  );

  Logger.log(
    'PASS - testAccountHistoryServiceCreatesSheetAndWritesSnapshot'
  );

  return true;
}

function testAccountHistoryServiceReusesExistingSheetAndHeaders() {
  const spreadsheet =
    createAccountHistorySpreadsheetMock_();

  const existingSheet =
    spreadsheet.insertSheet(
      TOS_ACCOUNT_HISTORY_WRITER.SHEET_NAME
    );

  const headers =
    TOS_ACCOUNT_HISTORY_WRITER.getHeaders_();

  existingSheet
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setValues([
      headers
    ]);

  TOS_ACCOUNT_HISTORY_SERVICE.recordSnapshot({
    spreadsheet: spreadsheet,

    accountInfo: {
      accountId: 'U3511632',
      currency: 'USD',
      netLiquidation: 3000
    },

    trades: [],

    runId: 'RUN-ACCOUNT-HISTORY-2',
    timestamp:
      new Date('2026-07-18T21:00:00Z')
  });

  const data =
    existingSheet.getData();

  assertAccountHistoryServiceEqual_(
    'existing sheet retained',
    existingSheet,
    spreadsheet.getSheetByName(
      TOS_ACCOUNT_HISTORY_WRITER.SHEET_NAME
    )
  );

  assertAccountHistoryServiceEqual_(
    'header not duplicated',
    2,
    data.length
  );

  assertAccountHistoryServiceDeepEqual_(
    'original header retained',
    headers,
    data[0]
  );

  Logger.log(
    'PASS - testAccountHistoryServiceReusesExistingSheetAndHeaders'
  );

  return true;
}

function testAccountHistoryServiceRepairsMissingHeaders() {
  const spreadsheet =
    createAccountHistorySpreadsheetMock_();

  const sheet =
    spreadsheet.insertSheet(
      TOS_ACCOUNT_HISTORY_WRITER.SHEET_NAME
    );

  assertAccountHistoryServiceEqual_(
    'sheet initially empty',
    0,
    sheet.getData().length
  );

  TOS_ACCOUNT_HISTORY_SERVICE.recordSnapshot({
    spreadsheet: spreadsheet,

    accountInfo: {
      accountId: 'U3511632',
      currency: 'USD'
    },

    trades: [],

    runId: 'RUN-ACCOUNT-HISTORY-3'
  });

  const data =
    sheet.getData();

  assertAccountHistoryServiceEqual_(
    'header and row written',
    2,
    data.length
  );

  assertAccountHistoryServiceDeepEqual_(
    'missing header created',
    TOS_ACCOUNT_HISTORY_WRITER.getHeaders_(),
    data[0]
  );

  Logger.log(
    'PASS - testAccountHistoryServiceRepairsMissingHeaders'
  );

  return true;
}

function testAccountHistoryServiceRequiresSpreadsheet() {
  let error = null;

  try {
    TOS_ACCOUNT_HISTORY_SERVICE.recordSnapshot({
      accountInfo: {},
      trades: []
    });
  } catch (caughtError) {
    error = caughtError;
  }

  assertAccountHistoryServiceEqual_(
    'missing spreadsheet throws',
    true,
    error instanceof Error
  );

  assertAccountHistoryServiceEqual_(
    'clear missing-spreadsheet error',
    true,
    String(error.message).indexOf(
      'spreadsheet'
    ) !== -1
  );

  Logger.log(
    'PASS - testAccountHistoryServiceRequiresSpreadsheet'
  );

  return true;
}

function runAccountHistoryServiceTests() {
  const tests = [
    testAccountHistoryServiceCreatesSheetAndWritesSnapshot,
    testAccountHistoryServiceReusesExistingSheetAndHeaders,
    testAccountHistoryServiceRepairsMissingHeaders,
    testAccountHistoryServiceRequiresSpreadsheet
  ];

  let passed = 0;

  tests.forEach(function(test) {
    test();
    passed++;
  });

  Logger.log(
    'ACCOUNT HISTORY SERVICE TESTS PASSED: ' +
    passed +
    '/' +
    tests.length
  );

  return {
    passed: passed,
    total: tests.length
  };
}

/**
 * Creates a minimal in-memory Google Spreadsheet mock.
 *
 * @return {Object} Spreadsheet mock.
 */
function createAccountHistorySpreadsheetMock_() {
  const sheets = {};

  return {
    getSheetByName: function(name) {
      return sheets[name] || null;
    },

    insertSheet: function(name) {
      if (sheets[name]) {
        throw new Error(
          'Sheet already exists: ' +
          name
        );
      }

      const sheet =
        createAccountHistorySheetMock_(
          name
        );

      sheets[name] = sheet;

      return sheet;
    }
  };
}

/**
 * Creates an in-memory Google Sheet mock.
 *
 * @param {string} name Sheet name.
 * @return {Object} Sheet mock.
 */
function createAccountHistorySheetMock_(name) {
  const rows = [];

  function ensureRow_(rowIndex) {
    while (
      rows.length < rowIndex
    ) {
      rows.push([]);
    }
  }

  return {
    getName: function() {
      return name;
    },

    getLastRow: function() {
      return rows.length;
    },

    getLastColumn: function() {
      if (rows.length === 0) {
        return 0;
      }

      return rows.reduce(
        function(maximum, row) {
          return Math.max(
            maximum,
            row.length
          );
        },
        0
      );
    },

    getRange: function(
      startRow,
      startColumn,
      rowCount,
      columnCount
    ) {
      return {
        setValues: function(values) {
          if (
            !Array.isArray(values) ||
            values.length !== rowCount
          ) {
            throw new Error(
              'Invalid row count'
            );
          }

          values.forEach(
            function(valueRow, rowOffset) {
              if (
                !Array.isArray(valueRow) ||
                valueRow.length !==
                  columnCount
              ) {
                throw new Error(
                  'Invalid column count'
                );
              }

              const targetRow =
                startRow +
                rowOffset;

              ensureRow_(
                targetRow
              );

              const existingRow =
                rows[targetRow - 1];

              valueRow.forEach(
                function(value, columnOffset) {
                  existingRow[
                    startColumn -
                    1 +
                    columnOffset
                  ] = value;
                }
              );
            }
          );

          return this;
        }
      };
    },

    appendRow: function(values) {
      rows.push(
        values.slice()
      );

      return this;
    },

    getData: function() {
      return rows.map(
        function(row) {
          return row.slice();
        }
      );
    }
  };
}

function assertAccountHistoryServiceEqual_(
  label,
  expected,
  actual
) {
  if (expected !== actual) {
    throw new Error(
      label +
      ' expected=' +
      expected +
      ' actual=' +
      actual
    );
  }
}

function assertAccountHistoryServiceDeepEqual_(
  label,
  expected,
  actual
) {
  const expectedJson =
    JSON.stringify(expected);

  const actualJson =
    JSON.stringify(actual);

  if (
    expectedJson !== actualJson
  ) {
    throw new Error(
      label +
      ' expected=' +
      expectedJson +
      ' actual=' +
      actualJson
    );
  }
}