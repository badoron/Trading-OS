/**
 * BrokerSnapshotService unit tests.
 */

function testBrokerSnapshotServiceUnitTests() {
  const tests = [
    {
      name: 'loads and normalizes broker snapshot',

      run: function () {
        const calls = [];

        const snapshot =
          TOS_BROKER_SNAPSHOT_SERVICE.loadWithDependencies_({
            getLastXml: function () {
              calls.push('xml');
              return '<FlexStatement />';
            },

            parse: function (xml) {
              calls.push('parse');

              assertBrokerSnapshotEqual_(
                xml,
                '<FlexStatement />',
                'xml passed to parser'
              );

              return {
                trades: [{ id: 1 }],
                openPositions: [{ id: 2 }],
                accountInfo: { accountId: 'U1' },
                equitySummaries: [{ reportDate: '2026-07-20' }]
              };
            }
          });

        assertBrokerSnapshotEqual_(
          calls.join('>'),
          'xml>parse',
          'execution order'
        );

        assertBrokerSnapshotEqual_(
          snapshot.trades.length,
          1,
          'trades'
        );

        assertBrokerSnapshotEqual_(
          snapshot.openPositions.length,
          1,
          'positions'
        );

        assertBrokerSnapshotEqual_(
          snapshot.accountInfo.accountId,
          'U1',
          'account'
        );

        assertBrokerSnapshotEqual_(
          snapshot.equitySummaries.length,
          1,
          'equity summaries'
        );
      }
    },

    {
      name: 'throws when xml is missing',

      run: function () {
        let thrown = null;

        try {
          TOS_BROKER_SNAPSHOT_SERVICE.loadWithDependencies_({
            getLastXml: function () {
              return '';
            },

            parse: function () {
              throw new Error('should not parse');
            }
          });
        } catch (error) {
          thrown = error;
        }

        assertBrokerSnapshotEqual_(
          Boolean(thrown),
          true,
          'must throw'
        );
      }
    }
  ];

  let passed = 0;

  tests.forEach(function (test) {
    test.run();
    passed++;
    Logger.log('PASS: ' + test.name);
  });

  Logger.log(
    'BrokerSnapshotService tests completed. Passed=' +
      passed
  );
}

function assertBrokerSnapshotEqual_(actual, expected, label) {
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