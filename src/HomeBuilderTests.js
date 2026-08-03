/**
 * Trading OS - Home Builder Tests
 *
 * Isolated tests for the HOME portal.
 *
 * No real Google Sheets reads.
 * No real Google Sheets writes.
 * No IBKR connection.
 */

function testHomeBuilderUnitTests() {
  const tests = [
    {
      name: 'builds navigation rows from dashboard navigation',
      run: function () {
        const navigation = [
          {
            label: 'Dashboard',
            sheetName: 'DASHBOARD',
            description: 'Current status.'
          },
          {
            label: 'Import Review',
            sheetName: 'IMPORT_REVIEW',
            description: 'Review new trades.'
          }
        ];

        const result =
          TOS_HOME_BUILDER.buildNavigationRows_(
            navigation
          );

        homeBuilderAssertEqual_(
          2,
          result.length,
          'row count'
        );

        homeBuilderAssertEqual_(
          'Dashboard',
          result[0][0],
          'first label'
        );

        homeBuilderAssertEqual_(
          'DASHBOARD',
          result[0][1],
          'first sheet'
        );

        homeBuilderAssertEqual_(
          'Current status.',
          result[0][2],
          'first description'
        );
      }
    },

    {
      name: 'builds system status rows',
      run: function () {
        const model = homeBuilderTestModel_();

        const result =
          TOS_HOME_BUILDER.buildStatusRows_(
            model
          );

        homeBuilderAssertEqual_(
          6,
          result.length,
          'row count'
        );

        homeBuilderAssertEqual_(
          'Open Trades',
          result[0][0],
          'first label'
        );

        homeBuilderAssertEqual_(
          4,
          result[0][1],
          'open trades'
        );

        homeBuilderAssertEqual_(
          'Partial Exit',
          result[1][0],
          'partial label'
        );

        homeBuilderAssertEqual_(
          1,
          result[1][1],
          'partial count'
        );

        homeBuilderAssertEqual_(
          'Combined PnL',
          result[4][0],
          'combined label'
        );

        homeBuilderAssertEqual_(
          54,
          result[4][1],
          'combined PnL'
        );
      }
    },

    {
      name: 'builds alerts for partial exits',
      run: function () {
        const model = homeBuilderTestModel_();

        const alerts =
          TOS_HOME_BUILDER.buildAlerts_(
            model,
            {
              pendingImports: 0,
              pipelineStatus: 'SUCCESS'
            }
          );

        homeBuilderAssertEqual_(
          true,
          alerts.some(function (alert) {
            return (
              alert.indexOf(
                'PARTIAL_EXIT'
              ) !== -1
            );
          }),
          'partial exit alert'
        );
      }
    },

    {
      name: 'builds alert for pending imports',
      run: function () {
        const alerts =
          TOS_HOME_BUILDER.buildAlerts_(
            homeBuilderTestModel_(),
            {
              pendingImports: 2,
              pipelineStatus: 'SUCCESS'
            }
          );

        homeBuilderAssertEqual_(
          true,
          alerts.some(function (alert) {
            return (
              alert.indexOf(
                '2 import review item'
              ) !== -1
            );
          }),
          'pending import alert'
        );
      }
    },

    {
      name: 'builds alert for failed pipeline',
      run: function () {
        const alerts =
          TOS_HOME_BUILDER.buildAlerts_(
            homeBuilderTestModel_(),
            {
              pendingImports: 0,
              pipelineStatus: 'FAILED'
            }
          );

        homeBuilderAssertEqual_(
          true,
          alerts.some(function (alert) {
            return (
              alert.indexOf(
                'pipeline failed'
              ) !== -1
            );
          }),
          'pipeline failure alert'
        );
      }
    },

    {
      name: 'healthy system produces positive alert',
      run: function () {
        const model = homeBuilderTestModel_();

        model.trades.partialExit = 0;
        model.trades.closedPendingExitSync = 0;

        const alerts =
          TOS_HOME_BUILDER.buildAlerts_(
            model,
            {
              pendingImports: 0,
              pipelineStatus: 'SUCCESS'
            }
          );

        homeBuilderAssertEqual_(
          1,
          alerts.length,
          'alert count'
        );

        homeBuilderAssertEqual_(
          'No items currently require attention.',
          alerts[0],
          'healthy message'
        );
      }
    },

    {
      name: 'renders the main HOME sections',
      run: function () {
        const fakeSheet =
          createFakeHomeSheet_();

        const result =
          TOS_HOME_BUILDER.renderModel_(
            fakeSheet,
            homeBuilderTestModel_(),
            {
              pendingImports: 2,
              pipelineStatus: 'SUCCESS',
              pipelineRunId: 'RUN-123'
            }
          );

        homeBuilderAssertEqual_(
          true,
          result.success,
          'success'
        );

        homeBuilderAssertEqual_(
          'Trading OS',
          fakeSheet.valueAt(1, 1),
          'title'
        );

        homeBuilderAssertEqual_(
          'System Status',
          fakeSheet.valueAt(5, 1),
          'status title'
        );

        homeBuilderAssertEqual_(
          'Quick Navigation',
          fakeSheet.valueAt(14, 1),
          'navigation title'
        );

        homeBuilderAssertEqual_(
          'Alerts',
          fakeSheet.valueAt(27, 1),
          'alerts title'
        );
      }
    },

    {
      name: 'renderer clears and freezes HOME',
      run: function () {
        const fakeSheet =
          createFakeHomeSheet_();

        TOS_HOME_BUILDER.renderModel_(
          fakeSheet,
          homeBuilderTestModel_(),
          {
            pendingImports: 0,
            pipelineStatus: 'SUCCESS'
          }
        );

        homeBuilderAssertEqual_(
          1,
          fakeSheet.clearCount(),
          'clear count'
        );

        homeBuilderAssertEqual_(
          3,
          fakeSheet.frozenRows(),
          'frozen rows'
        );
      }
    }
  ];

  const failures = [];

  tests.forEach(function (test) {
    try {
      test.run();

      Logger.log(
        'PASS: ' +
        test.name
      );
    } catch (error) {
      failures.push(
        test.name +
        ': ' +
        error.message
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
      ' home builder test(s) failed:\n' +
      failures.join('\n')
    );
  }

  Logger.log(
    'Home builder tests completed. Passed=' +
    tests.length
  );

  return {
    passed: tests.length,
    failed: 0
  };
}

function homeBuilderTestModel_() {
  return {
    generatedAt:
      new Date('2026-07-16T10:00:00Z'),

    trades: {
      total: 6,
      open: 4,
      partialExit: 1,
      closedPendingExitSync: 0,
      closed: 1,
      realizedPnL: 74.5
    },

    legs: {
      openLegs: 17,
      closedLegs: 7,
      unrealizedPnL: -20.5
    },

    combinedPnL: 54,

    navigation: [
      {
        label: 'Dashboard',
        sheetName: 'DASHBOARD',
        description:
          'Current DDC account and strategy status.'
      },
      {
        label: 'Import Review',
        sheetName: 'IMPORT_REVIEW',
        description:
          'Review and approve newly detected trades.'
      },
      {
        label: 'Master Trades',
        sheetName: 'MASTER_TRADES',
        description:
          'One row per Trading OS trade.'
      },
      {
        label: 'Trade Legs',
        sheetName: 'TRADE_LEGS',
        description:
          'Leg-level details.'
      },
      {
        label: 'Pipeline Audit',
        sheetName: 'PIPELINE_AUDIT',
        description:
          'Pipeline execution history.'
      },
      {
        label: 'System Log',
        sheetName: 'SYNC_LOG',
        description:
          'General system log.'
      }
    ]
  };
}

function createFakeHomeSheet_() {
  const values = {};
  let clears = 0;
  let frozen = 0;

  function setValue_(
    rowNumber,
    columnNumber,
    value
  ) {
    values[
      rowNumber + ':' + columnNumber
    ] = value;
  }

  return {
    clear: function () {
      clears++;
    },

    setFrozenRows: function (count) {
      frozen = count;
    },

    getRange: function (
      rowNumber,
      columnNumber,
      numberOfRows,
      numberOfColumns
    ) {
      return {
        setValue: function (value) {
          setValue_(
            rowNumber,
            columnNumber,
            value
          );

          return this;
        },

        setValues: function (rows) {
          rows.forEach(function (
            row,
            rowIndex
          ) {
            row.forEach(function (
              value,
              columnIndex
            ) {
              setValue_(
                rowNumber + rowIndex,
                columnNumber + columnIndex,
                value
              );
            });
          });

          return this;
        },

        merge: function () {
          return this;
        },

        setFontWeight: function () {
          return this;
        },

        setFontSize: function () {
          return this;
        },

        setHorizontalAlignment:
          function () {
            return this;
          },

        setNumberFormat: function () {
          return this;
        },

        setWrap: function () {
          return this;
        },

        setBackground: function () {
          return this;
        },

        setFontColor: function () {
          return this;
        },

        setBorder: function () {
          return this;
        }
      };
    },

    autoResizeColumns: function () {
      return;
    },

    setColumnWidth: function () {
      return;
    },

    valueAt: function (
      rowNumber,
      columnNumber
    ) {
      return values[
        rowNumber + ':' + columnNumber
      ];
    },

    clearCount: function () {
      return clears;
    },

    frozenRows: function () {
      return frozen;
    }
  };
}

function homeBuilderAssertEqual_(
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