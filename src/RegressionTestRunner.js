const TOS_REGRESSION_TEST_RUNNER = {
  run() {
    const tests = [
      // Account History
      testAccountHistoryBuilder,
      testAccountHistoryBuilderHandlesMissingValues,
      testAccountHistoryContextBuilderCountsStatuses,
      testAccountHistoryContextBuilderNormalizesStatuses,
      testAccountHistoryContextBuilderHandlesMissingValues,
      testAccountHistoryServiceCreatesSheetAndWritesSnapshot,
      testAccountHistoryServiceReusesExistingSheetAndHeaders,
      testAccountHistoryServiceRepairsMissingHeaders,
      testAccountHistoryServiceRejectsIncompatibleSchema,
      testAccountHistoryServiceRequiresSpreadsheet,
      testAccountHistoryWriterBuildsHeaderAndRow,
      testAccountHistoryWriterUsesStableSheetName,

      // Account and broker snapshot
      testAccountSummaryBuilderUnitTests,
      testBrokerSnapshotServiceUnitTests,
      testIBKRFlexAccountSummaryUnitTests,

      // One-time stabilization migration (pure tests only)
      testStabilizationMigrationUnitTests,

      // Dashboard and Home
      testDashboardBuilderUnitTests,
      testDashboardPartialExitPnLUnitTests,
      testDashboardRendererUnitTests,
      testDashboardServiceUnitTests,
      testHomeAccountSummaryRows,
      testHomeBuilderUnitTests,
      testHomeServiceUnitTests,

      // DDC and pipeline
      testDDCDetectorSnapshotUnitTests,
      testDdcPipelineSafetyUnitTests,
      testOpenPositionGrouperSnapshotUnitTests,
      testTradeGrouperSnapshotUnitTests,
      testTradingOSApplicationUnitTests,
      testTradingOSContextUnitTests,
      testTradingOSPipelineSnapshotUnitTests,
      testCycle5HardeningUnitTests,
      testReleasePreflightUnitTests,
      testDelayedImportRegressionUnitTests,
      testDelayedImportFullExitRegressionUnitTests,
      testMultipleMissedImportsRegressionUnitTests,
      testDelayedImportFullLifecycleReplayRegressionUnitTests,

      // Monitoring and exits
      testExitSynchronizerUnitTests,
      testLegExitSynchronizerUnitTests,
      testLegExitWriterSnapshotUnitTests,
      testLegExitWriterUnitTests,
      testTradeLifecycleMonitorSnapshotUnitTests,
      testTradeLifecycleMonitorUnitTests,
      testResidualPositionClassifierUnitTests,
      testResidualPositionManagerUnitTests,
      testDdcCompletionWithResidualUnitTests,
      testTradeMonitorSnapshotUnitTests,
      

      // Audit
      testPipelineAuditLoggerUnitTests,
      testPipelineAuditSheetUnitTests,

      // Trade finalization
      testTradeFinalizerMappingUnitTests,
      testTradeFinalizerUnitTests,
      testTradeFinalizerWriterUnitTests
    ];

    let passed = 0;
    const failures = [];

    tests.forEach((testFn, index) => {
      const name =
        testFn.name ||
        ('Test #' + (index + 1));

      try {
        Logger.log(
          'RUNNING: ' +
          name
        );

        testFn();

        passed++;

        Logger.log(
          'SUITE PASS: ' +
          name
        );
      } catch (error) {
        failures.push({
          name: name,
          message:
            error && error.message
              ? error.message
              : String(error)
        });

        Logger.log(
          'SUITE FAIL: ' +
          name +
          ' | ' +
          failures[
            failures.length - 1
          ].message
        );
      }
    });

    Logger.log(
      '================================'
    );

    Logger.log(
      'Regression completed.' +
      ' Passed=' +
      passed +
      ' Failed=' +
      failures.length +
      ' Total=' +
      tests.length
    );

    if (failures.length > 0) {
      failures.forEach(failure => {
        Logger.log(
          'FAILED: ' +
          failure.name +
          ' | ' +
          failure.message
        );
      });

      throw new Error(
        'Regression failed. ' +
        failures.length +
        ' suite(s) failed.'
      );
    }

    Logger.log(
      'ALL REGRESSION TESTS PASSED'
    );

    return {
      passed: passed,
      failed: 0,
      total: tests.length
    };
  }
};

function testFullTradingOSRegression() {
  return TOS_REGRESSION_TEST_RUNNER.run();
}