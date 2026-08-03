/**
 * Trading OS - Leg Exit Writer Tests
 *
 * Isolated tests for writing synchronized exit data to TRADE_LEGS.
 *
 * These tests use an in-memory fake sheet:
 * - No Google Sheets reads
 * - No Google Sheets writes
 * - No IBKR connection
 */

function testLegExitWriterUnitTests() {
  const tests = [
    {
      name: 'writes all exit fields to the correct leg row',
      run: function () {
        const fakeSheet = createFakeLegExitSheet_();

        const headers = [
          'LegID',
          'TradeID',
          'ExitPrice',
          'LegStatus',
          'ExitDateTime',
          'RealizedPnL',
          'Commission'
        ];

        const updates = [
          {
            rowNumber: 5,
            tradeId: 'TRD-1',
            brokerContractId: '101',
            legStatus: 'CLOSED',
            exitPrice: 0.25,
            exitDateTime: '20260710;111656',
            realizedPnL: 48.5,
            commission: -1.5
          }
        ];

        const result =
          TOS_LEG_EXIT_WRITER.applyUpdates_(
            fakeSheet,
            headers,
            updates
          );

        legWriterAssertEqual_(
          1,
          result.updated,
          'updated'
        );

        legWriterAssertEqual_(
          0,
          result.skipped,
          'skipped'
        );

        legWriterAssertEqual_(
          0.25,
          fakeSheet.valueAt(5, 3),
          'ExitPrice'
        );

        legWriterAssertEqual_(
          'CLOSED',
          fakeSheet.valueAt(5, 4),
          'LegStatus'
        );

        legWriterAssertEqual_(
          '20260710;111656',
          fakeSheet.valueAt(5, 5),
          'ExitDateTime'
        );

        legWriterAssertEqual_(
          48.5,
          fakeSheet.valueAt(5, 6),
          'RealizedPnL'
        );

        legWriterAssertEqual_(
          -1.5,
          fakeSheet.valueAt(5, 7),
          'Commission'
        );
      }
    },

    {
      name: 'writes expiration exit price as numeric zero',
      run: function () {
        const fakeSheet = createFakeLegExitSheet_();

        const headers = [
          'LegID',
          'TradeID',
          'ExitPrice',
          'LegStatus',
          'ExitDateTime',
          'RealizedPnL',
          'Commission'
        ];

        const updates = [
          {
            rowNumber: 8,
            tradeId: 'TRD-EXP',
            brokerContractId: '202',
            legStatus: 'CLOSED',
            exitPrice: 0,
            exitDateTime: '20260710;162000',
            realizedPnL: 243.5,
            commission: 0
          }
        ];

        TOS_LEG_EXIT_WRITER.applyUpdates_(
          fakeSheet,
          headers,
          updates
        );

        legWriterAssertEqual_(
          0,
          fakeSheet.valueAt(8, 3),
          'ExitPrice'
        );

        legWriterAssertEqual_(
          0,
          fakeSheet.valueAt(8, 7),
          'Commission'
        );
      }
    },

    {
      name: 'skips update without a valid sheet row',
      run: function () {
        const fakeSheet = createFakeLegExitSheet_();

        const headers = [
          'LegID',
          'TradeID',
          'ExitPrice',
          'LegStatus',
          'ExitDateTime',
          'RealizedPnL',
          'Commission'
        ];

        const updates = [
          {
            rowNumber: '',
            tradeId: 'TRD-BAD',
            legStatus: 'CLOSED',
            exitPrice: 1,
            exitDateTime: '20260710;120000',
            realizedPnL: 10,
            commission: -1
          }
        ];

        const result =
          TOS_LEG_EXIT_WRITER.applyUpdates_(
            fakeSheet,
            headers,
            updates
          );

        legWriterAssertEqual_(
          0,
          result.updated,
          'updated'
        );

        legWriterAssertEqual_(
          1,
          result.skipped,
          'skipped'
        );

        legWriterAssertEqual_(
          0,
          fakeSheet.writeCount(),
          'write count'
        );
      }
    },

    {
      name: 'empty update list performs no writes',
      run: function () {
        const fakeSheet = createFakeLegExitSheet_();

        const headers = [
          'LegID',
          'TradeID',
          'ExitPrice',
          'LegStatus',
          'ExitDateTime',
          'RealizedPnL',
          'Commission'
        ];

        const result =
          TOS_LEG_EXIT_WRITER.applyUpdates_(
            fakeSheet,
            headers,
            []
          );

        legWriterAssertEqual_(
          0,
          result.updated,
          'updated'
        );

        legWriterAssertEqual_(
          0,
          result.skipped,
          'skipped'
        );

        legWriterAssertEqual_(
          0,
          fakeSheet.writeCount(),
          'write count'
        );
      }
    },

    {
      name: 'missing optional column does not fail the update',
      run: function () {
        const fakeSheet = createFakeLegExitSheet_();

        const headers = [
          'LegID',
          'TradeID',
          'ExitPrice',
          'LegStatus',
          'ExitDateTime',
          'RealizedPnL'
        ];

        const updates = [
          {
            rowNumber: 12,
            tradeId: 'TRD-NO-COMMISSION',
            legStatus: 'CLOSED',
            exitPrice: 0.5,
            exitDateTime: '20260710;130000',
            realizedPnL: 20,
            commission: -1.5
          }
        ];

        const result =
          TOS_LEG_EXIT_WRITER.applyUpdates_(
            fakeSheet,
            headers,
            updates
          );

        legWriterAssertEqual_(
          1,
          result.updated,
          'updated'
        );

        legWriterAssertEqual_(
          0.5,
          fakeSheet.valueAt(12, 3),
          'ExitPrice'
        );

        legWriterAssertEqual_(
          4,
          fakeSheet.writeCount(),
          'write count'
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
      ' leg exit writer unit test(s) failed:\n' +
      failures.join('\n')
    );
  }

  const result = {
    passed: tests.length,
    failed: 0
  };

  Logger.log(
    'Leg exit writer unit tests completed. Passed=' +
    result.passed
  );

  return result;
}

/**
 * Creates a minimal in-memory replacement for a Google Sheet.
 */
function createFakeLegExitSheet_() {
  const values = {};
  let writes = 0;

  return {
    getRange: function (
      rowNumber,
      columnNumber
    ) {
      return {
        setValue: function (value) {
          values[
            rowNumber + ':' + columnNumber
          ] = value;

          writes++;
        }
      };
    },

    valueAt: function (
      rowNumber,
      columnNumber
    ) {
      return values[
        rowNumber + ':' + columnNumber
      ];
    },

    writeCount: function () {
      return writes;
    }
  };
}

function legWriterAssertEqual_(
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