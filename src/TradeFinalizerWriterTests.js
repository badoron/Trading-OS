/**
 * Trading OS - Trade Finalizer Writer Tests
 *
 * Isolated tests for updating MASTER_TRADES
 * after the final original DDC leg has closed.
 *
 * These tests use an in-memory fake sheet:
 * - No Google Sheets reads
 * - No Google Sheets writes
 * - No IBKR connection
 */

function testTradeFinalizerWriterUnitTests() {
  const tests = [
    {
      name: 'writes final trade fields when trade is ready to close',
      run: function () {
        const fakeSheet =
          createFakeTradeFinalizerSheet_();

        const headers = [
          'TradeID',
          'WorkflowStatus',
          'ExitDate',
          'RealizedPnL',
          'ExitReason'
        ];

        const updates = [
          {
            rowNumber: 5,
            tradeId: 'TRD-1',
            readyToClose: true,
            workflowStatus: 'CLOSED',
            exitDateTime: '20260713;162000',
            realizedPnL: 125.5,
            commission: -3
          }
        ];

        const result =
          TOS_TRADE_FINALIZER_WRITER.applyUpdates_(
            fakeSheet,
            headers,
            updates
          );

        tradeWriterAssertEqual_(
          1,
          result.updated,
          'updated'
        );

        tradeWriterAssertEqual_(
          0,
          result.skipped,
          'skipped'
        );

        tradeWriterAssertEqual_(
          'CLOSED',
          fakeSheet.valueAt(5, 2),
          'WorkflowStatus'
        );

        tradeWriterAssertEqual_(
          '20260713;162000',
          fakeSheet.valueAt(5, 3),
          'ExitDate'
        );

        tradeWriterAssertEqual_(
          125.5,
          fakeSheet.valueAt(5, 4),
          'RealizedPnL'
        );

        tradeWriterAssertEqual_(
          'All original DDC legs are closed. Final exit synchronization completed.',
          fakeSheet.valueAt(5, 5),
          'ExitReason'
        );
      }
    },

    {
      name: 'does not write a trade that is not ready to close',
      run: function () {
        const fakeSheet =
          createFakeTradeFinalizerSheet_();

        const headers = [
          'TradeID',
          'WorkflowStatus',
          'ExitDate',
          'RealizedPnL',
          'ExitReason'
        ];

        const updates = [
          {
            rowNumber: 8,
            tradeId: 'TRD-PARTIAL',
            readyToClose: false,
            workflowStatus: 'PARTIAL_EXIT',
            exitDateTime: '20260710;162000',
            realizedPnL: 50
          }
        ];

        const result =
          TOS_TRADE_FINALIZER_WRITER.applyUpdates_(
            fakeSheet,
            headers,
            updates
          );

        tradeWriterAssertEqual_(
          0,
          result.updated,
          'updated'
        );

        tradeWriterAssertEqual_(
          1,
          result.skipped,
          'skipped'
        );

        tradeWriterAssertEqual_(
          0,
          fakeSheet.writeCount(),
          'write count'
        );
      }
    },

    {
      name: 'skips update without a valid master row',
      run: function () {
        const fakeSheet =
          createFakeTradeFinalizerSheet_();

        const headers = [
          'TradeID',
          'WorkflowStatus',
          'ExitDate',
          'RealizedPnL',
          'ExitReason'
        ];

        const updates = [
          {
            rowNumber: '',
            tradeId: 'TRD-BAD',
            readyToClose: true,
            workflowStatus: 'CLOSED',
            exitDateTime: '20260713;162000',
            realizedPnL: 10
          }
        ];

        const result =
          TOS_TRADE_FINALIZER_WRITER.applyUpdates_(
            fakeSheet,
            headers,
            updates
          );

        tradeWriterAssertEqual_(
          0,
          result.updated,
          'updated'
        );

        tradeWriterAssertEqual_(
          1,
          result.skipped,
          'skipped'
        );

        tradeWriterAssertEqual_(
          0,
          fakeSheet.writeCount(),
          'write count'
        );
      }
    },

    {
      name: 'missing optional exit reason column does not fail',
      run: function () {
        const fakeSheet =
          createFakeTradeFinalizerSheet_();

        const headers = [
          'TradeID',
          'WorkflowStatus',
          'ExitDate',
          'RealizedPnL'
        ];

        const updates = [
          {
            rowNumber: 10,
            tradeId: 'TRD-NO-REASON',
            readyToClose: true,
            workflowStatus: 'CLOSED',
            exitDateTime: '20260713;162000',
            realizedPnL: 75
          }
        ];

        const result =
          TOS_TRADE_FINALIZER_WRITER.applyUpdates_(
            fakeSheet,
            headers,
            updates
          );

        tradeWriterAssertEqual_(
          1,
          result.updated,
          'updated'
        );

        tradeWriterAssertEqual_(
          3,
          fakeSheet.writeCount(),
          'write count'
        );
      }
    },

    {
      name: 'empty update list performs no writes',
      run: function () {
        const fakeSheet =
          createFakeTradeFinalizerSheet_();

        const headers = [
          'TradeID',
          'WorkflowStatus',
          'ExitDate',
          'RealizedPnL',
          'ExitReason'
        ];

        const result =
          TOS_TRADE_FINALIZER_WRITER.applyUpdates_(
            fakeSheet,
            headers,
            []
          );

        tradeWriterAssertEqual_(
          0,
          result.updated,
          'updated'
        );

        tradeWriterAssertEqual_(
          0,
          result.skipped,
          'skipped'
        );

        tradeWriterAssertEqual_(
          0,
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
      ' trade finalizer writer unit test(s) failed:\n' +
      failures.join('\n')
    );
  }

  Logger.log(
    'Trade finalizer writer unit tests completed. Passed=' +
    tests.length
  );

  return {
    passed: tests.length,
    failed: 0
  };
}

function createFakeTradeFinalizerSheet_() {
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

function tradeWriterAssertEqual_(
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