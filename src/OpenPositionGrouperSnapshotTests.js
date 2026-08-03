const TOS_OPEN_POSITION_GROUPER_SNAPSHOT_TESTS = {
  run() {
    let passed = 0;

    this.runTest_(
      'exposes snapshot-aware active DDC detection method',
      function () {
        if (
          typeof TOS_OPEN_POSITION_GROUPER
            .detectActiveDdcFromSnapshot_ !==
          'function'
        ) {
          throw new Error(
            'detectActiveDdcFromSnapshot_ does not exist.'
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
      TOS_OPEN_POSITION_GROUPER
        .detectActiveDdcFromSnapshot_;

    let loadCalled = false;

    try {
      TOS_BROKER_SNAPSHOT_SERVICE.load =
        function () {
          loadCalled = true;

          return {
            openPositions: []
          };
        };

      TOS_OPEN_POSITION_GROUPER
        .detectActiveDdcFromSnapshot_ =
        function () {
          return [];
        };

      TOS_OPEN_POSITION_GROUPER
        .detectActiveDdcFromCachedXml();

      if (!loadCalled) {
        throw new Error(
          'Broker snapshot service was not called.'
        );
      }
    } finally {
      TOS_BROKER_SNAPSHOT_SERVICE.load =
        originalLoad;

      TOS_OPEN_POSITION_GROUPER
        .detectActiveDdcFromSnapshot_ =
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
      TOS_OPEN_POSITION_GROUPER
        .detectActiveDdcFromSnapshot_;

    const expectedSnapshot = {
      openPositions: [
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

      TOS_OPEN_POSITION_GROUPER
        .detectActiveDdcFromSnapshot_ =
        function (snapshot) {
          receivedSnapshot = snapshot;
          return [];
        };

      TOS_OPEN_POSITION_GROUPER
        .detectActiveDdcFromCachedXml();

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

      TOS_OPEN_POSITION_GROUPER
        .detectActiveDdcFromSnapshot_ =
        originalDetectFromSnapshot;
    }
  }
);

passed++;

this.runTest_(
  'snapshot method uses open option positions',
  function () {
    const originalGroupBy =
      TOS_OPEN_POSITION_GROUPER.groupBy_;

    const originalDetectForSymbol =
      TOS_OPEN_POSITION_GROUPER
        .detectDdcForSymbol_;

    const expectedPositions = [
      {
        assetCategory: 'OPT',
        underlyingSymbol: 'SPY'
      },
      {
        assetCategory: 'STK',
        symbol: 'AAPL'
      }
    ];

    let receivedPositions = null;

    try {
      TOS_OPEN_POSITION_GROUPER.groupBy_ =
        function (positions) {
          receivedPositions = positions;

          return {};
        };

      TOS_OPEN_POSITION_GROUPER
        .detectDdcForSymbol_ =
        function () {
          return [];
        };

      TOS_OPEN_POSITION_GROUPER
        .detectActiveDdcFromSnapshot_({
          openPositions: expectedPositions
        });

      if (!receivedPositions) {
        throw new Error(
          'Open positions were not passed to grouping.'
        );
      }

      if (receivedPositions.length !== 1) {
        throw new Error(
          'Expected exactly one option position.'
        );
      }

      if (
        receivedPositions[0] !==
        expectedPositions[0]
      ) {
        throw new Error(
          'Snapshot option position was not passed correctly.'
        );
      }
    } finally {
      TOS_OPEN_POSITION_GROUPER.groupBy_ =
        originalGroupBy;

      TOS_OPEN_POSITION_GROUPER
        .detectDdcForSymbol_ =
        originalDetectForSymbol;
    }
  }
);

passed++;
    Logger.log(
      'OpenPositionGrouper snapshot tests completed. Passed=' +
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

function testOpenPositionGrouperSnapshotUnitTests() {
  TOS_OPEN_POSITION_GROUPER_SNAPSHOT_TESTS.run();
}