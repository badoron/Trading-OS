/**
 * Trading OS - Account Summary Builder Tests
 *
 * Pure unit tests for normalized IBKR account information.
 *
 * No real Google Sheets reads.
 * No real Google Sheets writes.
 * No IBKR connection.
 */

function testAccountSummaryBuilderUnitTests() {
  const tests = [
    {
      name: 'builds account summary from IBKR account values',
      run: function () {
        const accountInfo = {
          accountId: 'U3511632',
          currency: 'USD',
          netLiquidation: '2450.75',
          totalCashValue: '-3401.20',
          buyingPower: '1100',
          excessLiquidity: '1075.50',
          maintenanceMargin: '1300',
          initialMargin: '1425'
        };

        const result =
          TOS_ACCOUNT_SUMMARY_BUILDER
            .buildSummary_(accountInfo);

        accountSummaryAssertEqual_(
          'U3511632',
          result.accountId,
          'accountId'
        );

        accountSummaryAssertEqual_(
          'USD',
          result.currency,
          'currency'
        );

        accountSummaryAssertEqual_(
          2450.75,
          result.netLiquidation,
          'netLiquidation'
        );

        accountSummaryAssertEqual_(
          -3401.2,
          result.cash,
          'cash'
        );

        accountSummaryAssertEqual_(
          1100,
          result.buyingPower,
          'buyingPower'
        );

        accountSummaryAssertEqual_(
          1075.5,
          result.excessLiquidity,
          'excessLiquidity'
        );

        accountSummaryAssertEqual_(
          1300,
          result.maintenanceMargin,
          'maintenanceMargin'
        );

        accountSummaryAssertEqual_(
          1425,
          result.initialMargin,
          'initialMargin'
        );
      }
    },

    {
      name: 'calculates available account percentage',
      run: function () {
        const result =
          TOS_ACCOUNT_SUMMARY_BUILDER
            .buildSummary_({
              netLiquidation: 2500,
              excessLiquidity: 1000
            });

        accountSummaryAssertEqual_(
          40,
          result.excessLiquidityPercent,
          'excessLiquidityPercent'
        );
      }
    },

    {
      name: 'calculates maintenance margin percentage',
      run: function () {
        const result =
          TOS_ACCOUNT_SUMMARY_BUILDER
            .buildSummary_({
              netLiquidation: 2500,
              maintenanceMargin: 1250
            });

        accountSummaryAssertEqual_(
          50,
          result.maintenanceMarginPercent,
          'maintenanceMarginPercent'
        );
      }
    },

    {
      name: 'missing account information returns unavailable summary',
      run: function () {
        const result =
          TOS_ACCOUNT_SUMMARY_BUILDER
            .buildSummary_(null);

        accountSummaryAssertEqual_(
          false,
          result.available,
          'available'
        );

        accountSummaryAssertEqual_(
          0,
          result.netLiquidation,
          'netLiquidation'
        );

        accountSummaryAssertEqual_(
          0,
          result.buyingPower,
          'buyingPower'
        );
      }
    },

    {
      name: 'zero net liquidation avoids division by zero',
      run: function () {
        const result =
          TOS_ACCOUNT_SUMMARY_BUILDER
            .buildSummary_({
              netLiquidation: 0,
              excessLiquidity: 500,
              maintenanceMargin: 100
            });

        accountSummaryAssertEqual_(
          0,
          result.excessLiquidityPercent,
          'excessLiquidityPercent'
        );

        accountSummaryAssertEqual_(
          0,
          result.maintenanceMarginPercent,
          'maintenanceMarginPercent'
        );
      }
    },

    {
      name: 'formatted and blank numbers are normalized safely',
      run: function () {
        accountSummaryAssertEqual_(
          12345.67,
          TOS_ACCOUNT_SUMMARY_BUILDER
            .number_('12,345.67'),
          'formatted number'
        );

        accountSummaryAssertEqual_(
          0,
          TOS_ACCOUNT_SUMMARY_BUILDER
            .number_(''),
          'blank number'
        );
      }
    },

    {
      name: 'summary preserves the source timestamp',
      run: function () {
        const timestamp =
          new Date('2026-07-16T15:00:00Z');

        const result =
          TOS_ACCOUNT_SUMMARY_BUILDER
            .buildSummary_({
              netLiquidation: 2500,
              timestamp: timestamp
            });

        accountSummaryAssertEqual_(
          timestamp,
          result.timestamp,
          'timestamp'
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
      ' account summary builder test(s) failed:\n' +
      failures.join('\n')
    );
  }

  Logger.log(
    'Account summary builder tests completed. Passed=' +
    tests.length
  );

  return {
    passed: tests.length,
    failed: 0
  };
}

function accountSummaryAssertEqual_(
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