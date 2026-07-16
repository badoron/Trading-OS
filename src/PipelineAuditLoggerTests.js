/**
 * Trading OS - Pipeline Audit Logger Tests
 *
 * Isolated unit tests for SYNC_LOG audit records.
 *
 * These tests use an in-memory fake sheet:
 * - No Google Sheets reads
 * - No Google Sheets writes
 */

function testPipelineAuditLoggerUnitTests() {
  const tests = [
    {
      name: 'creates a unique pipeline run ID',
      run: function () {
        const runId =
          TOS_PIPELINE_AUDIT_LOGGER.createRunId_(
            new Date('2026-07-13T20:00:00Z'),
            'abc12345'
          );

        pipelineAuditAssertEqual_(
          'RUN-20260713-200000-ABC12345',
          runId,
          'runId'
        );
      }
    },

    {
      name: 'writes a successful module audit row',
      run: function () {
        const fakeSheet =
          createFakePipelineAuditSheet_();

        const record = {
          timestamp:
            new Date('2026-07-13T20:01:00Z'),

          runId:
            'RUN-20260713-200000-ABC12345',

          module:
            'TradeMonitor',

          status:
            'SUCCESS',

          message:
            'Updated=7, Missing=5',

          durationMs:
            14000
        };

        const result =
          TOS_PIPELINE_AUDIT_LOGGER.writeRecord_(
            fakeSheet,
            record
          );

        pipelineAuditAssertEqual_(
          1,
          result.written,
          'written'
        );

        pipelineAuditAssertEqual_(
          1,
          fakeSheet.appendCount(),
          'append count'
        );

        const row = fakeSheet.lastRow();

        pipelineAuditAssertEqual_(
          'RUN-20260713-200000-ABC12345',
          row[1],
          'RunID'
        );

        pipelineAuditAssertEqual_(
          'TradeMonitor',
          row[2],
          'Module'
        );

        pipelineAuditAssertEqual_(
          'SUCCESS',
          row[3],
          'Status'
        );

        pipelineAuditAssertEqual_(
          'Updated=7, Missing=5',
          row[4],
          'Message'
        );

        pipelineAuditAssertEqual_(
          14000,
          row[5],
          'DurationMs'
        );
      }
    },

    {
      name: 'normalizes failed status to uppercase',
      run: function () {
        const fakeSheet =
          createFakePipelineAuditSheet_();

        TOS_PIPELINE_AUDIT_LOGGER.writeRecord_(
          fakeSheet,
          {
            timestamp: new Date(),
            runId: 'RUN-1',
            module: 'Lifecycle',
            status: 'failed',
            message: 'Unsafe snapshot',
            durationMs: 500
          }
        );

        pipelineAuditAssertEqual_(
          'FAILED',
          fakeSheet.lastRow()[3],
          'Status'
        );
      }
    },

    {
      name: 'missing optional values are written safely',
      run: function () {
        const fakeSheet =
          createFakePipelineAuditSheet_();

        TOS_PIPELINE_AUDIT_LOGGER.writeRecord_(
          fakeSheet,
          {
            runId: 'RUN-2',
            module: 'Finalizer',
            status: 'SKIPPED'
          }
        );

        const row = fakeSheet.lastRow();

        pipelineAuditAssertEqual_(
          '',
          row[4],
          'Message'
        );

        pipelineAuditAssertEqual_(
          0,
          row[5],
          'DurationMs'
        );
      }
    },

    {
      name: 'blank run ID or module is rejected',
      run: function () {
        const fakeSheet =
          createFakePipelineAuditSheet_();

        const result =
          TOS_PIPELINE_AUDIT_LOGGER.writeRecord_(
            fakeSheet,
            {
              runId: '',
              module: '',
              status: 'SUCCESS'
            }
          );

        pipelineAuditAssertEqual_(
          0,
          result.written,
          'written'
        );

        pipelineAuditAssertEqual_(
          1,
          result.skipped,
          'skipped'
        );

        pipelineAuditAssertEqual_(
          0,
          fakeSheet.appendCount(),
          'append count'
        );
      }
    },

    {
      name: 'formats standard pipeline result details',
      run: function () {
        const message =
          TOS_PIPELINE_AUDIT_LOGGER
            .formatDetails_({
              updated: 7,
              missing: 5,
              skipped: 2
            });

        pipelineAuditAssertEqual_(
          'Updated=7, Missing=5, Skipped=2',
          message,
          'message'
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
      ' pipeline audit logger test(s) failed:\n' +
      failures.join('\n')
    );
  }

  Logger.log(
    'Pipeline audit logger tests completed. Passed=' +
    tests.length
  );

  return {
    passed: tests.length,
    failed: 0
  };
}

function createFakePipelineAuditSheet_() {
  const rows = [];

  return {
    appendRow: function (row) {
      rows.push(row);
    },

    appendCount: function () {
      return rows.length;
    },

    lastRow: function () {
      return rows.length > 0
        ? rows[rows.length - 1]
        : null;
    }
  };
}

function pipelineAuditAssertEqual_(
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