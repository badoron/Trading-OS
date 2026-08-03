/**
 * Trading OS - Leg Exit Writer Snapshot Tests
 */

const TOS_LEG_EXIT_WRITER_SNAPSHOT_TESTS = {
  run() {
    let passed = 0;

    this.runTest_(
      'exposes snapshot-aware leg exit method',
      function () {
        assertLegExitSnapshotEqual_(
          'function',
          typeof TOS_LEG_EXIT_WRITER
            .syncClosedLegsFromSnapshot_,
          'syncClosedLegsFromSnapshot_ method'
        );
      }
    );

    passed++;

    this.runTest_(
      'legacy method loads broker snapshot',
      function () {
        const originalLoad =
          TOS_BROKER_SNAPSHOT_SERVICE.load;

        const originalSnapshotMethod =
          TOS_LEG_EXIT_WRITER
            .syncClosedLegsFromSnapshot_;

        let loadCalls = 0;

        const expectedSnapshot = {
          trades: []
        };

        try {
          TOS_BROKER_SNAPSHOT_SERVICE.load =
            function () {
              loadCalls++;
              return expectedSnapshot;
            };

          TOS_LEG_EXIT_WRITER
            .syncClosedLegsFromSnapshot_ =
            function () {
              return {
                success: true
              };
            };

          TOS_LEG_EXIT_WRITER
            .syncClosedLegsFromIBKR();

          assertLegExitSnapshotEqual_(
            1,
            loadCalls,
            'broker snapshot load count'
          );
        } finally {
          TOS_BROKER_SNAPSHOT_SERVICE.load =
            originalLoad;

          TOS_LEG_EXIT_WRITER
            .syncClosedLegsFromSnapshot_ =
            originalSnapshotMethod;
        }
      }
    );

    passed++;

    this.runTest_(
      'legacy method delegates supplied snapshot',
      function () {
        const originalLoad =
          TOS_BROKER_SNAPSHOT_SERVICE.load;

        const originalSnapshotMethod =
          TOS_LEG_EXIT_WRITER
            .syncClosedLegsFromSnapshot_;

        const expectedSnapshot = {
          trades: [
            {
              symbol: 'TEST'
            }
          ]
        };

        let receivedSnapshot = null;

        try {
          TOS_BROKER_SNAPSHOT_SERVICE.load =
            function () {
              return expectedSnapshot;
            };

          TOS_LEG_EXIT_WRITER
            .syncClosedLegsFromSnapshot_ =
            function (snapshot) {
              receivedSnapshot = snapshot;

              return {
                success: true
              };
            };

          TOS_LEG_EXIT_WRITER
            .syncClosedLegsFromIBKR();

          assertLegExitSnapshotEqual_(
            expectedSnapshot,
            receivedSnapshot,
            'delegated broker snapshot'
          );
        } finally {
          TOS_BROKER_SNAPSHOT_SERVICE.load =
            originalLoad;

          TOS_LEG_EXIT_WRITER
            .syncClosedLegsFromSnapshot_ =
            originalSnapshotMethod;
        }
      }
    );

    passed++;

    this.runTest_(
  'snapshot method passes snapshot to exit synchronizer',
  function () {
    const originalLoadData =
      TOS_EXIT_SYNCHRONIZER
        .loadDataFromSheets_;

    const originalBuildPreview =
      TOS_EXIT_SYNCHRONIZER
        .buildLegExitPreview_;

    const originalGetTable =
      TOS_EXIT_SYNCHRONIZER
        .getTable_;

    const originalApplyUpdates =
      TOS_LEG_EXIT_WRITER
        .applyUpdates_;

    let receivedSnapshot = null;

    const expectedSnapshot = {
      trades: [
        {
          symbol: 'TEST'
        }
      ]
    };

    try {
      TOS_EXIT_SYNCHRONIZER
        .loadDataFromSheets_ =
        function (snapshot) {
          receivedSnapshot = snapshot;

          return {
            masterTrades: [],
            legsByTradeId: {},
            trades: []
          };
        };

      TOS_EXIT_SYNCHRONIZER
        .buildLegExitPreview_ =
        function () {
          return [];
        };

      TOS_EXIT_SYNCHRONIZER
        .getTable_ =
        function () {
          return {
            headers: []
          };
        };

      TOS_LEG_EXIT_WRITER
        .applyUpdates_ =
        function () {
          return {
            updated: 0,
            skipped: 0,
            writesPerformed: 0
          };
        };

      TOS_LEG_EXIT_WRITER
        .syncClosedLegsFromSnapshot_(
          expectedSnapshot
        );

      assertLegExitSnapshotEqual_(
        expectedSnapshot,
        receivedSnapshot,
        'snapshot passed to loadDataFromSheets_'
      );
    } finally {
      TOS_EXIT_SYNCHRONIZER
        .loadDataFromSheets_ =
        originalLoadData;

      TOS_EXIT_SYNCHRONIZER
        .buildLegExitPreview_ =
        originalBuildPreview;

      TOS_EXIT_SYNCHRONIZER
        .getTable_ =
        originalGetTable;

      TOS_LEG_EXIT_WRITER
        .applyUpdates_ =
        originalApplyUpdates;
    }
  }
);

passed++;

this.runTest_(
  'snapshot data is passed to build leg exit preview',
  function () {
    const originalLoadData =
      TOS_EXIT_SYNCHRONIZER
        .loadDataFromSheets_;

    const originalBuildPreview =
      TOS_EXIT_SYNCHRONIZER
        .buildLegExitPreview_;

    const originalGetTable =
      TOS_EXIT_SYNCHRONIZER
        .getTable_;

    const originalApplyUpdates =
      TOS_LEG_EXIT_WRITER
        .applyUpdates_;

    const expectedMasterTrades = [
      {
        tradeId: 'TRADE-001'
      }
    ];

    const expectedLegsByTradeId = {
      'TRADE-001': [
        {
          brokerContractId: '12345'
        }
      ]
    };

    const expectedTrades = [
      {
        symbol: 'SPY'
      }
    ];

    let receivedMasterTrades = null;
    let receivedLegsByTradeId = null;
    let receivedTrades = null;

    try {
      TOS_EXIT_SYNCHRONIZER
        .loadDataFromSheets_ =
        function () {
          return {
            masterTrades:
              expectedMasterTrades,

            legsByTradeId:
              expectedLegsByTradeId,

            trades:
              expectedTrades
          };
        };

      TOS_EXIT_SYNCHRONIZER
        .buildLegExitPreview_ =
        function (
          masterTrades,
          legsByTradeId,
          trades
        ) {
          receivedMasterTrades =
            masterTrades;

          receivedLegsByTradeId =
            legsByTradeId;

          receivedTrades =
            trades;

          return [];
        };

      TOS_EXIT_SYNCHRONIZER
        .getTable_ =
        function () {
          return {
            headers: []
          };
        };

      TOS_LEG_EXIT_WRITER
        .applyUpdates_ =
        function () {
          return {
            updated: 0,
            skipped: 0,
            writesPerformed: 0
          };
        };

      TOS_LEG_EXIT_WRITER
        .syncClosedLegsFromSnapshot_({
          trades: expectedTrades
        });

      if (
        receivedMasterTrades !==
        expectedMasterTrades
      ) {
        throw new Error(
          'masterTrades was not passed correctly.'
        );
      }

      if (
        receivedLegsByTradeId !==
        expectedLegsByTradeId
      ) {
        throw new Error(
          'legsByTradeId was not passed correctly.'
        );
      }

      if (
        receivedTrades !==
        expectedTrades
      ) {
        throw new Error(
          'trades was not passed correctly.'
        );
      }
    } finally {
      TOS_EXIT_SYNCHRONIZER
        .loadDataFromSheets_ =
        originalLoadData;

      TOS_EXIT_SYNCHRONIZER
        .buildLegExitPreview_ =
        originalBuildPreview;

      TOS_EXIT_SYNCHRONIZER
        .getTable_ =
        originalGetTable;

      TOS_LEG_EXIT_WRITER
        .applyUpdates_ =
        originalApplyUpdates;
    }
  }
);

passed++;



    Logger.log(
      'LegExitWriter snapshot tests completed. ' +
      'Passed=' +
      passed
    );

    return {
      passed: passed
    };
  },

  runTest_(name, testFunction) {
    try {
      testFunction();

      Logger.log(
        'PASS: ' + name
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

function assertLegExitSnapshotEqual_(
  expected,
  actual,
  message
) {
  if (expected !== actual) {
    throw new Error(
      'Assertion failed: ' +
      message +
      '. Expected=' +
      expected +
      ', Actual=' +
      actual
    );
  }
}

function testLegExitWriterSnapshotUnitTests() {
  return TOS_LEG_EXIT_WRITER_SNAPSHOT_TESTS
    .run();
}