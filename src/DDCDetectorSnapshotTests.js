const TOS_DDC_DETECTOR_SNAPSHOT_TESTS = {
  run() {
    let passed = 0;

    this.runTest_(
      'exposes snapshot-aware DDC detection method',
      function () {
        if (
          typeof TOS_DDC_DETECTOR
            .detectFromSnapshot_ !==
          'function'
        ) {
          throw new Error(
            'detectFromSnapshot_ does not exist.'
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

    const originalDetectFromSnapshot =
      TOS_DDC_DETECTOR.detectFromSnapshot_;

    let loadCalled = false;

    try {
      TOS_BROKER_SNAPSHOT_SERVICE.load =
        function () {
          loadCalled = true;

          return {
            trades: []
          };
        };

      TOS_DDC_DETECTOR.detectFromSnapshot_ =
        function () {
          return [];
        };

      TOS_DDC_DETECTOR.detectFromCachedXml();

      if (!loadCalled) {
        throw new Error(
          'Broker snapshot service was not called.'
        );
      }
    } finally {
      TOS_BROKER_SNAPSHOT_SERVICE.load =
        originalLoad;

      TOS_DDC_DETECTOR.detectFromSnapshot_ =
        originalDetectFromSnapshot;
    }
  }
);

passed++;

this.runTest_(
  'legacy method delegates supplied snapshot',
  function () {
    const originalLoad =
      TOS_BROKER_SNAPSHOT_SERVICE.load;

    const originalDetectFromSnapshot =
      TOS_DDC_DETECTOR.detectFromSnapshot_;

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

      TOS_DDC_DETECTOR.detectFromSnapshot_ =
        function (snapshot) {
          receivedSnapshot = snapshot;
          return [];
        };

      TOS_DDC_DETECTOR.detectFromCachedXml();

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

      TOS_DDC_DETECTOR.detectFromSnapshot_ =
        originalDetectFromSnapshot;
    }
  }
);

passed++;
this.runTest_(
  'snapshot method uses snapshot trades',
  function () {
    const originalGroup =
      TOS_DDC_DETECTOR
        .groupByUnderlyingExpiry_;

    const expectedTrades = [
      {
        assetCategory: 'OPT',
        underlyingSymbol: 'SPY',
        expiry: '20260724'
      },
      {
        assetCategory: 'STK',
        symbol: 'AAPL'
      }
    ];

    let receivedTrades = null;

    try {
      TOS_DDC_DETECTOR
        .groupByUnderlyingExpiry_ =
        function (trades) {
          receivedTrades = trades;
          return [];
        };

      TOS_DDC_DETECTOR
        .detectFromSnapshot_({
          trades: expectedTrades
        });

      if (!receivedTrades) {
        throw new Error(
          'Option trades were not passed to grouping.'
        );
      }

      if (receivedTrades.length !== 1) {
        throw new Error(
          'Expected exactly one option trade.'
        );
      }

      if (
        receivedTrades[0] !==
        expectedTrades[0]
      ) {
        throw new Error(
          'Snapshot option trade was not passed correctly.'
        );
      }
    } finally {
      TOS_DDC_DETECTOR
        .groupByUnderlyingExpiry_ =
        originalGroup;
    }
  }
);

passed++;
    Logger.log(
      'DDCDetector snapshot tests completed. Passed=' +
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

function testDDCDetectorSnapshotUnitTests() {
  TOS_DDC_DETECTOR_SNAPSHOT_TESTS.run();
}