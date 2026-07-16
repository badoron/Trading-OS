/**
 * Trading OS - Dashboard Renderer Tests
 *
 * Isolated unit tests for rendering the DASHBOARD sheet.
 *
 * These tests use an in-memory fake sheet:
 * - No real Google Sheets reads
 * - No real Google Sheets writes
 * - No IBKR connection
 */

function testDashboardRendererUnitTests() {
  const tests = [
    {
      name: 'builds the expected dashboard metric rows',
      run: function () {
        const model = dashboardRendererTestModel_();

        const rows =
          TOS_DASHBOARD_RENDERER
            .buildMetricRows_(model);

        dashboardRendererAssertEqual_(
          8,
          rows.length,
          'row count'
        );

        dashboardRendererAssertEqual_(
          'Open Trades',
          rows[0][0],
          'first label'
        );

        dashboardRendererAssertEqual_(
          4,
          rows[0][1],
          'open trades'
        );

        dashboardRendererAssertEqual_(
          'Partial Exit',
          rows[1][0],
          'partial label'
        );

        dashboardRendererAssertEqual_(
          1,
          rows[1][1],
          'partial count'
        );

        dashboardRendererAssertEqual_(
          74.5,
          rows[4][1],
          'realized PnL'
        );

        dashboardRendererAssertEqual_(
          -20.5,
          rows[5][1],
          'unrealized PnL'
        );

        dashboardRendererAssertEqual_(
          54,
          rows[6][1],
          'combined PnL'
        );
      }
    },

    {
      name: 'builds one table row per DDC trade',
      run: function () {
        const model =
          dashboardRendererTestModel_();

        const rows =
          TOS_DASHBOARD_RENDERER
            .buildDdcTableRows_(
              model.ddcRows
            );

        dashboardRendererAssertEqual_(
          2,
          rows.length,
          'row count'
        );

        dashboardRendererAssertEqual_(
          'XSP',
          rows[0][0],
          'first symbol'
        );

        dashboardRendererAssertEqual_(
          'OPEN',
          rows[0][1],
          'first status'
        );

        dashboardRendererAssertEqual_(
          4,
          rows[0][4],
          'total legs'
        );

        dashboardRendererAssertEqual_(
          4,
          rows[0][5],
          'open legs'
        );

        dashboardRendererAssertEqual_(
          15,
          rows[0][8],
          'unrealized PnL'
        );

        dashboardRendererAssertEqual_(
          'PARTIAL_EXIT',
          rows[1][1],
          'second status'
        );

        dashboardRendererAssertEqual_(
          3,
          rows[1][6],
          'closed legs'
        );
      }
    },

    {
      name: 'empty DDC list produces a readable placeholder row',
      run: function () {
        const rows =
          TOS_DASHBOARD_RENDERER
            .buildDdcTableRows_([]);

        dashboardRendererAssertEqual_(
          1,
          rows.length,
          'row count'
        );

        dashboardRendererAssertEqual_(
          'No DDC trades found.',
          rows[0][0],
          'message'
        );
      }
    },

    {
      name: 'renders the main dashboard sections to the sheet',
      run: function () {
        const fakeSheet =
          createFakeDashboardSheet_();

        const model =
          dashboardRendererTestModel_();

        const result =
          TOS_DASHBOARD_RENDERER
            .renderModel_(
              fakeSheet,
              model
            );

        dashboardRendererAssertEqual_(
          true,
          result.success,
          'success'
        );

        dashboardRendererAssertEqual_(
          2,
          result.ddcTrades,
          'ddcTrades'
        );

        dashboardRendererAssertEqual_(
          'Trading OS Dashboard',
          fakeSheet.valueAt(1, 1),
          'title'
        );

        dashboardRendererAssertEqual_(
          'Account & Strategy Summary',
          fakeSheet.valueAt(4, 1),
          'summary title'
        );

        dashboardRendererAssertEqual_(
          'DDC Trades',
          fakeSheet.valueAt(15, 1),
          'DDC title'
        );

        dashboardRendererAssertEqual_(
          'Symbol',
          fakeSheet.valueAt(16, 1),
          'table header'
        );

        dashboardRendererAssertEqual_(
          'XSP',
          fakeSheet.valueAt(17, 1),
          'first trade'
        );
      }
    },

    {
      name: 'renderer clears old dashboard content first',
      run: function () {
        const fakeSheet =
          createFakeDashboardSheet_();

        TOS_DASHBOARD_RENDERER
          .renderModel_(
            fakeSheet,
            dashboardRendererTestModel_()
          );

        dashboardRendererAssertEqual_(
          1,
          fakeSheet.clearCount(),
          'clear count'
        );
      }
    },

    {
      name: 'renderer freezes the top dashboard rows',
      run: function () {
        const fakeSheet =
          createFakeDashboardSheet_();

        TOS_DASHBOARD_RENDERER
          .renderModel_(
            fakeSheet,
            dashboardRendererTestModel_()
          );

        dashboardRendererAssertEqual_(
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
      ' dashboard renderer test(s) failed:\n' +
      failures.join('\n')
    );
  }

  Logger.log(
    'Dashboard renderer tests completed. Passed=' +
    tests.length
  );

  return {
    passed: tests.length,
    failed: 0
  };
}

function dashboardRendererTestModel_() {
  return {
    generatedAt:
      new Date('2026-07-16T10:00:00Z'),

    account: {
      equity: '',
      cash: '',
      buyingPower: '',
      accountDataAvailable: false
    },

    trades: {
      total: 6,
      open: 4,
      partialExit: 1,
      closedPendingExitSync: 0,
      closed: 1,
      other: 0,
      realizedPnL: 74.5
    },

    legs: {
      totalLegs: 24,
      openLegs: 17,
      closedLegs: 7,
      unrealizedPnL: -20.5,
      marketValue: -61
    },

    combinedPnL: 54,

    ddcRows: [
      {
        tradeId: 'TRD-XSP',
        strategyId: 'DDC',
        symbol: 'XSP',
        workflowStatus: 'OPEN',
        entryDate: '2026-07-02',
        exitDate: '',
        totalLegs: 4,
        openLegs: 4,
        closedLegs: 0,
        marketValue: -10,
        unrealizedPnL: 15,
        realizedPnL: 0,
        shortExpiration: '20260717',
        longExpiration: '20260720',
        exitReason: ''
      },
      {
        tradeId: 'TRD-DAL',
        strategyId: 'DDC',
        symbol: 'DAL',
        workflowStatus: 'PARTIAL_EXIT',
        entryDate: '2026-07-09',
        exitDate: '',
        totalLegs: 4,
        openLegs: 1,
        closedLegs: 3,
        marketValue: 1,
        unrealizedPnL: 1,
        realizedPnL: 56.5,
        shortExpiration: '20260710',
        longExpiration: '20260717',
        exitReason:
          '3 of 4 legs are no longer open.'
      }
    ]
  };
}

function createFakeDashboardSheet_() {
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
      const rowCount =
        numberOfRows || 1;

      const columnCount =
        numberOfColumns || 1;

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
        },

        getNumRows: function () {
          return rowCount;
        },

        getNumColumns: function () {
          return columnCount;
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

function dashboardRendererAssertEqual_(
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