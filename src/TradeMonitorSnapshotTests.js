/**
 * TradeMonitor snapshot API tests.
 *
 * These tests inspect the public/internal API only.
 * They do not execute the production Trade Monitor
 * and do not write to Google Sheets.
 */

function testTradeMonitorSnapshotUnitTests() {
  const tests = [
    {
      name: 'exposes snapshot-aware update method',

      run: function () {
        assertTradeMonitorSnapshotEqual_(
          typeof TOS_TRADE_MONITOR
            .updateOpenLegsFromSnapshot_,
          'function',
          'updateOpenLegsFromSnapshot_ method'
        );
      }
    },

    {
      name: 'legacy method loads broker snapshot',

      run: function () {
        const source =
          normalizeTradeMonitorSnapshotSource_(
            TOS_TRADE_MONITOR
              .updateOpenLegsFromIBKR
          );

        assertTradeMonitorSnapshotIncludes_(
          source,
          'TOS_BROKER_SNAPSHOT_SERVICE.load()',
          'legacy method must load BrokerSnapshot'
        );
      }
    },

    {
      name: 'legacy method delegates to snapshot-aware method',

      run: function () {
        const source =
          normalizeTradeMonitorSnapshotSource_(
            TOS_TRADE_MONITOR
              .updateOpenLegsFromIBKR
          );

        assertTradeMonitorSnapshotIncludes_(
          source,
          'updateOpenLegsFromSnapshot_(snapshot)',
          'legacy method must delegate using snapshot'
        );
      }
    },

    {
      name: 'snapshot-aware method accepts snapshot',

      run: function () {
        const source =
          normalizeTradeMonitorSnapshotSource_(
            TOS_TRADE_MONITOR
              .updateOpenLegsFromSnapshot_
          );

        assertTradeMonitorSnapshotIncludes_(
          source,
          'updateOpenLegsFromSnapshot_(snapshot)',
          'snapshot-aware method must accept snapshot'
        );
      }
    },

    {
      name: 'snapshot-aware method consumes open positions',

      run: function () {
        const source =
          normalizeTradeMonitorSnapshotSource_(
            TOS_TRADE_MONITOR
              .updateOpenLegsFromSnapshot_
          );

        assertTradeMonitorSnapshotIncludes_(
          source,
          'snapshot.openPositions',
          'snapshot-aware method must use snapshot.openPositions'
        );
      }
    },

    {
      name: 'snapshot-aware method does not reload IBKR XML',

      run: function () {
        const source =
          String(
            TOS_TRADE_MONITOR
              .updateOpenLegsFromSnapshot_
          );

        assertTradeMonitorSnapshotExcludes_(
          source,
          'TOS_IBKR_FLEX.getLastXml',
          'snapshot-aware method must not reload XML'
        );

        assertTradeMonitorSnapshotExcludes_(
          source,
          'TOS_IBKR_FLEX_PARSER.parse',
          'snapshot-aware method must not parse XML'
        );
      }
    }
  ];

  let passed = 0;

  tests.forEach(function (test) {
    test.run();

    passed++;

    Logger.log(
      'PASS: ' + test.name
    );
  });

  Logger.log(
    'TradeMonitor snapshot tests completed. Passed=' +
      passed
  );
}

function normalizeTradeMonitorSnapshotSource_(
  value
) {
  return String(value)
    .replace(/\s+/g, '');
}

function assertTradeMonitorSnapshotEqual_(
  actual,
  expected,
  label
) {
  if (actual !== expected) {
    throw new Error(
      'Assertion failed: ' +
        label +
        '. Expected=' +
        expected +
        ', Actual=' +
        actual
    );
  }
}

function assertTradeMonitorSnapshotIncludes_(
  actual,
  expectedText,
  label
) {
  if (
    String(actual).indexOf(
      expectedText
    ) === -1
  ) {
    throw new Error(
      'Assertion failed: ' +
        label +
        '. Missing=' +
        expectedText
    );
  }
}

function assertTradeMonitorSnapshotExcludes_(
  actual,
  forbiddenText,
  label
) {
  if (
    String(actual).indexOf(
      forbiddenText
    ) !== -1
  ) {
    throw new Error(
      'Assertion failed: ' +
        label +
        '. Forbidden=' +
        forbiddenText
    );
  }
}