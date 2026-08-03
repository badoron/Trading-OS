/**
 * Trading OS - Dashboard Service Tests
 *
 * Isolated unit tests for connecting sheet-table data
 * to DashboardBuilder and DashboardRenderer.
 *
 * No real Google Sheets reads.
 * No real Google Sheets writes.
 * No IBKR connection.
 */

function testDashboardServiceUnitTests() {
  const tests = [
    {
      name: 'normalizes MASTER_TRADES rows',
      run: function () {
        const table = {
          headers: [
            'TradeID',
            'StrategyID',
            'Symbol',
            'WorkflowStatus',
            'EntryDate',
            'ExitDate',
            'RealizedPnL',
            'ExitReason'
          ],

          rows: [
            {
              rowNumber: 5,
              row: [
                'TRD-1',
                'DDC',
                'XSP',
                ' open ',
                '2026-07-02',
                '',
                '18.50',
                ''
              ]
            }
          ]
        };

        const result =
          TOS_DASHBOARD_SERVICE
            .normalizeMasterTrades_(table);

        dashboardServiceAssertEqual_(
          1,
          result.length,
          'row count'
        );

        dashboardServiceAssertEqual_(
          'TRD-1',
          result[0].tradeId,
          'tradeId'
        );

        dashboardServiceAssertEqual_(
          'DDC',
          result[0].strategyId,
          'strategyId'
        );

        dashboardServiceAssertEqual_(
          'OPEN',
          result[0].workflowStatus,
          'workflowStatus'
        );

        dashboardServiceAssertEqual_(
          18.5,
          result[0].realizedPnL,
          'realizedPnL'
        );

        dashboardServiceAssertEqual_(
          5,
          result[0].rowNumber,
          'rowNumber'
        );
      }
    },

    {
      name: 'normalizes TRADE_LEGS rows',
      run: function () {
        const table = {
          headers: [
            'LegID',
            'TradeID',
            'BrokerContractID',
            'Expiration',
            'LongShort',
            'LegStatus',
            'MarketValue',
            'UnrealizedPnL'
          ],

          rows: [
            {
              rowNumber: 7,
              row: [
                'LEG-1',
                'TRD-1',
                '101',
                '20260717',
                ' short ',
                '',
                '-25.50',
                '10.25'
              ]
            }
          ]
        };

        const result =
          TOS_DASHBOARD_SERVICE
            .normalizeTradeLegs_(table);

        dashboardServiceAssertEqual_(
          1,
          result.length,
          'row count'
        );

        dashboardServiceAssertEqual_(
          'LEG-1',
          result[0].legId,
          'legId'
        );

        dashboardServiceAssertEqual_(
          'TRD-1',
          result[0].tradeId,
          'tradeId'
        );

        dashboardServiceAssertEqual_(
          'SHORT',
          result[0].longShort,
          'longShort'
        );

        dashboardServiceAssertEqual_(
          -25.5,
          result[0].marketValue,
          'marketValue'
        );

        dashboardServiceAssertEqual_(
          10.25,
          result[0].unrealizedPnL,
          'unrealizedPnL'
        );
      }
    },

    {
      name: 'groups normalized legs by trade ID',
      run: function () {
        const legs = [
          {
            tradeId: 'TRD-1',
            legId: 'LEG-1'
          },
          {
            tradeId: 'TRD-1',
            legId: 'LEG-2'
          },
          {
            tradeId: 'TRD-2',
            legId: 'LEG-3'
          }
        ];

        const result =
          TOS_DASHBOARD_SERVICE
            .groupLegsByTradeId_(legs);

        dashboardServiceAssertEqual_(
          2,
          result['TRD-1'].length,
          'TRD-1 legs'
        );

        dashboardServiceAssertEqual_(
          1,
          result['TRD-2'].length,
          'TRD-2 legs'
        );
      }
    },

    {
      name: 'builds dashboard model from normalized data',
      run: function () {
        const trades = [
          {
            tradeId: 'TRD-1',
            strategyId: 'DDC',
            symbol: 'XSP',
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

        const result =
          TOS_DASHBOARD_SERVICE
            .buildModel_(
              trades,
              legs
            );

        dashboardServiceAssertEqual_(
          1,
          result.trades.open,
          'open trades'
        );

        dashboardServiceAssertEqual_(
          1,
          result.legs.openLegs,
          'open legs'
        );

        dashboardServiceAssertEqual_(
          5,
          result.legs.unrealizedPnL,
          'unrealizedPnL'
        );

        dashboardServiceAssertEqual_(
          1,
          result.ddcRows.length,
          'ddcRows'
        );
      }
    },

    {
      name: 'refresh passes model to renderer',
      run: function () {
        const fakeRenderer = {
          receivedModel: null,

          render: function (model) {
            this.receivedModel = model;

            return {
              success: true,
              ddcTrades:
                model.ddcRows.length
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
            unrealizedPnL: -5,
            marketValue: -10
          }
        ];

        const result =
          TOS_DASHBOARD_SERVICE
            .refreshFromData_(
              trades,
              legs,
              fakeRenderer
            );

        dashboardServiceAssertEqual_(
          true,
          result.success,
          'success'
        );

        dashboardServiceAssertEqual_(
          1,
          result.ddcTrades,
          'ddcTrades'
        );

        dashboardServiceAssertEqual_(
          'NFLX',
          fakeRenderer
            .receivedModel
            .ddcRows[0]
            .symbol,
          'rendered symbol'
        );
      }
    },

    {
      name: 'empty sheet data produces a valid empty dashboard',
      run: function () {
        const fakeRenderer = {
          render: function (model) {
            return {
              success: true,
              ddcTrades:
                model.ddcRows.length,
              openTrades:
                model.trades.open
            };
          }
        };

        const result =
          TOS_DASHBOARD_SERVICE
            .refreshFromData_(
              [],
              [],
              fakeRenderer
            );

        dashboardServiceAssertEqual_(
          true,
          result.success,
          'success'
        );

        dashboardServiceAssertEqual_(
          0,
          result.ddcTrades,
          'ddcTrades'
        );

        dashboardServiceAssertEqual_(
          0,
          result.openTrades,
          'openTrades'
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
      ' dashboard service test(s) failed:\n' +
      failures.join('\n')
    );
  }

  Logger.log(
    'Dashboard service tests completed. Passed=' +
    tests.length
  );

  return {
    passed: tests.length,
    failed: 0
  };
}

function dashboardServiceAssertEqual_(
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