function testTradeLifecycleMonitorSnapshotUnitTests() {
  const tests = [

    {
      name: 'exposes snapshot-aware lifecycle method',

      run: function () {
        if (typeof TOS_TRADE_LIFECYCLE_MONITOR.syncLifecycleFromSnapshot_ !== 'function') {
          throw new Error(
            'Assertion failed: syncLifecycleFromSnapshot_ method.'
          );
        }
      }
    },

    {
      name: 'legacy lifecycle method loads broker snapshot',

      run: function () {
        const source =
          TOS_TRADE_LIFECYCLE_MONITOR
            .syncLifecycleFromOpenPositions
            .toString();

        if (source.indexOf('TOS_BROKER_SNAPSHOT_SERVICE.load') < 0) {
          throw new Error(
            'Legacy method must load broker snapshot.'
          );
        }
      }
    },

    {
      name: 'legacy lifecycle method delegates to snapshot method',

      run: function () {
        const source =
          TOS_TRADE_LIFECYCLE_MONITOR
            .syncLifecycleFromOpenPositions
            .toString();

        if (source.indexOf('syncLifecycleFromSnapshot_') < 0) {
          throw new Error(
            'Legacy method must delegate.'
          );
        }
      }
    },

    {
      name: 'snapshot lifecycle uses supplied snapshot',

      run: function () {
        const source =
          TOS_TRADE_LIFECYCLE_MONITOR
            .syncLifecycleFromSnapshot_
            ? TOS_TRADE_LIFECYCLE_MONITOR
                .syncLifecycleFromSnapshot_
                .toString()
            : '';

        if (source.indexOf('snapshot.openPositions') < 0) {
          throw new Error(
            'Snapshot method must use snapshot.openPositions.'
          );
        }

        if (
          source.indexOf('TOS_IBKR_FLEX.getLastXml') >= 0 ||
          source.indexOf('TOS_IBKR_FLEX_PARSER.parse') >= 0
        ) {
          throw new Error(
            'Snapshot method must not reload IBKR XML.'
          );
        }
      }
    }
,
{
  name: 'completed residual lifecycle delegates to residual writer',

  run: function () {
    const source =
      TOS_TRADE_LIFECYCLE_MONITOR
        .syncLifecycleFromSnapshot_
        .toString();

    if (
      source.indexOf(
        'COMPLETED_WITH_RESIDUAL'
      ) < 0
    ) {
      throw new Error(
        'Lifecycle sync must detect COMPLETED_WITH_RESIDUAL.'
      );
    }

    if (
      source.indexOf(
        'TOS_RESIDUAL_POSITION_MANAGER'
      ) < 0
    ) {
      throw new Error(
        'Lifecycle sync must use ResidualPositionManager.'
      );
    }

    if (
      source.indexOf(
        'saveResidualLegs_'
      ) < 0
    ) {
      throw new Error(
        'Lifecycle sync must save residual legs.'
      );
    }

    if (
      source.indexOf(
        'lifecycle.residualLegs'
      ) < 0
    ) {
      throw new Error(
        'Lifecycle sync must pass classified residual legs.'
      );
    }
  }
}
  ];

  let passed = 0;

  tests.forEach(function (test) {
    test.run();
    Logger.log('PASS: ' + test.name);
    passed++;
  });

  Logger.log(
    'TradeLifecycleMonitor snapshot tests completed. Passed=' + passed
  );
}