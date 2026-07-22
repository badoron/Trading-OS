/**
 * Trading OS - Application Orchestrator Tests
 *
 * Tests the application-level orchestration without performing
 * real spreadsheet writes or calling the production DDC pipeline.
 */

function testTradingOSApplicationUnitTests() {
  const tests = [
    {
      name:
        'runs application services in the expected order',

      run: function () {
        const calls = [];

        const result =
          TOS_TRADING_OS_APPLICATION.runWithDependencies_({
            now: function () {
              return new Date(
                '2026-07-20T10:00:00Z'
              );
            },

            getSpreadsheet: function () {
              calls.push(
                'getSpreadsheet'
              );

              return {
                id: 'spreadsheet'
              };
            },

            loadBrokerSnapshot: function () {
              calls.push(
                'loadBrokerSnapshot'
              );

              return {
                accountInfo: {
                  accountId:
                    'U3511632',

                  netLiquidation:
                    3210
                },

                trades: [
                  {
                    tradeId:
                      'TRD-001'
                  }
                ]
              };
            },

            runDdcPipeline: function () {
              calls.push(
                'runDdcPipeline'
              );

              return {
                success: true,
                runId:
                  'RUN-DDC-001'
              };
            },

            recordAccountHistory:
              function (input) {
                calls.push(
                  'recordAccountHistory'
                );

                assertTradingOSApplicationEqual_(
                  input.spreadsheet.id,
                  'spreadsheet',
                  'history spreadsheet'
                );

                assertTradingOSApplicationEqual_(
                  input.accountInfo.accountId,
                  'U3511632',
                  'history account id'
                );

                assertTradingOSApplicationEqual_(
                  input.trades.length,
                  1,
                  'history trades count'
                );

                assertTradingOSApplicationEqual_(
                  input.runId,
                  'RUN-DDC-001',
                  'history run id'
                );

                return {
                  appended: true
                };
              },

            refreshDashboard: function () {
              calls.push(
                'refreshDashboard'
              );

              return {
                refreshed: true
              };
            },

            refreshHome: function () {
              calls.push(
                'refreshHome'
              );

              return {
                refreshed: true
              };
            }
          });

        assertTradingOSApplicationEqual_(
          calls.join('>'),
          [
            'getSpreadsheet',
            'loadBrokerSnapshot',
            'runDdcPipeline',
            'recordAccountHistory',
            'refreshDashboard',
            'refreshHome'
          ].join('>'),
          'execution order'
        );

        assertTradingOSApplicationEqual_(
          result.success,
          true,
          'application success'
        );

        assertTradingOSApplicationEqual_(
          result.ddcPipeline.runId,
          'RUN-DDC-001',
          'pipeline result'
        );

        assertTradingOSApplicationEqual_(
          result.accountHistory.appended,
          true,
          'history result'
        );

        assertTradingOSApplicationEqual_(
          result.dashboard.refreshed,
          true,
          'dashboard result'
        );

        assertTradingOSApplicationEqual_(
          result.home.refreshed,
          true,
          'home result'
        );
      }
    },

    {
      name:
        'stops when the DDC pipeline fails',

      run: function () {
        const calls = [];

        let thrown = null;

        try {
          TOS_TRADING_OS_APPLICATION
            .runWithDependencies_({
              now: function () {
                return new Date(
                  '2026-07-20T10:00:00Z'
                );
              },

              getSpreadsheet:
                function () {
                  calls.push(
                    'getSpreadsheet'
                  );

                  return {};
                },

              loadBrokerSnapshot:
                function () {
                  calls.push(
                    'loadBrokerSnapshot'
                  );

                  return {
                    accountInfo: {},
                    trades: []
                  };
                },

              runDdcPipeline:
                function () {
                  calls.push(
                    'runDdcPipeline'
                  );

                  throw new Error(
                    'DDC failed'
                  );
                },

              recordAccountHistory:
                function () {
                  calls.push(
                    'recordAccountHistory'
                  );
                },

              refreshDashboard:
                function () {
                  calls.push(
                    'refreshDashboard'
                  );
                },

              refreshHome:
                function () {
                  calls.push(
                    'refreshHome'
                  );
                }
            });
        } catch (error) {
          thrown = error;
        }

        assertTradingOSApplicationEqual_(
          Boolean(thrown),
          true,
          'pipeline failure must throw'
        );

        assertTradingOSApplicationEqual_(
          thrown.message,
          'DDC failed',
          'pipeline failure message'
        );

        assertTradingOSApplicationEqual_(
          calls.join('>'),
          [
            'getSpreadsheet',
            'loadBrokerSnapshot',
            'runDdcPipeline'
          ].join('>'),
          'execution stops after pipeline failure'
        );
      }
    },

    {
      name:
        'continues when account history fails',

      run: function () {
        const calls = [];

        const result =
          TOS_TRADING_OS_APPLICATION
            .runWithDependencies_({
              now: function () {
                return new Date(
                  '2026-07-20T10:00:00Z'
                );
              },

              getSpreadsheet:
                function () {
                  calls.push(
                    'getSpreadsheet'
                  );

                  return {};
                },

              loadBrokerSnapshot:
                function () {
                  calls.push(
                    'loadBrokerSnapshot'
                  );

                  return {
                    accountInfo: {},
                    trades: []
                  };
                },

              runDdcPipeline:
                function () {
                  calls.push(
                    'runDdcPipeline'
                  );

                  return {
                    success: true,
                    runId:
                      'RUN-002'
                  };
                },

              recordAccountHistory:
                function () {
                  calls.push(
                    'recordAccountHistory'
                  );

                  throw new Error(
                    'History failed'
                  );
                },

              refreshDashboard:
                function () {
                  calls.push(
                    'refreshDashboard'
                  );

                  return {
                    refreshed: true
                  };
                },

              refreshHome:
                function () {
                  calls.push(
                    'refreshHome'
                  );

                  return {
                    refreshed: true
                  };
                }
            });

        assertTradingOSApplicationEqual_(
          result.success,
          false,
          'secondary failure marks partial failure'
        );

        assertTradingOSApplicationEqual_(
          result.accountHistory.success,
          false,
          'history failure captured'
        );

        assertTradingOSApplicationEqual_(
          result.accountHistory.error,
          'History failed',
          'history failure message'
        );

        assertTradingOSApplicationEqual_(
          result.dashboard.refreshed,
          true,
          'dashboard still runs'
        );

        assertTradingOSApplicationEqual_(
          result.home.refreshed,
          true,
          'home still runs'
        );

        assertTradingOSApplicationEqual_(
          calls.join('>'),
          [
            'getSpreadsheet',
            'loadBrokerSnapshot',
            'runDdcPipeline',
            'recordAccountHistory',
            'refreshDashboard',
            'refreshHome'
          ].join('>'),
          'secondary failure execution order'
        );
      }
    },

    {
      name:
        'continues when dashboard refresh fails',

      run: function () {
        const result =
          TOS_TRADING_OS_APPLICATION
            .runWithDependencies_({
              now: function () {
                return new Date(
                  '2026-07-20T10:00:00Z'
                );
              },

              getSpreadsheet:
                function () {
                  return {};
                },

              loadBrokerSnapshot:
                function () {
                  return {
                    accountInfo: {},
                    trades: []
                  };
                },

              runDdcPipeline:
                function () {
                  return {
                    success: true,
                    runId:
                      'RUN-003'
                  };
                },

              recordAccountHistory:
                function () {
                  return {
                    appended: true
                  };
                },

              refreshDashboard:
                function () {
                  throw new Error(
                    'Dashboard failed'
                  );
                },

              refreshHome:
                function () {
                  return {
                    refreshed: true
                  };
                }
            });

        assertTradingOSApplicationEqual_(
          result.success,
          false,
          'dashboard failure marks partial failure'
        );

        assertTradingOSApplicationEqual_(
          result.dashboard.success,
          false,
          'dashboard failure captured'
        );

        assertTradingOSApplicationEqual_(
          result.dashboard.error,
          'Dashboard failed',
          'dashboard error message'
        );

        assertTradingOSApplicationEqual_(
          result.home.refreshed,
          true,
          'home still runs'
        );
      }
    },

    {
      name:
        'returns execution timestamps and duration',

      run: function () {
        let callCount = 0;

        const times = [
          new Date(
            '2026-07-20T10:00:00.000Z'
          ),

          new Date(
            '2026-07-20T10:00:02.500Z'
          )
        ];

        const result =
          TOS_TRADING_OS_APPLICATION
            .runWithDependencies_({
              now: function () {
                const value =
                  times[
                    Math.min(
                      callCount,
                      times.length - 1
                    )
                  ];

                callCount += 1;

                return value;
              },

              getSpreadsheet:
                function () {
                  return {};
                },

              loadBrokerSnapshot:
                function () {
                  return {
                    accountInfo: {},
                    trades: []
                  };
                },

              runDdcPipeline:
                function () {
                  return {
                    success: true,
                    runId:
                      'RUN-004'
                  };
                },

              recordAccountHistory:
                function () {
                  return {
                    appended: true
                  };
                },

              refreshDashboard:
                function () {
                  return {
                    refreshed: true
                  };
                },

              refreshHome:
                function () {
                  return {
                    refreshed: true
                  };
                }
            });

        assertTradingOSApplicationEqual_(
          result.startedAt.toISOString(),
          '2026-07-20T10:00:00.000Z',
          'started timestamp'
        );

        assertTradingOSApplicationEqual_(
          result.completedAt.toISOString(),
          '2026-07-20T10:00:02.500Z',
          'completed timestamp'
        );

        assertTradingOSApplicationEqual_(
          result.durationMs,
          2500,
          'duration'
        );
      }
    }
  ];

  let passed = 0;

  tests.forEach(function (test) {
    test.run();

    passed += 1;

    Logger.log(
      'PASS: ' +
      test.name
    );
  });

  Logger.log(
    'Trading OS application tests completed. Passed=' +
    passed
  );
}

function assertTradingOSApplicationEqual_(
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