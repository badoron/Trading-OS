/**
 * Trading OS - Cycle 5 Hardening Tests
 *
 * Pure/source-level checks. No spreadsheet writes.
 */
function testCycle5HardeningUnitTests() {
  const tests = [
    {
      name: 'pipeline error factory preserves code and message',
      run: function () {
        const error = TOS_DDC_PIPELINE.createError_(
          TOS_ERROR_CODE.SNAPSHOT_REQUIRED,
          'Snapshot required'
        );

        cycle5AssertEqual_(
          TOS_ERROR_CODE.SNAPSHOT_REQUIRED,
          error.code,
          'pipeline error code'
        );

        cycle5AssertEqual_(
          'Snapshot required',
          error.message,
          'pipeline error message'
        );
      }
    },
    {
      name: 'application missing dependency uses stable error code',
      run: function () {
        let captured = null;

        try {
          TOS_TRADING_OS_APPLICATION.validateDependencies_({});
        } catch (error) {
          captured = error;
        }

        cycle5AssertEqual_(
          TOS_ERROR_CODE.DEPENDENCY_MISSING,
          captured && captured.code,
          'dependency error code'
        );
      }
    },
    {
      name: 'pipeline audit statuses are centralized',
      run: function () {
        cycle5AssertEqual_('STARTED', TOS_PIPELINE_STATUS.STARTED, 'STARTED');
        cycle5AssertEqual_('SUCCESS', TOS_PIPELINE_STATUS.SUCCESS, 'SUCCESS');
        cycle5AssertEqual_('FAILED', TOS_PIPELINE_STATUS.FAILED, 'FAILED');
        cycle5AssertEqual_('SKIPPED', TOS_PIPELINE_STATUS.SKIPPED, 'SKIPPED');
      }
    }
  ];

  tests.forEach(function (test) {
    test.run();
    Logger.log('PASS: ' + test.name);
  });

  return {
    passed: tests.length,
    failed: 0
  };
}

function cycle5AssertEqual_(expected, actual, label) {
  if (expected !== actual) {
    throw new Error(
      'Assertion failed: ' + label +
      '. Expected=' + expected +
      ', Actual=' + actual
    );
  }
}
