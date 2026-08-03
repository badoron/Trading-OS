/**
 * Trading OS - Dashboard Builder Tests
 *
 * Isolated tests for HOME and DASHBOARD summary logic.
 *
 * No Google Sheets reads.
 * No Google Sheets writes.
 * No IBKR connection.
 */

function testDashboardBuilderUnitTests() {
  const tests = [
    {
      name: 'summarizes trade workflow statuses',
      run: function () {
        const trades = [
          {
            tradeId: 'TRD-1',
            strategyId: 'DDC',
            symbol: 'XSP',
            workflowStatus: 'OPEN',
            realizedPnL: ''
          },
          {
            tradeId: 'TRD-2',
            strategyId: 'DDC',
            symbol: 'DAL',
            workflowStatus: 'PARTIAL_EXIT',
            realizedPnL: 56.5
          },
          {
            tradeId: 'TRD-3',
            strategyId: 'DDC',
            symbol: 'XSP',
            workflowStatus: 'CLOSED',
            realizedPnL: 18
          }
        ];

        const result =
          TOS_DASHBOARD_BUILDER.summarizeTrades_(
            trades
          );

        dashboardAssertEqual_(
          1,
          result.open,
          'open'
        );

        dashboardAssertEqual_(
          1,
          result.partialExit,
          'partialExit'
        );

        dashboardAssertEqual_(
          1,
          result.closed,
          'closed'
        );

        dashboardAssertEqual_(
          3,
          result.total,
          'total'
        );
      }
    },

    {
      name: 'sums realized PnL from master trades',
      run: function () {
        const trades = [
          {
            workflowStatus: 'CLOSED',
            realizedPnL: 18
          },
          {
            workflowStatus: 'PARTIAL_EXIT',
            realizedPnL: 56.5
          },
          {
            workflowStatus: 'OPEN',
            realizedPnL: ''
          }
        ];

        const result =
          TOS_DASHBOARD_BUILDER.summarizeTrades_(
            trades
          );

        dashboardAssertEqual_(
          74.5,
          result.realizedPnL,
          'realizedPnL'
        );
      }
    },

    {
      name: 'sums unrealized PnL only from open legs',
      run: function () {
        const legs = [
          {
            legStatus: 'OPEN',
            unrealizedPnL: 25.5
          },
          {
            legStatus: '',
            unrealizedPnL: -10
          },
          {
            legStatus: 'CLOSED',
            unrealizedPnL: 100
          }
        ];

        const result =
          TOS_DASHBOARD_BUILDER.summarizeLegs_(
            legs
          );

        dashboardAssertEqual_(
          15.5,
          result.unrealizedPnL,
          'unrealizedPnL'
        );

        dashboardAssertEqual_(
          2,
          result.openLegs,
          'openLegs'
        );

        dashboardAssertEqual_(
          1,
          result.closedLegs,
          'closedLegs'
        );
      }
    },

    {
      name: 'builds one strategy row per DDC trade',
      run: function () {
        const trades = [
          {
            tradeId: 'TRD-XSP',
            strategyId: 'DDC',
            symbol: 'XSP',
            workflowStatus: 'OPEN',
            entryDate: '2026-07-02',
            realizedPnL: 0
          },
          {
            tradeId: 'TRD-DAL',
            strategyId: 'DDC',
            symbol: 'DAL',
            workflowStatus: 'PARTIAL_EXIT',
            entryDate: '2026-07-09',
            realizedPnL: 56.5
          },
          {
            tradeId: 'TRD-OTHER',
            strategyId: 'OTV',
            symbol: 'SPY',
            workflowStatus: 'OPEN',
            entryDate: '2026-07-10',
            realizedPnL: 0
          }
        ];

        const legsByTradeId = {
          'TRD-XSP': [
            {
              legStatus: 'OPEN',
              unrealizedPnL: 20
            },
            {
              legStatus: 'OPEN',
              unrealizedPnL: -5
            }
          ],

          'TRD-DAL': [
            {
              legStatus: 'CLOSED',
              unrealizedPnL: 0
            },
            {
              legStatus: 'OPEN',
              unrealizedPnL: 1
            }
          ]
        };

        const result =
          TOS_DASHBOARD_BUILDER
            .buildStrategyRows_(
              trades,
              legsByTradeId,
              'DDC'
            );

        dashboardAssertEqual_(
          2,
          result.length,
          'row count'
        );

        dashboardAssertEqual_(
          'XSP',
          result[0].symbol,
          'first symbol'
        );

        dashboardAssertEqual_(
          2,
          result[0].openLegs,
          'XSP open legs'
        );

        dashboardAssertEqual_(
          15,
          result[0].unrealizedPnL,
          'XSP unrealizedPnL'
        );

        dashboardAssertEqual_(
          1,
          result[1].openLegs,
          'DAL open legs'
        );

        dashboardAssertEqual_(
          1,
          result[1].closedLegs,
          'DAL closed legs'
        );
      }
    },

    {
      name: 'navigation contains the required daily sheets',
      run: function () {
        const navigation =
          TOS_DASHBOARD_BUILDER
            .getNavigationItems_();

        const names =
          navigation.map(function (item) {
            return item.sheetName;
          });

        [
          'DASHBOARD',
          'IMPORT_REVIEW',
          'MASTER_TRADES',
          'TRADE_LEGS',
          'PIPELINE_AUDIT',
          'SYNC_LOG'
        ].forEach(function (sheetName) {
          dashboardAssertEqual_(
            true,
            names.indexOf(sheetName) !== -1,
            'navigation ' + sheetName
          );
        });
      }
    },

    {
      name: 'blank and numeric values are normalized safely',
      run: function () {
        dashboardAssertEqual_(
          0,
          TOS_DASHBOARD_BUILDER.number_(''),
          'blank number'
        );

        dashboardAssertEqual_(
          1234.5,
          TOS_DASHBOARD_BUILDER.number_(
            '1,234.50'
          ),
          'formatted number'
        );

        dashboardAssertEqual_(
          'OPEN',
          TOS_DASHBOARD_BUILDER
            .text_(' open ')
            .toUpperCase(),
          'normalized text'
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
      ' dashboard builder test(s) failed:\n' +
      failures.join('\n')
    );
  }

  Logger.log(
    'Dashboard builder tests completed. Passed=' +
    tests.length
  );

  return {
    passed: tests.length,
    failed: 0
  };
}

function dashboardAssertEqual_(
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