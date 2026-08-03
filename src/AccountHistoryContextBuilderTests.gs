/**
 * Trading OS - Account History Context Builder Tests
 *
 * Tests the business logic responsible for counting
 * trades by lifecycle status before an account-history
 * record is built.
 */

function testAccountHistoryContextBuilderCountsStatuses() {
  const accountInfo = {
    accountId: 'U3511632',
    currency: 'USD',
    reportDate: '20260717',
    netLiquidation: 2327.82,
    totalCashValue: 2362.72,
    stockValue: 0,
    optionsValue: -13.86
  };

  const timestamp =
    new Date('2026-07-18T18:14:27Z');

  const trades = [
    { Status: 'OPEN' },
    { Status: 'PARTIAL_EXIT' },
    { Status: 'PARTIAL_EXIT' },
    { Status: 'CLOSED' },
    { Status: 'CLOSED' }
  ];

  const context =
    TOS_ACCOUNT_HISTORY_CONTEXT_BUILDER.build({
      accountInfo: accountInfo,
      trades: trades,
      runId: 'RUN-1',
      timestamp: timestamp
    });

  assertAccountHistoryContextEqual_(
    'accountInfo reference',
    accountInfo,
    context.accountInfo
  );

  assertAccountHistoryContextEqual_(
    'timestamp',
    timestamp.getTime(),
    context.timestamp.getTime()
  );

  assertAccountHistoryContextEqual_(
    'runId',
    'RUN-1',
    context.runId
  );

  assertAccountHistoryContextEqual_(
    'openTrades',
    1,
    context.openTrades
  );

  assertAccountHistoryContextEqual_(
    'partialExitTrades',
    2,
    context.partialExitTrades
  );

  assertAccountHistoryContextEqual_(
    'closedTrades',
    2,
    context.closedTrades
  );

  assertAccountHistoryContextEqual_(
    'totalTrades',
    5,
    context.totalTrades
  );

  Logger.log(
    'PASS - testAccountHistoryContextBuilderCountsStatuses'
  );

  return true;
}

function testAccountHistoryContextBuilderNormalizesStatuses() {
  const context =
    TOS_ACCOUNT_HISTORY_CONTEXT_BUILDER.build({
      accountInfo: {},
      trades: [
        { Status: ' open ' },
        { status: 'PARTIAL_EXIT' },
        { Status: 'closed' },
        { Status: 'UNKNOWN' },
        null,
        {}
      ],
      runId: ' RUN-2 '
    });

  assertAccountHistoryContextEqual_(
    'normalized runId',
    'RUN-2',
    context.runId
  );

  assertAccountHistoryContextEqual_(
    'normalized openTrades',
    1,
    context.openTrades
  );

  assertAccountHistoryContextEqual_(
    'normalized partialExitTrades',
    1,
    context.partialExitTrades
  );

  assertAccountHistoryContextEqual_(
    'normalized closedTrades',
    1,
    context.closedTrades
  );

  assertAccountHistoryContextEqual_(
    'all trade records included in total',
    6,
    context.totalTrades
  );

  Logger.log(
    'PASS - testAccountHistoryContextBuilderNormalizesStatuses'
  );

  return true;
}

function testAccountHistoryContextBuilderHandlesMissingValues() {
  const before = Date.now();

  const context =
    TOS_ACCOUNT_HISTORY_CONTEXT_BUILDER.build();

  const after = Date.now();

  assertAccountHistoryContextEqual_(
    'missing runId',
    '',
    context.runId
  );

  assertAccountHistoryContextEqual_(
    'missing accountInfo exists',
    true,
    context.accountInfo !== null &&
      typeof context.accountInfo === 'object'
  );

  assertAccountHistoryContextEqual_(
    'missing openTrades',
    0,
    context.openTrades
  );

  assertAccountHistoryContextEqual_(
    'missing partialExitTrades',
    0,
    context.partialExitTrades
  );

  assertAccountHistoryContextEqual_(
    'missing closedTrades',
    0,
    context.closedTrades
  );

  assertAccountHistoryContextEqual_(
    'missing totalTrades',
    0,
    context.totalTrades
  );

  assertAccountHistoryContextEqual_(
    'timestamp is Date',
    true,
    context.timestamp instanceof Date
  );

  const timestampValue =
    context.timestamp.getTime();

  if (
    timestampValue < before ||
    timestampValue > after
  ) {
    throw new Error(
      'generated timestamp is outside expected range'
    );
  }

  Logger.log(
    'PASS - testAccountHistoryContextBuilderHandlesMissingValues'
  );

  return true;
}

function runAccountHistoryContextBuilderTests() {
  const tests = [
    testAccountHistoryContextBuilderCountsStatuses,
    testAccountHistoryContextBuilderNormalizesStatuses,
    testAccountHistoryContextBuilderHandlesMissingValues
  ];

  let passed = 0;

  tests.forEach(function(test) {
    test();
    passed++;
  });

  Logger.log(
    'ACCOUNT HISTORY CONTEXT BUILDER TESTS PASSED: ' +
    passed +
    '/' +
    tests.length
  );

  return {
    passed: passed,
    total: tests.length
  };
}

function assertAccountHistoryContextEqual_(
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