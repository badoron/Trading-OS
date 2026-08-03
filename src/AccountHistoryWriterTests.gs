/**
 * Trading OS - Account History Writer Tests
 *
 * RED test:
 * TOS_ACCOUNT_HISTORY_WRITER does not exist yet.
 */

function testAccountHistoryWriterBuildsHeaderAndRow() {
  const record = {
    timestamp: new Date('2026-07-18T18:14:27Z'),
    reportDate: '20260717',
    runId: 'RUN-20260718-181427-67BF069C',
    accountId: 'U3511632',
    currency: 'USD',
    netLiquidation: 2327.821207959,
    cash: 2362.721207959,
    stockValue: 0,
    optionsValue: -13.86,
    openTrades: 0,
    partialExitTrades: 3,
    closedTrades: 3,
    totalTrades: 6
  };

  const headers = TOS_ACCOUNT_HISTORY_WRITER.getHeaders_();
  const row = TOS_ACCOUNT_HISTORY_WRITER.buildRow_(record);

  assertAccountHistoryWriterEqual_(
    'header count',
    13,
    headers.length
  );

  assertAccountHistoryWriterEqual_(
    'row count',
    13,
    row.length
  );

  assertAccountHistoryWriterEqual_(
    'first header',
    'Timestamp',
    headers[0]
  );

  assertAccountHistoryWriterEqual_(
    'last header',
    'TotalTrades',
    headers[12]
  );

  assertAccountHistoryWriterEqual_(
    'timestamp',
    record.timestamp.getTime(),
    row[0].getTime()
  );

  assertAccountHistoryWriterEqual_(
    'reportDate',
    '20260717',
    row[1]
  );

  assertAccountHistoryWriterEqual_(
    'runId',
    'RUN-20260718-181427-67BF069C',
    row[2]
  );

  assertAccountHistoryWriterNumber_(
    'netLiquidation',
    2327.821207959,
    row[5]
  );

  assertAccountHistoryWriterNumber_(
    'cash',
    2362.721207959,
    row[6]
  );

  assertAccountHistoryWriterEqual_(
    'partialExitTrades',
    3,
    row[10]
  );

  assertAccountHistoryWriterEqual_(
    'totalTrades',
    6,
    row[12]
  );

  Logger.log('PASS - testAccountHistoryWriterBuildsHeaderAndRow');
  return true;
}

function testAccountHistoryWriterUsesStableSheetName() {
  assertAccountHistoryWriterEqual_(
    'sheet name',
    'ACCOUNT_HISTORY',
    TOS_ACCOUNT_HISTORY_WRITER.SHEET_NAME
  );

  Logger.log('PASS - testAccountHistoryWriterUsesStableSheetName');
  return true;
}

function runAccountHistoryWriterTests() {
  const tests = [
    testAccountHistoryWriterBuildsHeaderAndRow,
    testAccountHistoryWriterUsesStableSheetName
  ];

  let passed = 0;

  tests.forEach(test => {
    test();
    passed++;
  });

  Logger.log(
    'ACCOUNT HISTORY WRITER TESTS PASSED: ' +
    passed +
    '/' +
    tests.length
  );

  return {
    passed: passed,
    total: tests.length
  };
}

function assertAccountHistoryWriterEqual_(label, expected, actual) {
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

function assertAccountHistoryWriterNumber_(label, expected, actual) {
  const expectedNumber = Number(expected);
  const actualNumber = Number(actual);

  if (
    !Number.isFinite(actualNumber) ||
    Math.abs(expectedNumber - actualNumber) > 0.000000001
  ) {
    throw new Error(
      label +
      ' expected=' +
      expectedNumber +
      ' actual=' +
      actual
    );
  }
}