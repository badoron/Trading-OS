/**
 * Trading OS - IBKR Flex Account Summary Tests
 *
 * Unit tests for parsing:
 * EquitySummaryInBase
 * → EquitySummaryByReportDateInBase
 *
 * No Google Sheets reads.
 * No Google Sheets writes.
 * No IBKR network calls.
 */

function testIBKRFlexAccountSummaryUnitTests() {
  const tests = [
    {
      name: 'parses one equity summary record',
      run: function () {
        const xml = [
          '<FlexQueryResponse>',
          '  <FlexStatements count="1">',
          '    <FlexStatement accountId="U3511632">',
          '      <EquitySummaryInBase>',
          '        <EquitySummaryByReportDateInBase',
          '          accountId="U3511632"',
          '          currency="USD"',
          '          reportDate="20260715"',
          '          cash="2449.821207959"',
          '          cashLong="5850.425"',
          '          cashShort="-3400.603792041"',
          '          stock="0"',
          '          options="-70.18"',
          '          optionsLong="111.62"',
          '          optionsShort="-181.8"',
          '          total="2361.201207959"',
          '          totalLong="5962.045"',
          '          totalShort="-3600.843792041"',
          '        />',
          '      </EquitySummaryInBase>',
          '    </FlexStatement>',
          '  </FlexStatements>',
          '</FlexQueryResponse>'
        ].join('');

        const result =
          TOS_IBKR_FLEX_PARSER
            .parseEquitySummaryFromXml_(xml);

        ibkrAccountAssertEqual_(
          1,
          result.length,
          'record count'
        );

        ibkrAccountAssertEqual_(
          'U3511632',
          result[0].accountId,
          'accountId'
        );

        ibkrAccountAssertEqual_(
          'USD',
          result[0].currency,
          'currency'
        );

        ibkrAccountAssertEqual_(
          '20260715',
          result[0].reportDate,
          'reportDate'
        );

        ibkrAccountAssertEqual_(
          2449.821207959,
          result[0].cash,
          'cash'
        );

        ibkrAccountAssertEqual_(
          -70.18,
          result[0].options,
          'options'
        );

        ibkrAccountAssertEqual_(
          2361.201207959,
          result[0].total,
          'total'
        );
      }
    },

    {
      name: 'parses long and short account components',
      run: function () {
        const xml =
          '<FlexQueryResponse>' +
          '<EquitySummaryInBase>' +
          '<EquitySummaryByReportDateInBase ' +
          'accountId="U1" ' +
          'currency="USD" ' +
          'reportDate="20260715" ' +
          'cashLong="5850.425" ' +
          'cashShort="-3400.603792041" ' +
          'optionsLong="111.62" ' +
          'optionsShort="-181.8" ' +
          'totalLong="5962.045" ' +
          'totalShort="-3600.843792041" ' +
          '/>' +
          '</EquitySummaryInBase>' +
          '</FlexQueryResponse>';

        const result =
          TOS_IBKR_FLEX_PARSER
            .parseEquitySummaryFromXml_(xml);

        ibkrAccountAssertEqual_(
          5850.425,
          result[0].cashLong,
          'cashLong'
        );

        ibkrAccountAssertEqual_(
          -3400.603792041,
          result[0].cashShort,
          'cashShort'
        );

        ibkrAccountAssertEqual_(
          111.62,
          result[0].optionsLong,
          'optionsLong'
        );

        ibkrAccountAssertEqual_(
          -181.8,
          result[0].optionsShort,
          'optionsShort'
        );

        ibkrAccountAssertEqual_(
          5962.045,
          result[0].totalLong,
          'totalLong'
        );

        ibkrAccountAssertEqual_(
          -3600.843792041,
          result[0].totalShort,
          'totalShort'
        );
      }
    },

    {
      name: 'selects latest equity summary by report date',
      run: function () {
        const records = [
          {
            reportDate: '20260713',
            total: 2266.58
          },
          {
            reportDate: '20260715',
            total: 2361.20
          },
          {
            reportDate: '20260714',
            total: 2356.28
          }
        ];

        const result =
          TOS_IBKR_FLEX_PARSER
            .selectLatestEquitySummary_(
              records
            );

        ibkrAccountAssertEqual_(
          '20260715',
          result.reportDate,
          'reportDate'
        );

        ibkrAccountAssertEqual_(
          2361.20,
          result.total,
          'total'
        );
      }
    },

    {
      name: 'empty equity summary returns null latest record',
      run: function () {
        const result =
          TOS_IBKR_FLEX_PARSER
            .selectLatestEquitySummary_([]);

        ibkrAccountAssertEqual_(
          null,
          result,
          'latest record'
        );
      }
    },

    {
      name: 'missing numeric attributes default to zero',
      run: function () {
        const xml =
          '<FlexQueryResponse>' +
          '<EquitySummaryInBase>' +
          '<EquitySummaryByReportDateInBase ' +
          'accountId="U1" ' +
          'currency="USD" ' +
          'reportDate="20260715" ' +
          '/>' +
          '</EquitySummaryInBase>' +
          '</FlexQueryResponse>';

        const result =
          TOS_IBKR_FLEX_PARSER
            .parseEquitySummaryFromXml_(xml);

        ibkrAccountAssertEqual_(
          0,
          result[0].cash,
          'cash'
        );

        ibkrAccountAssertEqual_(
          0,
          result[0].options,
          'options'
        );

        ibkrAccountAssertEqual_(
          0,
          result[0].total,
          'total'
        );
      }
    },

    {
      name: 'full parser exposes equity summaries and latest account info',
      run: function () {
        const xml = [
          '<FlexQueryResponse>',
          '  <FlexStatements count="1">',
          '    <FlexStatement accountId="U3511632">',
          '      <Trades />',
          '      <OpenPositions />',
          '      <EquitySummaryInBase>',
          '        <EquitySummaryByReportDateInBase',
          '          accountId="U3511632"',
          '          currency="USD"',
          '          reportDate="20260714"',
          '          cash="2376.47"',
          '          options="-3.05"',
          '          total="2356.28"',
          '        />',
          '        <EquitySummaryByReportDateInBase',
          '          accountId="U3511632"',
          '          currency="USD"',
          '          reportDate="20260715"',
          '          cash="2449.82"',
          '          options="-70.18"',
          '          total="2361.20"',
          '        />',
          '      </EquitySummaryInBase>',
          '    </FlexStatement>',
          '  </FlexStatements>',
          '</FlexQueryResponse>'
        ].join('');

        const result =
          TOS_IBKR_FLEX_PARSER.parse(xml);

        ibkrAccountAssertEqual_(
          2,
          result.equitySummaries.length,
          'equitySummaries count'
        );

        ibkrAccountAssertEqual_(
          '20260715',
          result.accountInfo.reportDate,
          'latest reportDate'
        );

        ibkrAccountAssertEqual_(
          2361.20,
          result.accountInfo.netLiquidation,
          'netLiquidation'
        );

        ibkrAccountAssertEqual_(
          2449.82,
          result.accountInfo.totalCashValue,
          'totalCashValue'
        );

        ibkrAccountAssertEqual_(
          -70.18,
          result.accountInfo.optionsValue,
          'optionsValue'
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
      ' IBKR account summary parser test(s) failed:\n' +
      failures.join('\n')
    );
  }

  Logger.log(
    'IBKR account summary parser tests completed. Passed=' +
    tests.length
  );

  return {
    passed: tests.length,
    failed: 0
  };
}

function ibkrAccountAssertEqual_(
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