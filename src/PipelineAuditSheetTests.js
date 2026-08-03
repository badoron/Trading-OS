/**
 * Trading OS - Pipeline Audit Sheet Tests
 *
 * Verifies that pipeline audit records use a dedicated
 * PIPELINE_AUDIT sheet and do not write to SYNC_LOG.
 *
 * Isolated unit tests:
 * - No real Google Sheets reads
 * - No real Google Sheets writes
 */

function testPipelineAuditSheetUnitTests() {
  const tests = [
    {
      name: 'uses dedicated PIPELINE_AUDIT sheet',
      run: function () {
        pipelineAuditSheetAssertEqual_(
          'PIPELINE_AUDIT',
          TOS_PIPELINE_AUDIT_LOGGER.SHEET_NAME,
          'SHEET_NAME'
        );
      }
    },

    {
      name: 'creates audit sheet with the correct headers',
      run: function () {
        const fakeSpreadsheet =
          createFakePipelineAuditSpreadsheet_();

        const sheet =
          TOS_PIPELINE_AUDIT_LOGGER
            .getOrCreateSheet_(fakeSpreadsheet);

        pipelineAuditSheetAssertEqual_(
          'PIPELINE_AUDIT',
          sheet.getName(),
          'sheet name'
        );

        pipelineAuditSheetAssertEqual_(
          1,
          sheet.appendCount(),
          'header rows'
        );

        const headers = sheet.lastRow();

        pipelineAuditSheetAssertEqual_(
          'Timestamp',
          headers[0],
          'Timestamp'
        );

        pipelineAuditSheetAssertEqual_(
          'RunID',
          headers[1],
          'RunID'
        );

        pipelineAuditSheetAssertEqual_(
          'Module',
          headers[2],
          'Module'
        );

        pipelineAuditSheetAssertEqual_(
          'Status',
          headers[3],
          'Status'
        );

        pipelineAuditSheetAssertEqual_(
          'Message',
          headers[4],
          'Message'
        );

        pipelineAuditSheetAssertEqual_(
          'DurationMs',
          headers[5],
          'DurationMs'
        );
      }
    },

    {
      name: 'reuses existing audit sheet without adding another header',
      run: function () {
        const fakeSpreadsheet =
          createFakePipelineAuditSpreadsheet_();

        const firstSheet =
          TOS_PIPELINE_AUDIT_LOGGER
            .getOrCreateSheet_(fakeSpreadsheet);

        const secondSheet =
          TOS_PIPELINE_AUDIT_LOGGER
            .getOrCreateSheet_(fakeSpreadsheet);

        pipelineAuditSheetAssertEqual_(
          firstSheet,
          secondSheet,
          'same sheet'
        );

        pipelineAuditSheetAssertEqual_(
          1,
          firstSheet.appendCount(),
          'header rows'
        );

        pipelineAuditSheetAssertEqual_(
          1,
          fakeSpreadsheet.insertCount(),
          'insert count'
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
      ' pipeline audit sheet test(s) failed:\n' +
      failures.join('\n')
    );
  }

  Logger.log(
    'Pipeline audit sheet tests completed. Passed=' +
    tests.length
  );

  return {
    passed: tests.length,
    failed: 0
  };
}

function createFakePipelineAuditSpreadsheet_() {
  const sheets = {};
  let inserts = 0;

  return {
    getSheetByName: function (name) {
      return sheets[name] || null;
    },

    insertSheet: function (name) {
      inserts++;

      const rows = [];

      const sheet = {
        getName: function () {
          return name;
        },

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

      sheets[name] = sheet;

      return sheet;
    },

    insertCount: function () {
      return inserts;
    }
  };
}

function pipelineAuditSheetAssertEqual_(
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