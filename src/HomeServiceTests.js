/**
 * Trading OS - Home Service Tests
 *
 * Isolated tests for connecting normalized system data
 * to TradingOSContext and HomeBuilder.
 *
 * No real Google Sheets reads.
 * No real Google Sheets writes.
 * No IBKR connection.
 */

function testHomeServiceUnitTests() {
  const tests = [
    {
      name: 'normalizes IMPORT_REVIEW rows',
      run: function () {
        const table = {
          headers: [
            'ReviewID',
            'DetectedGroupID',
            'Decision',
            'ImportDecision',
            'ReviewStatus',
            'CreateOrLinkTradeID'
          ],

          rows: [
            {
              rowNumber: 10,
              row: [
                'REV-1',
                'DDC|NFLX|...',
                'Import',
                '',
                'Pending',
                ''
              ]
            }
          ]
        };

        const result =
          TOS_HOME_SERVICE
            .normalizeImportReview_(table);

        homeServiceAssertEqual_(
          1,
          result.length,
          'row count'
        );

        homeServiceAssertEqual_(
          'REV-1',
          result[0].reviewId,
          'reviewId'
        );

        homeServiceAssertEqual_(
          'IMPORT',
          result[0].decision,
          'decision'
        );

        homeServiceAssertEqual_(
          'PENDING',
          result[0].reviewStatus,
          'reviewStatus'
        );

        homeServiceAssertEqual_(
          10,
          result[0].rowNumber,
          'rowNumber'
        );
      }
    },

    {
      name: 'normalizes PIPELINE_AUDIT rows',
      run: function () {
        const table = {
          headers: [
            'Timestamp',
            'RunID',
            'Module',
            'Status',
            'Message',
            'DurationMs'
          ],

          rows: [
            {
              rowNumber: 5,
              row: [
                new Date(
                  '2026-07-16T10:00:00Z'
                ),
                'RUN-123',
                'Pipeline',
                ' success ',
                'Completed.',
                '25000'
              ]
            }
          ]
        };

        const result =
          TOS_HOME_SERVICE
            .normalizePipelineAudit_(table);

        homeServiceAssertEqual_(
          1,
          result.length,
          'row count'
        );

        homeServiceAssertEqual_(
          'RUN-123',
          result[0].runId,
          'runId'
        );

        homeServiceAssertEqual_(
          'SUCCESS',
          result[0].status,
          'status'
        );

        homeServiceAssertEqual_(
          25000,
          result[0].durationMs,
          'durationMs'
        );
      }
    },

    {
      name: 'builds shared context from normalized collections',
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

        const imports = [
          {
            reviewStatus: 'PENDING',
            importDecision: ''
          }
        ];

        const audit = [
          {
            timestamp:
              new Date(
                '2026-07-16T10:00:00Z'
              ),
            runId: 'RUN-123',
            module: 'Pipeline',
            status: 'SUCCESS',
            durationMs: 25000
          }
        ];

        const result =
          TOS_HOME_SERVICE
            .buildContext_(
              trades,
              legs,
              imports,
              audit
            );

        homeServiceAssertEqual_(
          1,
          result.dashboardModel.trades.open,
          'open trades'
        );

        homeServiceAssertEqual_(
          1,
          result.pendingImports,
          'pending imports'
        );

        homeServiceAssertEqual_(
          'RUN-123',
          result.lastPipeline.runId,
          'runId'
        );
      }
    },

    {
      name: 'refresh passes context data to home builder',
      run: function () {
        const fakeHomeBuilder = {
          receivedModel: null,
          receivedStatus: null,

          render: function (
            model,
            systemStatus
          ) {
            this.receivedModel =
              model;

            this.receivedStatus =
              systemStatus;

            return {
              success: true,
              alerts: 1
            };
          }
        };

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
              new Date(
                '2026-07-16T10:00:00Z'
              ),
            runId: 'RUN-123',
            module: 'Pipeline',
            status: 'SUCCESS',
            durationMs: 25000
          }
        ];

        const result =
          TOS_HOME_SERVICE
            .refreshFromData_(
              trades,
              legs,
              importRows,
              auditRows,
              fakeHomeBuilder
            );

        homeServiceAssertEqual_(
          true,
          result.success,
          'success'
        );

        homeServiceAssertEqual_(
          1,
          fakeHomeBuilder
            .receivedModel
            .trades
            .open,
          'rendered open trades'
        );

        homeServiceAssertEqual_(
          1,
          fakeHomeBuilder
            .receivedStatus
            .pendingImports,
          'rendered pending imports'
        );

        homeServiceAssertEqual_(
          'RUN-123',
          fakeHomeBuilder
            .receivedStatus
            .pipelineRunId,
          'rendered runId'
        );
      }
    },

    {
      name: 'empty data produces a valid HOME refresh',
      run: function () {
        const fakeHomeBuilder = {
          render: function (
            model,
            systemStatus
          ) {
            return {
              success: true,
              openTrades:
                model.trades.open,
              pendingImports:
                systemStatus.pendingImports,
              pipelineStatus:
                systemStatus.pipelineStatus
            };
          }
        };

        const result =
          TOS_HOME_SERVICE
            .refreshFromData_(
              [],
              [],
              [],
              [],
              fakeHomeBuilder
            );

        homeServiceAssertEqual_(
          true,
          result.success,
          'success'
        );

        homeServiceAssertEqual_(
          0,
          result.openTrades,
          'openTrades'
        );

        homeServiceAssertEqual_(
          0,
          result.pendingImports,
          'pendingImports'
        );

        homeServiceAssertEqual_(
          'UNKNOWN',
          result.pipelineStatus,
          'pipelineStatus'
        );
      }
    },

    {
      name: 'number normalization handles formatted values',
      run: function () {
        homeServiceAssertEqual_(
          12345.67,
          TOS_HOME_SERVICE.number_(
            '12,345.67'
          ),
          'formatted number'
        );

        homeServiceAssertEqual_(
          0,
          TOS_HOME_SERVICE.number_(''),
          'blank number'
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
      ' home service test(s) failed:\n' +
      failures.join('\n')
    );
  }

  Logger.log(
    'Home service tests completed. Passed=' +
    tests.length
  );

  return {
    passed: tests.length,
    failed: 0
  };
}

function homeServiceAssertEqual_(
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