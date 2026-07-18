/**
 * Trading OS - Account History Builder Tests
 */

function testAccountHistoryBuilder() {
  const context = {
    timestamp: new Date('2026-07-18T18:14:27Z'),
    runId: 'RUN-20260718-181427-67BF069C',

    accountInfo: {
      accountId: 'U3511632',
      currency: 'USD',
      reportDate: '20260717',
      netLiquidation: 2327.821207959,
      totalCashValue: 2362.721207959,
      stockValue: 0,
      optionsValue: -13.86
    },

    openTrades: 0,
    partialExitTrades: 3,
    closedTrades: 3,
    totalTrades: 6
  };

  const result = TOS_ACCOUNT_HISTORY_BUILDER.build(context);

  assertAccountHistoryEqual_(
    'timestamp',
    context.timestamp.getTime(),
    result.timestamp.getTime()
  );

  assertAccountHistoryEqual_(
    'reportDate',
    '20260717',
    result.reportDate
  );

  assertAccountHistoryEqual_(
    'runId',
    'RUN-20260718-181427-67BF069C',
    result.runId
  );

  assertAccountHistoryEqual_(
    'accountId',
    'U3511632',
    result.accountId
  );

  assertAccountHistoryEqual_(
    'currency',
    'USD',
    result.currency
  );

  assertAccountHistoryNumber_(
    'netLiquidation',
    2327.821207959,
    result.netLiquidation
  );

  assertAccountHistoryNumber_(
    'cash',
    2362.721207959,
    result.cash
  );

  assertAccountHistoryNumber_(
    'stockValue',
    0,
    result.stockValue
  );

  assertAccountHistoryNumber_(
    'optionsValue',
    -13.86,
    result.optionsValue
  );

  assertAccountHistoryEqual_(
    'openTrades',
    0,
    result.openTrades
  );

  assertAccountHistoryEqual_(
    'partialExitTrades',
    3,
    result.partialExitTrades
  );

  assertAccountHistoryEqual_(
    'closedTrades',
    3,
    result.closedTrades
  );

  assertAccountHistoryEqual_(
    'totalTrades',
    6,
    result.totalTrades
  );

  Logger.log('PASS - testAccountHistoryBuilder');
  return true;
}

function testAccountHistoryBuilderHandlesMissingValues() {
  const context = {
    timestamp: new Date('2026-07-18T18:14:27Z'),
    runId: 'RUN-EMPTY',
    accountInfo: {}
  };

  const result = TOS_ACCOUNT_HISTORY_BUILDER.build(context);

  assertAccountHistoryEqual_(
    'missing accountId',
    '',
    result.accountId
  );

  assertAccountHistoryEqual_(
    'missing currency',
    '',
    result.currency
  );

  assertAccountHistoryEqual_(
    'missing reportDate',
    '',
    result.reportDate
  );

  assertAccountHistoryNumber_(
    'missing netLiquidation',
    0,
    result.netLiquidation
  );

  assertAccountHistoryNumber_(
    'missing cash',
    0,
    result.cash
  );

  assertAccountHistoryNumber_(
    'missing stockValue',
    0,
    result.stockValue
  );

  assertAccountHistoryNumber_(
    'missing optionsValue',
    0,
    result.optionsValue
  );

  assertAccountHistoryEqual_(
    'missing openTrades',
    0,
    result.openTrades
  );

  assertAccountHistoryEqual_(
    'missing partialExitTrades',
    0,
    result.partialExitTrades
  );

  assertAccountHistoryEqual_(
    'missing closedTrades',
    0,
    result.closedTrades
  );

  assertAccountHistoryEqual_(
    'missing totalTrades',
    0,
    result.totalTrades
  );

  Logger.log('PASS - testAccountHistoryBuilderHandlesMissingValues');
  return true;
}

function runAccountHistoryBuilderTests() {
  const tests = [
    testAccountHistoryBuilder,
    testAccountHistoryBuilderHandlesMissingValues
  ];

  let passed = 0;

  tests.forEach(test => {
    test();
    passed++;
  });

  Logger.log(
    'ACCOUNT HISTORY BUILDER TESTS PASSED: ' +
    passed +
    '/' +
    tests.length
  );

  return {
    passed: passed,
    total: tests.length
  };
}

function assertAccountHistoryEqual_(label, expected, actual) {
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

function assertAccountHistoryNumber_(label, expected, actual) {
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