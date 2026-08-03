/**
 * Trading OS - Trade Finalizer Mapping Tests
 *
 * Isolated regression tests for:
 * - Preserving OPEN when no leg has closed
 * - Loading leg-level exit data from TRADE_LEGS
 *
 * No Google Sheets reads or writes.
 */

function testTradeFinalizerMappingUnitTests() {
  const tests = [
    {
      name: 'trade remains OPEN when zero legs are closed',
      run: function () {
        const legs = [
          {
            legStatus: 'OPEN',
            realizedPnL: '',
            commission: '',
            exitDateTime: ''
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

        tradeMappingAssertEqual_(
          false,
          result.readyToClose,
          'readyToClose'
        );

        tradeMappingAssertEqual_(
          'OPEN',
          result.workflowStatus,
          'workflowStatus'
        );

        tradeMappingAssertEqual_(
          0,
          result.closedLegs,
          'closedLegs'
        );

        tradeMappingAssertEqual_(
          2,
          result.openLegs,
          'openLegs'
        );
      }
    },

    {
      name: 'leg normalization includes synchronized exit fields',
      run: function () {
        const table = {
          headers: [
            'TradeID',
            'BrokerContractID',
            'LongShort',
            'Quantity',
            'LegStatus',
            'ExitPrice',
            'ExitDateTime',
            'RealizedPnL',
            'Commission'
          ],

          rows: [
            {
              rowNumber: 5,
              row: [
                'TRD-1',
                '101',
                'SHORT',
                -1,
                'CLOSED',
                0,
                '20260710;162000',
                243.5,
                0
              ]
            }
          ]
        };

        const result =
          TOS_EXIT_SYNCHRONIZER
            .normalizeLegsByTradeId_(table);

        const leg = result['TRD-1'][0];

        tradeMappingAssertEqual_(
          'CLOSED',
          leg.legStatus,
          'legStatus'
        );

        tradeMappingAssertEqual_(
          0,
          leg.exitPrice,
          'exitPrice'
        );

        tradeMappingAssertEqual_(
          '20260710;162000',
          leg.exitDateTime,
          'exitDateTime'
        );

        tradeMappingAssertEqual_(
          243.5,
          leg.realizedPnL,
          'realizedPnL'
        );

        tradeMappingAssertEqual_(
          0,
          leg.commission,
          'commission'
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
      ' trade finalizer mapping test(s) failed:\n' +
      failures.join('\n')
    );
  }

  Logger.log(
    'Trade finalizer mapping tests completed. Passed=' +
    tests.length
  );

  return {
    passed: tests.length,
    failed: 0
  };
}

function tradeMappingAssertEqual_(
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