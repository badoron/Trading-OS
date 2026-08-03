/**
 * Trading OS - Context Tests
 *
 * Isolated unit tests for the shared system context.
 *
 * No real Google Sheets reads.
 * No real Google Sheets writes.
 * No IBKR connection.
 */

function testTradingOSContextUnitTests() {
  const tests = [
    {
      name: 'counts only pending import review rows',
      run: function () {
        const rows = [
          {
            reviewStatus: 'PENDING',
            importDecision: ''
          },
          {
            reviewStatus: 'IMPORTED',
            importDecision: 'IMPORTED'
          },
          {
            reviewStatus: 'PENDING',
            importDecision: ''
          }
        ];

        const result =
          TOS_TRADING_OS_CONTEXT
            .countPendingImports_(rows);

        contextAssertEqual_(
          2,
          result,
          'pending imports'
        );
      }
    },

    {
      name: 'import decision already completed is not pending',
      run: function () {
        const rows = [
          {
            reviewStatus: 'PENDING',
            importDecision: 'IMPORTED'
          },
          {
            reviewStatus: 'IMPORTED',
            importDecision: ''
          }
        ];

        const result =
          TOS_TRADING_OS_CONTEXT
            .countPendingImports_(rows);

        contextAssertEqual_(
          0,
          result,
          'pending imports'
        );
      }
    },

    {
      name: 'finds latest pipeline run by timestamp',
      run: function () {
        const records = [
          {
            timestamp:
              new Date('2026-07-16T08:00:00Z'),
            runId: 'RUN-OLD',
            module: 'Pipeline',
            status: 'SUCCESS',
            durationMs: 30000
          },
          {
            timestamp:
              new Date('2026-07-16T10:00:00Z'),
            runId: 'RUN-NEW',
            module: 'Pipeline',
            status: 'FAILED',
            durationMs: 12000
          },
          {
            timestamp:
              new Date('2026-07-16T10:00:01Z'),
            runId: 'RUN-NEW',
            module: 'Lifecycle',
            status: 'FAILED',
            durationMs: 5000
          }
        ];

        const result =
          TOS_TRADING_OS_CONTEXT
            .findLatestPipelineRun_(records);

        contextAssertEqual_(
          'RUN-NEW',
          result.runId,
          'runId'
        );

        contextAssertEqual_(
          'FAILED',
          result.status,
          'status'
        );

        contextAssertEqual_(
          12000,
          result.durationMs,
          'durationMs'
        );
      }
    },

    {
      name: 'latest pipeline run ignores module step records',
      run: function () {
        const records = [
          {
            timestamp:
              new Date('2026-07-16T11:00:00Z'),
            runId: 'RUN-1',
            module: 'TradeMonitor',
            status: 'SUCCESS'
          },
          {
            timestamp:
              new Date('2026-07-16T10:59:59Z'),
            runId: 'RUN-1',
            module: 'Pipeline',
            status: 'SUCCESS'
          }
        ];

        const result =
          TOS_TRADING_OS_CONTEXT
            .findLatestPipelineRun_(records);

        contextAssertEqual_(
          'Pipeline',
          result.module,
          'module'
        );
      }
    },

    {
      name: 'empty audit history returns unknown pipeline state',
      run: function () {
        const result =
          TOS_TRADING_OS_CONTEXT
            .findLatestPipelineRun_([]);

        contextAssertEqual_(
          '',
          result.runId,
          'runId'
        );

        contextAssertEqual_(
          'UNKNOWN',
          result.status,
          'status'
        );
      }
    },

    {
      name: 'builds shared context from supplied data',
      run: function () {
        const trades = [
          {
            tradeId: 'TRD-1',
            strategyId: 'DDC',
            symbol: 'NFLX',
            workflowStatus: 'OPEN',
            realizedPnL: 0
          }
        ];

        const legs = [
          {
            tradeId: 'TRD-1',
            legStatus: '',
            marketValue: -10,
            unrealizedPnL: 5
          }
        ];

        const importRows = [
          {
            reviewStatus: 'PENDING',
            importDecision: ''
          }
        ];

        const auditRows = [
          {
            timestamp:
              new Date('2026-07-16T10:00:00Z'),
            runId: 'RUN-123',
            module: 'Pipeline',
            status: 'SUCCESS',
            durationMs: 25000
          }
        ];

        const result =
          TOS_TRADING_OS_CONTEXT
            .buildContext_(
              trades,
              legs,
              importRows,
              auditRows
            );

        contextAssertEqual_(
          1,
          result.dashboardModel.trades.open,
          'open trades'
        );

        contextAssertEqual_(
          1,
          result.pendingImports,
          'pending imports'
        );

        contextAssertEqual_(
          'RUN-123',
          result.lastPipeline.runId,
          'runId'
        );

        contextAssertEqual_(
          'SUCCESS',
          result.lastPipeline.status,
          'status'
        );

        contextAssertEqual_(
          1,
          result.dashboardModel.ddcRows.length,
          'ddc rows'
        );
      }
    },

    {
      name: 'context exposes normalized source collections',
      run: function () {
        const trades = [
          {
            tradeId: 'TRD-1'
          }
        ];

        const legs = [
          {
            tradeId: 'TRD-1'
          }
        ];

        const result =
          TOS_TRADING_OS_CONTEXT
            .buildContext_(
              trades,
              legs,
              [],
              []
            );

        contextAssertEqual_(
          trades,
          result.trades,
          'trades reference'
        );

        contextAssertEqual_(
          legs,
          result.legs,
          'legs reference'
        );
      }
    },

    {
      name: 'empty data produces valid context',
      run: function () {
        const result =
          TOS_TRADING_OS_CONTEXT
            .buildContext_(
              [],
              [],
              [],
              []
            );

        contextAssertEqual_(
          0,
          result.dashboardModel.trades.total,
          'total trades'
        );

        contextAssertEqual_(
          0,
          result.pendingImports,
          'pending imports'
        );

        contextAssertEqual_(
          'UNKNOWN',
          result.lastPipeline.status,
          'pipeline status'
        );
      }
    }
  ];

  const failures = [];

  tests.forEach(function (test) {
    try {
      test.run();

      Logger.log(
        'PASS: ' +
        test.name
      );
    } catch (error) {
      failures.push(
        test.name +
        ': ' +
        error.message
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
      ' Trading OS context test(s) failed:\n' +
      failures.join('\n')
    );
  }

  Logger.log(
    'Trading OS context tests completed. Passed=' +
    tests.length
  );

  return {
    passed: tests.length,
    failed: 0
  };
}

function contextAssertEqual_(
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