/**
 * Trading OS - Trade Finalizer Tests
 *
 * Isolated tests for finalizing a DDC trade after its final leg closes.
 *
 * These tests do not read or write Google Sheets.
 */

function testTradeFinalizerUnitTests() {
  const tests = [
    {
      name: 'trade remains partial while any leg is open',
      run: function () {
        const legs = [
          {
            legStatus: 'CLOSED',
            realizedPnL: 50,
            commission: -1.5,
            exitDateTime: '20260710;111656'
          },
          {
            legStatus: 'OPEN',
            realizedPnL: '',
            commission: '',
            exitDateTime: ''
          }
        ];

        const result =
          TOS_TRADE_FINALIZER.summarizeTrade_(legs);

        tradeFinalizerAssertEqual_(
          false,
          result.readyToClose,
          'readyToClose'
        );

        tradeFinalizerAssertEqual_(
          'PARTIAL_EXIT',
          result.workflowStatus,
          'workflowStatus'
        );
      }
    },

    {
      name: 'trade closes only when all original legs are closed',
      run: function () {
        const legs = [
          {
            legStatus: 'CLOSED',
            realizedPnL: 50,
            commission: -1.5,
            exitDateTime: '20260710;111656'
          },
          {
            legStatus: 'CLOSED',
            realizedPnL: -10,
            commission: -1.5,
            exitDateTime: '20260713;162000'
          }
        ];

        const result =
          TOS_TRADE_FINALIZER.summarizeTrade_(legs);

        tradeFinalizerAssertEqual_(
          true,
          result.readyToClose,
          'readyToClose'
        );

        tradeFinalizerAssertEqual_(
          'CLOSED',
          result.workflowStatus,
          'workflowStatus'
        );
      }
    },

    {
      name: 'final realized PnL is summed from all legs',
      run: function () {
        const legs = [
          {
            legStatus: 'CLOSED',
            realizedPnL: 243.5,
            commission: 0,
            exitDateTime: '20260710;162000'
          },
          {
            legStatus: 'CLOSED',
            realizedPnL: 78.5,
            commission: 0,
            exitDateTime: '20260710;162000'
          },
          {
            legStatus: 'CLOSED',
            realizedPnL: -245.5,
            commission: 0,
            exitDateTime: '20260713;162000'
          },
          {
            legStatus: 'CLOSED',
            realizedPnL: -58.5,
            commission: 0,
            exitDateTime: '20260713;162000'
          }
        ];

        const result =
          TOS_TRADE_FINALIZER.summarizeTrade_(legs);

        tradeFinalizerAssertEqual_(
          18,
          result.realizedPnL,
          'realizedPnL'
        );
      }
    },

    {
      name: 'commission is summed separately and not deducted again',
      run: function () {
        const legs = [
          {
            legStatus: 'CLOSED',
            realizedPnL: 48.5,
            commission: -1.5,
            exitDateTime: '20260710;111656'
          },
          {
            legStatus: 'CLOSED',
            realizedPnL: -19,
            commission: -1.5,
            exitDateTime: '20260710;111656'
          }
        ];

        const result =
          TOS_TRADE_FINALIZER.summarizeTrade_(legs);

        tradeFinalizerAssertEqual_(
          29.5,
          result.realizedPnL,
          'realizedPnL'
        );

        tradeFinalizerAssertEqual_(
          -3,
          result.commission,
          'commission'
        );
      }
    },

    {
      name: 'exit time is taken from the final closed leg',
      run: function () {
        const legs = [
          {
            legStatus: 'CLOSED',
            realizedPnL: 10,
            commission: 0,
            exitDateTime: '20260710;162000'
          },
          {
            legStatus: 'CLOSED',
            realizedPnL: 20,
            commission: 0,
            exitDateTime: '20260713;162000'
          }
        ];

        const result =
          TOS_TRADE_FINALIZER.summarizeTrade_(legs);

        tradeFinalizerAssertEqual_(
          '20260713;162000',
          result.exitDateTime,
          'exitDateTime'
        );
      }
    },

    {
      name: 'empty leg list cannot close a trade',
      run: function () {
        const result =
          TOS_TRADE_FINALIZER.summarizeTrade_([]);

        tradeFinalizerAssertEqual_(
          false,
          result.readyToClose,
          'readyToClose'
        );

        tradeFinalizerAssertEqual_(
          0,
          result.totalLegs,
          'totalLegs'
        );
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

      Logger.log(
        'FAIL: ' +
        test.name +
        ' | ' +
        error.message
      );
    }
  });

  if (failures.length > 0) {
    throw new Error(
      failures.length +
      ' trade finalizer unit test(s) failed:\n' +
      failures.join('\n')
    );
  }

  const result = {
    passed: tests.length,
    failed: 0
  };

  Logger.log(
    'Trade finalizer unit tests completed. Passed=' +
    result.passed
  );

  return result;
}

function tradeFinalizerAssertEqual_(
  expected,
  actual,
  label
) {
  if (expected !== actual) {
    throw new Error(
      label +
      ': expected=' +
      expected +
      ', actual=' +
      actual
    );
  }
}