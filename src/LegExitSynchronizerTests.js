/**
 * Trading OS - Leg Exit Synchronizer Tests
 *
 * Tests incremental DDC leg synchronization.
 *
 * These tests are isolated:
 * - No Google Sheets reads
 * - No Google Sheets writes
 * - No IBKR connection
 */

function testLegExitSynchronizerUnitTests() {
  const tests = [
    {
      name: 'IBKR expiration BookTrade closes a short leg',
      run: function () {
        const leg = {
          rowNumber: 10,
          tradeId: 'TRD-1',
          brokerContractId: '880339995',
          longShort: 'SHORT',
          quantity: '-1',
          legStatus: 'OPEN'
        };

        const trades = [
          {
            conid: '880339995',
            buySell: 'BUY',
            quantity: '1',
            openCloseIndicator: 'C',
            transactionType: 'BookTrade',
            tradePrice: '0',
            netCash: '0',
            ibCommission: '0',
            notes: 'Ep',
            dateTime: '20260710;162000'
          }
        ];

        const result =
          TOS_EXIT_SYNCHRONIZER.buildLegExitUpdate_(
            leg,
            trades
          );

        legExitAssertEqual_(true, result.matched, 'matched');
        legExitAssertEqual_(
          'CLOSED',
          result.legStatus,
          'legStatus'
        );
        legExitAssertEqual_(
          0,
          result.exitPrice,
          'exitPrice'
        );
        legExitAssertEqual_(
          '20260710;162000',
          result.exitDateTime,
          'exitDateTime'
        );
        legExitAssertEqual_(
          'EXPIRATION',
          result.exitType,
          'exitType'
        );
      }
    },

    {
      name: 'partial-exit DDC trade is included in leg preview',
      run: function () {
        const masterTrades = [
          {
            tradeId: 'TRD-PARTIAL',
            strategyId: 'DDC',
            workflowStatus: 'PARTIAL_EXIT'
          }
        ];

        const legsByTradeId = {
          'TRD-PARTIAL': [
            {
              rowNumber: 20,
              tradeId: 'TRD-PARTIAL',
              brokerContractId: '880340967',
              longShort: 'SHORT',
              quantity: '-1',
              legStatus: 'OPEN'
            },
            {
              rowNumber: 21,
              tradeId: 'TRD-PARTIAL',
              brokerContractId: 'LONG-STILL-OPEN',
              longShort: 'LONG',
              quantity: '1',
              legStatus: 'OPEN'
            }
          ]
        };

        const trades = [
          {
            conid: '880340967',
            buySell: 'BUY',
            quantity: '1',
            openCloseIndicator: 'C',
            transactionType: 'BookTrade',
            tradePrice: '0',
            netCash: '0',
            ibCommission: '0',
            notes: 'Ep',
            dateTime: '20260710;162000'
          }
        ];

        const result =
          TOS_EXIT_SYNCHRONIZER.buildLegExitPreview_(
            masterTrades,
            legsByTradeId,
            trades
          );

        legExitAssertEqual_(1, result.length, 'update count');
        legExitAssertEqual_(
          'TRD-PARTIAL',
          result[0].tradeId,
          'tradeId'
        );
        legExitAssertEqual_(
          '880340967',
          result[0].brokerContractId,
          'brokerContractId'
        );
      }
    },

    {
      name: 'preview returns only legs with closing executions',
      run: function () {
        const masterTrades = [
          {
            tradeId: 'TRD-2',
            strategyId: 'DDC',
            workflowStatus: 'PARTIAL_EXIT'
          }
        ];

        const legsByTradeId = {
          'TRD-2': [
            {
              rowNumber: 30,
              tradeId: 'TRD-2',
              brokerContractId: 'SHORT-CLOSED',
              longShort: 'SHORT',
              quantity: '-1',
              legStatus: 'OPEN'
            },
            {
              rowNumber: 31,
              tradeId: 'TRD-2',
              brokerContractId: 'LONG-OPEN',
              longShort: 'LONG',
              quantity: '1',
              legStatus: 'OPEN'
            }
          ]
        };

        const trades = [
          {
            conid: 'SHORT-CLOSED',
            buySell: 'BUY',
            quantity: '1',
            openCloseIndicator: 'C',
            transactionType: 'ExchTrade',
            tradePrice: '0.25',
            netCash: '-26.50',
            ibCommission: '-1.50',
            fifoPnlRealized: '48.50',
            notes: '',
            dateTime: '20260710;111656'
          }
        ];

        const result =
          TOS_EXIT_SYNCHRONIZER.buildLegExitPreview_(
            masterTrades,
            legsByTradeId,
            trades
          );

        legExitAssertEqual_(1, result.length, 'update count');
        legExitAssertEqual_(
          'SHORT-CLOSED',
          result[0].brokerContractId,
          'brokerContractId'
        );
        legExitAssertEqual_(
          0.25,
          result[0].exitPrice,
          'exitPrice'
        );
        legExitAssertEqual_(
          48.50,
          result[0].realizedPnL,
          'realizedPnL'
        );
        legExitAssertEqual_(
          -1.50,
          result[0].commission,
          'commission'
        );
      }
    },

    {
      name: 'already closed leg is not synchronized again',
      run: function () {
        const masterTrades = [
          {
            tradeId: 'TRD-3',
            strategyId: 'DDC',
            workflowStatus: 'PARTIAL_EXIT'
          }
        ];

        const legsByTradeId = {
          'TRD-3': [
            {
              rowNumber: 40,
              tradeId: 'TRD-3',
              brokerContractId: 'ALREADY-CLOSED',
              longShort: 'SHORT',
              quantity: '-1',
              legStatus: 'CLOSED'
            }
          ]
        };

        const trades = [
          {
            conid: 'ALREADY-CLOSED',
            buySell: 'BUY',
            quantity: '1',
            openCloseIndicator: 'C',
            tradePrice: '0',
            notes: 'Ep',
            dateTime: '20260710;162000'
          }
        ];

        const result =
          TOS_EXIT_SYNCHRONIZER.buildLegExitPreview_(
            masterTrades,
            legsByTradeId,
            trades
          );

        legExitAssertEqual_(0, result.length, 'update count');
      }
    },

    {
      name: 'non-DDC trade is excluded from leg preview',
      run: function () {
        const masterTrades = [
          {
            tradeId: 'TRD-OTHER',
            strategyId: 'OTV',
            workflowStatus: 'PARTIAL_EXIT'
          }
        ];

        const legsByTradeId = {
          'TRD-OTHER': [
            {
              rowNumber: 50,
              tradeId: 'TRD-OTHER',
              brokerContractId: '999',
              longShort: 'SHORT',
              quantity: '-1',
              legStatus: 'OPEN'
            }
          ]
        };

        const trades = [
          {
            conid: '999',
            buySell: 'BUY',
            quantity: '1',
            openCloseIndicator: 'C'
          }
        ];

        const result =
          TOS_EXIT_SYNCHRONIZER.buildLegExitPreview_(
            masterTrades,
            legsByTradeId,
            trades
          );

        legExitAssertEqual_(0, result.length, 'update count');
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
      ' leg exit synchronizer unit test(s) failed:\n' +
      failures.join('\n')
    );
  }

  const result = {
    passed: tests.length,
    failed: 0
  };

  Logger.log(
    'Leg exit synchronizer unit tests completed. Passed=' +
    result.passed
  );

  return result;
}

function legExitAssertEqual_(expected, actual, label) {
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