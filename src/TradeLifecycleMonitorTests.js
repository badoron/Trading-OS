/**
 * Trading OS - Trade Lifecycle Monitor Tests
 *
 * These tests are isolated and do not read or write Google Sheets.
 */

function testTradeLifecycleMonitorUnitTests() {
  const tests = [
    {
      name: 'all original legs open => OPEN',
      run: function () {
        const result = TOS_TRADE_LIFECYCLE_MONITOR.evaluateLifecycle_(
          lifecycleTestLegs_(),
          { '101': true, '102': true, '103': true, '104': true }
        );

        lifecycleAssertEqual_('OPEN', result.status, 'status');
        lifecycleAssertEqual_(4, result.openLegs, 'openLegs');
        lifecycleAssertEqual_(0, result.closedLegs, 'closedLegs');
        lifecycleAssertEqual_(2, result.openShorts, 'openShorts');
        lifecycleAssertEqual_(2, result.openLongs, 'openLongs');
        lifecycleAssertEqual_(false, result.setExitDate, 'setExitDate');
      }
    },
    {
      name: 'some original legs open => PARTIAL_EXIT',
      run: function () {
        const result = TOS_TRADE_LIFECYCLE_MONITOR.evaluateLifecycle_(
          lifecycleTestLegs_(),
          { '101': true, '102': true }
        );

        lifecycleAssertEqual_('PARTIAL_EXIT', result.status, 'status');
        lifecycleAssertEqual_(2, result.openLegs, 'openLegs');
        lifecycleAssertEqual_(2, result.closedLegs, 'closedLegs');
        lifecycleAssertEqual_(1, result.openShorts, 'openShorts');
        lifecycleAssertEqual_(1, result.openLongs, 'openLongs');
        lifecycleAssertEqual_(false, result.setExitDate, 'setExitDate');
      }
    },
    {
      name: 'no original legs open => CLOSED_PENDING_EXIT_SYNC',
      run: function () {
        const result = TOS_TRADE_LIFECYCLE_MONITOR.evaluateLifecycle_(
          lifecycleTestLegs_(),
          {}
        );

        lifecycleAssertEqual_(
          'CLOSED_PENDING_EXIT_SYNC',
          result.status,
          'status'
        );
        lifecycleAssertEqual_(0, result.openLegs, 'openLegs');
        lifecycleAssertEqual_(4, result.closedLegs, 'closedLegs');
        lifecycleAssertEqual_(0, result.openShorts, 'openShorts');
        lifecycleAssertEqual_(0, result.openLongs, 'openLongs');

        // ExitDate must come from IBKR executions, not from the sync run time.
        lifecycleAssertEqual_(false, result.setExitDate, 'setExitDate');
      }
    },
    {
      name: 'contract IDs and long/short values are normalized',
      run: function () {
        const legs = [
          { brokerContractId: 201, longShort: ' short ' },
          { brokerContractId: '202', longShort: 'long' }
        ];

        const result = TOS_TRADE_LIFECYCLE_MONITOR.evaluateLifecycle_(
          legs,
          { '201': true, '202': true }
        );

        lifecycleAssertEqual_('OPEN', result.status, 'status');
        lifecycleAssertEqual_(1, result.openShorts, 'openShorts');
        lifecycleAssertEqual_(1, result.openLongs, 'openLongs');
      }
    },
    {
      name: 'open-position map ignores blank conids',
      run: function () {
        const result = TOS_TRADE_LIFECYCLE_MONITOR.buildOpenConidMap_([
          { conid: 301 },
          { conid: ' 302 ' },
          { conid: '' },
          { conid: null }
        ]);

        lifecycleAssertEqual_(true, result['301'], 'map[301]');
        lifecycleAssertEqual_(true, result['302'], 'map[302]');
        lifecycleAssertEqual_(2, Object.keys(result).length, 'map size');
      }
    }
  ];

  const failures = [];

  tests.forEach(function (test) {
    try {
      test.run();
      Logger.log('PASS: ' + test.name);
    } catch (error) {
      failures.push(test.name + ': ' + error.message);
      Logger.log('FAIL: ' + test.name + ' | ' + error.message);
    }
  });

  if (failures.length > 0) {
    throw new Error(
      failures.length +
      ' lifecycle unit test(s) failed:\n' +
      failures.join('\n')
    );
  }

  const result = {
    passed: tests.length,
    failed: 0
  };

  Logger.log(
    'Lifecycle unit tests completed. Passed=' + result.passed
  );

  return result;
}

function lifecycleTestLegs_() {
  return [
    { brokerContractId: '101', longShort: 'SHORT' },
    { brokerContractId: '102', longShort: 'LONG' },
    { brokerContractId: '103', longShort: 'SHORT' },
    { brokerContractId: '104', longShort: 'LONG' }
  ];
}

function lifecycleAssertEqual_(expected, actual, label) {
  if (expected !== actual) {
    throw new Error(
      label + ': expected=' + expected + ', actual=' + actual
    );
  }
}