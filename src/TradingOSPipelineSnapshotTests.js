/**
 * TradingOSPipeline snapshot integration tests.
 *
 * These tests inspect the pipeline API only.
 * They do not execute the production pipeline
 * and do not write to Google Sheets.
 */

function testTradingOSPipelineSnapshotUnitTests() {
  const tests = [
    {
      name: 'exposes runWithSnapshot method',

      run: function () {
        assertPipelineSnapshotEqual_(
          typeof TOS_DDC_PIPELINE.runWithSnapshot_,
          'function',
          'runWithSnapshot_ method'
        );
      }
    },

    {
      name: 'run loads broker snapshot and delegates execution',

      run: function () {
        const source =
          String(TOS_DDC_PIPELINE.run);

        assertPipelineSnapshotIncludes_(
          source,
          'TOS_BROKER_SNAPSHOT_SERVICE',
          'run must use BrokerSnapshotService'
        );

        assertPipelineSnapshotIncludes_(
          source,
          'runWithSnapshot_',
          'run must delegate to runWithSnapshot_'
        );
      }
    },
{
  name: 'pipeline passes snapshot to Trade Monitor',

  run: function () {
    const source =
      normalizePipelineSnapshotSource_(
        TOS_DDC_PIPELINE.runWithSnapshot_
      );

    assertPipelineSnapshotIncludes_(
      source,
      'updateOpenLegsFromSnapshot_(snapshot)',
      'pipeline must pass snapshot to Trade Monitor'
    );

    assertPipelineSnapshotExcludes_(
      source,
      'updateOpenLegsFromIBKR()',
      'pipeline must not call legacy Trade Monitor method'
    );
  }
},

{
  name: 'pipeline passes snapshot to Lifecycle Monitor',

  run: function () {
    const source =
      normalizePipelineSnapshotSource_(
        TOS_DDC_PIPELINE.runWithSnapshot_
      );

    assertPipelineSnapshotIncludes_(
      source,
      'syncLifecycleFromSnapshot_(snapshot)',
      'pipeline must pass snapshot to Lifecycle Monitor'
    );

    assertPipelineSnapshotExcludes_(
      source,
      'syncLifecycleFromOpenPositions()',
      'pipeline must not call legacy Lifecycle Monitor method'
    );
  }
},

    
    {
      name: 'pipeline passes the same snapshot to Leg Exit Writer',

      run: function () {
        const source =
          normalizePipelineSnapshotSource_(
            TOS_DDC_PIPELINE.runWithSnapshot_
          );

        assertPipelineSnapshotIncludes_(
          source,
          'syncClosedLegsFromSnapshot_(snapshot)',
          'pipeline must pass snapshot to Leg Exit Writer'
        );

        assertPipelineSnapshotExcludes_(
          source,
          'syncClosedLegsFromIBKR()',
          'pipeline must not reload the broker snapshot during leg exit sync'
        );
      }
    },

    {
      name: 'runWithSnapshot passes snapshot to safety validation',

      run: function () {
        const source =
          normalizePipelineSnapshotSource_(
            TOS_DDC_PIPELINE.runWithSnapshot_
          );

        assertPipelineSnapshotIncludes_(
          source,
          'validateSnapshotBeforeWrites_(snapshot)',
          'runWithSnapshot_ must pass snapshot to safety validation'
        );
      }
    },

    {
      name: 'safety validation consumes supplied snapshot',

      run: function () {
        const source =
          normalizePipelineSnapshotSource_(
            TOS_DDC_PIPELINE
              .validateSnapshotBeforeWrites_
          );

        assertPipelineSnapshotIncludes_(
          source,
          'validateSnapshotBeforeWrites_(snapshot)',
          'safety method must accept snapshot'
        );

        assertPipelineSnapshotIncludes_(
          source,
          'snapshot.openPositions',
          'safety method must use snapshot open positions'
        );
      }
    },

    {
      name: 'safety validation no longer reloads IBKR XML',

      run: function () {
        const source =
          String(
            TOS_DDC_PIPELINE
              .validateSnapshotBeforeWrites_
          );

        assertPipelineSnapshotExcludes_(
          source,
          'TOS_IBKR_FLEX.getLastXml',
          'safety validation must not reload XML'
        );

        assertPipelineSnapshotExcludes_(
          source,
          'TOS_IBKR_FLEX_PARSER.parse',
          'safety validation must not parse XML'
        );
      }
    }
  ];

  let passed = 0;

  tests.forEach(function (test) {
    test.run();

    passed++;

    Logger.log(
      'PASS: ' + test.name
    );
  });

  Logger.log(
    'TradingOSPipeline snapshot tests completed. Passed=' +
      passed
  );
}

function normalizePipelineSnapshotSource_(
  value
) {
  return String(value)
    .replace(/\s+/g, '');
}

function assertPipelineSnapshotEqual_(
  actual,
  expected,
  label
) {
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

function assertPipelineSnapshotIncludes_(
  actual,
  expectedText,
  label
) {
  if (
    String(actual).indexOf(
      expectedText
    ) === -1
  ) {
    throw new Error(
      'Assertion failed: ' +
        label +
        '. Missing=' +
        expectedText
    );
  }
}

function assertPipelineSnapshotExcludes_(
  actual,
  forbiddenText,
  label
) {
  if (
    String(actual).indexOf(
      forbiddenText
    ) !== -1
  ) {
    throw new Error(
      'Assertion failed: ' +
        label +
        '. Forbidden=' +
        forbiddenText
    );
  }
}