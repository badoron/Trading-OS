/**
 * Trading OS - Exit Synchronizer Tests
 *
 * Isolated unit tests.
 * These tests do not read or write Google Sheets.
 */

function testExitSynchronizerUnitTests() {
  const tests = [
    {
      name: 'matches closing execution by contract ID',
      run: function () {
        const leg = {
          brokerContractId: '101',
          longShort: 'SHORT',
          quantity: '-1'
        };

        const trades = [
          {
            conid: '101',
            buySell: 'BUY',
            quantity: '1',
            openCloseIndicator: 'C',
            tradePrice: '1.25',
            dateTime: '20260710;153045',
            ibCommission: '-0.65',
            fifoPnlRealized: '73.35'
          }
        ];

        const result =
          TOS_EXIT_SYNCHRONIZER.findClosingTradesForLeg_(
            leg,
            trades
          );

        exitAssertEqual_(1, result.length, 'matched trades');
        exitAssertEqual_(
          '1.25',
          result[0].tradePrice,
          'tradePrice'
        );
      }
    },
    {
      name: 'ignores opening execution for same contract',
      run: function () {
        const leg = {
          brokerContractId: '101',
          longShort: 'SHORT',
          quantity: '-1'
        };

        const trades = [
          {
            conid: '101',
            buySell: 'SELL',
            quantity: '-1',
            openCloseIndicator: 'O',
            tradePrice: '2.00'
          },
          {
            conid: '101',
            buySell: 'BUY',
            quantity: '1',
            openCloseIndicator: 'C',
            tradePrice: '1.25'
          }
        ];

        const result =
          TOS_EXIT_SYNCHRONIZER.findClosingTradesForLeg_(
            leg,
            trades
          );

        exitAssertEqual_(1, result.length, 'matched trades');
        exitAssertEqual_('BUY', result[0].buySell, 'buySell');
      }
    },
    {
      name: 'short leg closes with BUY',
      run: function () {
        const shortLeg = {
          brokerContractId: '201',
          longShort: 'SHORT',
          quantity: '-1'
        };

        const trades = [
          {
            conid: '201',
            buySell: 'SELL',
            quantity: '-1',
            openCloseIndicator: 'C'
          },
          {
            conid: '201',
            buySell: 'BUY',
            quantity: '1',
            openCloseIndicator: 'C'
          }
        ];

        const result =
          TOS_EXIT_SYNCHRONIZER.findClosingTradesForLeg_(
            shortLeg,
            trades
          );

        exitAssertEqual_(1, result.length, 'matched trades');
        exitAssertEqual_('BUY', result[0].buySell, 'buySell');
      }
    },
    {
      name: 'long leg closes with SELL',
      run: function () {
        const longLeg = {
          brokerContractId: '202',
          longShort: 'LONG',
          quantity: '1'
        };

        const trades = [
          {
            conid: '202',
            buySell: 'BUY',
            quantity: '1',
            openCloseIndicator: 'C'
          },
          {
            conid: '202',
            buySell: 'SELL',
            quantity: '-1',
            openCloseIndicator: 'C'
          }
        ];

        const result =
          TOS_EXIT_SYNCHRONIZER.findClosingTradesForLeg_(
            longLeg,
            trades
          );

        exitAssertEqual_(1, result.length, 'matched trades');
        exitAssertEqual_('SELL', result[0].buySell, 'buySell');
      }
    },
    {
      name: 'summarizes a fully closed DDC trade',
      run: function () {
        const legs = [
          {
            brokerContractId: '301',
            longShort: 'SHORT',
            quantity: '-1'
          },
          {
            brokerContractId: '302',
            longShort: 'LONG',
            quantity: '1'
          }
        ];

        const trades = [
          {
            conid: '301',
            buySell: 'BUY',
            quantity: '1',
            openCloseIndicator: 'C',
            tradePrice: '0.40',
            dateTime: '20260710;153000',
            ibCommission: '-0.65',
            fifoPnlRealized: '60.00'
          },
          {
            conid: '302',
            buySell: 'SELL',
            quantity: '-1',
            openCloseIndicator: 'C',
            tradePrice: '0.10',
            dateTime: '20260710;153100',
            ibCommission: '-0.65',
            fifoPnlRealized: '-10.00'
          }
        ];

        const result =
          TOS_EXIT_SYNCHRONIZER.summarizeClosedTrade_(
            legs,
            trades
          );

        exitAssertEqual_(
          true,
          result.fullyMatched,
          'fullyMatched'
        );
        exitAssertEqual_(2, result.matchedLegs, 'matchedLegs');
        exitAssertEqual_(2, result.totalLegs, 'totalLegs');
        exitAssertEqual_(50, result.realizedPnL, 'realizedPnL');
        exitAssertEqual_(-1.30, result.commission, 'commission');
        exitAssertEqual_(
          '20260710;153100',
          result.exitDateTime,
          'exitDateTime'
        );
      }
    },
    {
      name: 'does not close trade when one leg has no closing execution',
      run: function () {
        const legs = [
          {
            brokerContractId: '401',
            longShort: 'SHORT',
            quantity: '-1'
          },
          {
            brokerContractId: '402',
            longShort: 'LONG',
            quantity: '1'
          }
        ];

        const trades = [
          {
            conid: '401',
            buySell: 'BUY',
            quantity: '1',
            openCloseIndicator: 'C',
            fifoPnlRealized: '25'
          }
        ];

        const result =
          TOS_EXIT_SYNCHRONIZER.summarizeClosedTrade_(
            legs,
            trades
          );

        exitAssertEqual_(
          false,
          result.fullyMatched,
          'fullyMatched'
        );
        exitAssertEqual_(1, result.matchedLegs, 'matchedLegs');
        exitAssertEqual_(2, result.totalLegs, 'totalLegs');
      }
    },
    {
      name: 'preview includes only trades pending exit sync',
      run: function () {
        const masterTrades = [
          {
            tradeId: 'TRD-OPEN',
            strategyId: 'DDC',
            workflowStatus: 'OPEN'
          },
          {
            tradeId: 'TRD-PENDING',
            strategyId: 'DDC',
            workflowStatus: 'CLOSED_PENDING_EXIT_SYNC'
          },
          {
            tradeId: 'TRD-CLOSED',
            strategyId: 'DDC',
            workflowStatus: 'CLOSED'
          }
        ];

        const legsByTradeId = {
          'TRD-PENDING': [
            {
              brokerContractId: '501',
              longShort: 'SHORT',
              quantity: '-1'
            }
          ]
        };

        const trades = [
          {
            conid: '501',
            buySell: 'BUY',
            quantity: '1',
            openCloseIndicator: 'C',
            tradePrice: '0.50',
            dateTime: '20260711;154500',
            ibCommission: '-0.65',
            fifoPnlRealized: '40'
          }
        ];

        const result =
          TOS_EXIT_SYNCHRONIZER.buildPreview_(
            masterTrades,
            legsByTradeId,
            trades
          );

        exitAssertEqual_(1, result.length, 'preview count');
        exitAssertEqual_(
          'TRD-PENDING',
          result[0].tradeId,
          'tradeId'
        );
        exitAssertEqual_(
          true,
          result[0].fullyMatched,
          'fullyMatched'
        );
      }
    },
    {
      name: 'preview reports missing legs without closing trade',
      run: function () {
        const masterTrades = [
          {
            tradeId: 'TRD-PENDING',
            strategyId: 'DDC',
            workflowStatus: 'CLOSED_PENDING_EXIT_SYNC'
          }
        ];

        const legsByTradeId = {
          'TRD-PENDING': [
            {
              brokerContractId: '601',
              longShort: 'SHORT',
              quantity: '-1'
            },
            {
              brokerContractId: '602',
              longShort: 'LONG',
              quantity: '1'
            }
          ]
        };

        const trades = [
          {
            conid: '601',
            buySell: 'BUY',
            quantity: '1',
            openCloseIndicator: 'C',
            fifoPnlRealized: '30'
          }
        ];

        const result =
          TOS_EXIT_SYNCHRONIZER.buildPreview_(
            masterTrades,
            legsByTradeId,
            trades
          );

        exitAssertEqual_(1, result.length, 'preview count');
        exitAssertEqual_(
          false,
          result[0].fullyMatched,
          'fullyMatched'
        );
        exitAssertEqual_(
          1,
          result[0].matchedLegs,
          'matchedLegs'
        );
        exitAssertEqual_(
          2,
          result[0].totalLegs,
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
        'FAIL: ' + test.name + ' | ' + error.message
      );
    }
  });

  if (failures.length > 0) {
    throw new Error(
      failures.length +
      ' exit synchronizer unit test(s) failed:\n' +
      failures.join('\n')
    );
  }

  const result = {
    passed: tests.length,
    failed: 0
  };

  Logger.log(
    'Exit synchronizer unit tests completed. Passed=' +
    result.passed
  );

  return result;
}

function exitAssertEqual_(expected, actual, label) {
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