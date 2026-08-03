/**
 * Trading OS - DDC Pipeline Safety Tests
 *
 * Protects active trades from an empty or suspicious
 * IBKR Open Positions snapshot.
 *
 * Isolated unit tests:
 * - No Google Sheets reads
 * - No Google Sheets writes
 * - No IBKR connection
 */

function testDdcPipelineSafetyUnitTests() {
  const tests = [
    {
      name: 'blocks empty open positions when active trades exist',
      run: function () {
        const masterTrades = [
          {
            tradeId: 'TRD-OPEN',
            strategyId: 'DDC',
            workflowStatus: 'OPEN'
          },
          {
            tradeId: 'TRD-PARTIAL',
            strategyId: 'DDC',
            workflowStatus: 'PARTIAL_EXIT'
          }
        ];

        const result =
          TOS_DDC_PIPELINE_SAFETY.validateOpenPositionsSnapshot_(
            masterTrades,
            []
          );

        pipelineSafetyAssertEqual_(
          false,
          result.safeToContinue,
          'safeToContinue'
        );

        pipelineSafetyAssertEqual_(
          'EMPTY_OPEN_POSITIONS_WITH_ACTIVE_TRADES',
          result.reason,
          'reason'
        );

        pipelineSafetyAssertEqual_(
          2,
          result.activeTrades,
          'activeTrades'
        );
      }
    },

    {
      name: 'allows empty open positions when no active trades exist',
      run: function () {
        const masterTrades = [
          {
            tradeId: 'TRD-CLOSED',
            strategyId: 'DDC',
            workflowStatus: 'CLOSED'
          }
        ];

        const result =
          TOS_DDC_PIPELINE_SAFETY.validateOpenPositionsSnapshot_(
            masterTrades,
            []
          );

        pipelineSafetyAssertEqual_(
          true,
          result.safeToContinue,
          'safeToContinue'
        );

        pipelineSafetyAssertEqual_(
          0,
          result.activeTrades,
          'activeTrades'
        );
      }
    },

    {
      name: 'allows snapshot when open positions exist',
      run: function () {
        const masterTrades = [
          {
            tradeId: 'TRD-OPEN',
            strategyId: 'DDC',
            workflowStatus: 'OPEN'
          }
        ];

        const openPositions = [
          {
            conid: '101',
            symbol: 'XSP',
            position: '-1'
          }
        ];

        const result =
          TOS_DDC_PIPELINE_SAFETY.validateOpenPositionsSnapshot_(
            masterTrades,
            openPositions
          );

        pipelineSafetyAssertEqual_(
          true,
          result.safeToContinue,
          'safeToContinue'
        );

        pipelineSafetyAssertEqual_(
          1,
          result.openPositions,
          'openPositions'
        );
      }
    },

    {
      name: 'closed trades do not count as active',
      run: function () {
        const masterTrades = [
          {
            tradeId: 'TRD-CLOSED',
            strategyId: 'DDC',
            workflowStatus: 'CLOSED'
          },
          {
            tradeId: 'TRD-OTHER',
            strategyId: 'OTV',
            workflowStatus: 'OPEN'
          }
        ];

        const result =
          TOS_DDC_PIPELINE_SAFETY.validateOpenPositionsSnapshot_(
            masterTrades,
            []
          );

        pipelineSafetyAssertEqual_(
          true,
          result.safeToContinue,
          'safeToContinue'
        );

        pipelineSafetyAssertEqual_(
          0,
          result.activeTrades,
          'activeTrades'
        );
      }
    },

    {
      name: 'closed pending exit sync counts as active',
      run: function () {
        const masterTrades = [
          {
            tradeId: 'TRD-PENDING',
            strategyId: 'DDC',
            workflowStatus:
              'CLOSED_PENDING_EXIT_SYNC'
          }
        ];

        const result =
          TOS_DDC_PIPELINE_SAFETY.validateOpenPositionsSnapshot_(
            masterTrades,
            []
          );

        pipelineSafetyAssertEqual_(
          false,
          result.safeToContinue,
          'safeToContinue'
        );

        pipelineSafetyAssertEqual_(
          1,
          result.activeTrades,
          'activeTrades'
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
      failures.push(
        test.name + ': ' + error.message
      );

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
      ' DDC pipeline safety test(s) failed:\n' +
      failures.join('\n')
    );
  }

  Logger.log(
    'DDC pipeline safety tests completed. Passed=' +
    tests.length
  );

  return {
    passed: tests.length,
    failed: 0
  };
}

function pipelineSafetyAssertEqual_(
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