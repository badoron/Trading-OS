const TOS_TRADE_GROUPER_SNAPSHOT_TESTS = {
  run() {
    let passed = 0;

    this.runTest_(
      'exposes snapshot-aware trade grouping method',
      function () {
        if (
          typeof TOS_TRADE_GROUPER
            .testFromSnapshot_ !==
          'function'
        ) {
          throw new Error(
            'testFromSnapshot_ does not exist.'
          );
        }
      }
    );

    passed++;

this.runTest_(
  'legacy method loads broker snapshot',
  function () {
    const originalLoad =
      TOS_BROKER_SNAPSHOT_SERVICE.load;

    const originalTestFromSnapshot =
      TOS_TRADE_GROUPER.testFromSnapshot_;

    let loadCalled = false;

    try {
      TOS_BROKER_SNAPSHOT_SERVICE.load =
        function () {
          loadCalled = true;

          return {
            trades: []
          };
        };

      TOS_TRADE_GROUPER.testFromSnapshot_ =
        function () {
          return [];
        };

      TOS_TRADE_GROUPER.testFromCachedXml();

      if (!loadCalled) {
        throw new Error(
          'Broker snapshot service was not called.'
        );
      }
    } finally {
      TOS_BROKER_SNAPSHOT_SERVICE.load =
        originalLoad;

      TOS_TRADE_GROUPER.testFromSnapshot_ =
        originalTestFromSnapshot;
    }
  }
);

passed++;

this.runTest_(
  'legacy method delegates supplied snapshot',
  function () {
    const originalLoad =
      TOS_BROKER_SNAPSHOT_SERVICE.load;

    const originalTestFromSnapshot =
      TOS_TRADE_GROUPER.testFromSnapshot_;

    const expectedSnapshot = {
      trades: [
        {
          assetCategory: 'OPT'
        }
      ]
    };

    let receivedSnapshot = null;

    try {
      TOS_BROKER_SNAPSHOT_SERVICE.load =
        function () {
          return expectedSnapshot;
        };

      TOS_TRADE_GROUPER.testFromSnapshot_ =
        function (snapshot) {
          receivedSnapshot = snapshot;
          return [];
        };

      TOS_TRADE_GROUPER.testFromCachedXml();

      if (
        receivedSnapshot !==
        expectedSnapshot
      ) {
        throw new Error(
          'Loaded snapshot was not delegated correctly.'
        );
      }
    } finally {
      TOS_BROKER_SNAPSHOT_SERVICE.load =
        originalLoad;

      TOS_TRADE_GROUPER.testFromSnapshot_ =
        originalTestFromSnapshot;
    }
  }
);

passed++;
this.runTest_(
  'snapshot method uses snapshot trades',
  function () {
    const originalDiagnostics =
      TOS_TRADE_GROUPER.logDiagnostics_;

    const originalGroup =
      TOS_TRADE_GROUPER.groupDdcOpenBatches;

    const expectedTrades = [
      {
        assetCategory: 'OPT',
        symbol: 'SPY'
      },
      {
        assetCategory: 'STK',
        symbol: 'AAPL'
      }
    ];

    let diagnosticsTrades = null;
    let groupedTrades = null;

    try {
      TOS_TRADE_GROUPER.logDiagnostics_ =
        function (trades) {
          diagnosticsTrades = trades;
        };

      TOS_TRADE_GROUPER.groupDdcOpenBatches =
        function (trades) {
          groupedTrades = trades;
          return [];
        };

      TOS_TRADE_GROUPER.testFromSnapshot_({
        trades: expectedTrades
      });

      if (
        diagnosticsTrades !==
        expectedTrades
      ) {
        throw new Error(
          'Snapshot trades were not passed to diagnostics.'
        );
      }

      if (
        groupedTrades !==
        expectedTrades
      ) {
        throw new Error(
          'Snapshot trades were not passed to grouping.'
        );
      }
    } finally {
      TOS_TRADE_GROUPER.logDiagnostics_ =
        originalDiagnostics;

      TOS_TRADE_GROUPER.groupDdcOpenBatches =
        originalGroup;
    }
  }
);

passed++;
    Logger.log(
      'TradeGrouper snapshot tests completed. Passed=' +
      passed
    );
  },

  runTest_(name, testFn) {
    try {
      testFn();

      Logger.log(
        'PASS: ' +
        name
      );
    } catch (error) {
      Logger.log(
        'FAIL: ' +
        name +
        ' | ' +
        error.message
      );

      throw error;
    }
  }
};

function testTradeGrouperSnapshotUnitTests() {
  TOS_TRADE_GROUPER_SNAPSHOT_TESTS.run();
}