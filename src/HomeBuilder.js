/**
 * Trading OS - Home Builder
 *
 * Builds and renders the HOME portal.
 *
 * Responsibilities:
 * - Show current Trading OS status
 * - Show quick navigation
 * - Show alerts requiring attention
 * - Create or refresh the HOME sheet
 *
 * This module receives an existing dashboard model.
 * It does not calculate trade lifecycle or modify trades.
 */

const TOS_HOME_BUILDER = {
  HOME_SHEET: 'HOME',

  /**
   * Converts navigation objects into rows for HOME.
   *
   * @param {Object[]} navigation Navigation configuration.
   * @return {Array[]} Navigation rows.
   */
  buildNavigationRows_(navigation) {
    return (navigation || []).map(item => {
      return [
        this.text_(
          item && item.label
        ),

        this.text_(
          item && item.sheetName
        ),

        this.text_(
          item && item.description
        )
      ];
    });
  },

  /**
   * Builds the main system summary rows.
   *
   * @param {Object} model Dashboard model.
   * @return {Array[]} Status rows.
   */
  buildStatusRows_(model) {
    const safeModel = model || {};
    const trades = safeModel.trades || {};
    const legs = safeModel.legs || {};

    return [
      [
        'Open Trades',
        this.number_(trades.open)
      ],
      [
        'Partial Exit',
        this.number_(trades.partialExit)
      ],
      [
        'Closed Trades',
        this.number_(trades.closed)
      ],
      [
        'Unrealized PnL',
        this.number_(legs.unrealizedPnL)
      ],
      [
        'Combined PnL',
        this.number_(safeModel.combinedPnL)
      ],
      [
        'Open / Closed Legs',
        this.number_(legs.openLegs) +
        ' / ' +
        this.number_(legs.closedLegs)
      ]
    ];
  },

  /**
   * Builds account summary rows for HOME.
   *
   * @param {Object} accountInfo Latest normalized account snapshot.
   * @return {Array[]} Account summary rows.
   */
  buildAccountRows_(accountInfo) {
    const safeAccount =
      accountInfo || {};

    return [
      [
        'Net Liquidation',
        this.number_(
          safeAccount.netLiquidation
        )
      ],
      [
        'Cash',
        this.number_(
          safeAccount.totalCashValue
        )
      ],
      [
        'Options Value',
        this.number_(
          safeAccount.optionsValue
        )
      ],
      [
        'Report Date',
        this.formatReportDate_(
          safeAccount.reportDate
        )
      ]
    ];
  },

  /**
   * Formats an IBKR report date from YYYYMMDD to YYYY-MM-DD.
   *
   * @param {*} value IBKR report date.
   * @return {string} Formatted date.
   */
  formatReportDate_(value) {
    const normalized =
      this.text_(value).replace(
        /[^0-9]/g,
        ''
      );

    if (normalized.length !== 8) {
      return this.text_(value);
    }

    return (
      normalized.substring(0, 4) +
      '-' +
      normalized.substring(4, 6) +
      '-' +
      normalized.substring(6, 8)
    );
  },

  /**
   * Builds alerts that require user attention.
   *
   * @param {Object} model Dashboard model.
   * @param {Object} systemStatus Pipeline and import status.
   * @return {string[]} Alert messages.
   */
  buildAlerts_(
    model,
    systemStatus
  ) {
    const safeModel = model || {};
    const trades = safeModel.trades || {};
    const safeStatus = systemStatus || {};

    const alerts = [];

    const partialExit =
      this.number_(
        trades.partialExit
      );

    const pendingExitSync =
      this.number_(
        trades.closedPendingExitSync
      );

    const pendingImports =
      this.number_(
        safeStatus.pendingImports
      );

    const pipelineStatus =
      this.text_(
        safeStatus.pipelineStatus
      ).toUpperCase();

    if (partialExit > 0) {
      alerts.push(
        partialExit +
        ' trade(s) are currently in PARTIAL_EXIT.'
      );
    }

    if (pendingExitSync > 0) {
      alerts.push(
        pendingExitSync +
        ' trade(s) are waiting for exit synchronization.'
      );
    }

    if (pendingImports > 0) {
      alerts.push(
        pendingImports +
        ' import review item(s) require a decision.'
      );
    }

    if (
      pipelineStatus &&
      pipelineStatus !== 'SUCCESS'
    ) {
      alerts.push(
        'The latest Trading OS pipeline failed or did not complete successfully.'
      );
    }

    if (alerts.length === 0) {
      alerts.push(
        'No items currently require attention.'
      );
    }

    return alerts;
  },

  /**
   * Renders the HOME portal to a sheet.
   *
   * Expected layout:
   * - Rows 1-3: Header
   * - Rows 5-11: System status
   * - Rows 14+: Quick navigation
   * - Row 27+: Alerts
   *
   * @param {Object} sheet Google Sheet or test double.
   * @param {Object} model Dashboard model.
   * @param {Object} systemStatus Pipeline and import state.
   * @return {Object} Render result.
   */
  renderModel_(
    sheet,
    model,
    systemStatus
  ) {
    if (!sheet) {
      throw new Error(
        'HOME sheet is required.'
      );
    }

    const safeModel = model || {};
    const safeStatus =
      systemStatus || {};

    const statusRows =
      this.buildStatusRows_(
        safeModel
      );

    const navigationRows =
      this.buildNavigationRows_(
        safeModel.navigation
      );

    const alerts =
      this.buildAlerts_(
        safeModel,
        safeStatus
      );

    const alertRows =
      alerts.map(alert => {
        return [alert];
      });

    sheet.clear();
    sheet.setFrozenRows(3);

    /*
     * Header
     */
    sheet
      .getRange(1, 1, 1, 6)
      .merge()
      .setValue('Trading OS')
      .setFontWeight('bold')
      .setFontSize(20)
      .setHorizontalAlignment('center');

    sheet
      .getRange(2, 1, 1, 6)
      .merge()
      .setValue(
        'Daily Operations Home'
      )
      .setFontWeight('bold')
      .setHorizontalAlignment('center');

    sheet
      .getRange(3, 1, 1, 6)
      .merge()
      .setValue(
        'Generated: ' +
        this.formatDateTime_(
          safeModel.generatedAt
        )
      )
      .setHorizontalAlignment('center');

    /*
     * System Status
     */
    sheet
      .getRange(5, 1, 1, 3)
      .merge()
      .setValue('System Status')
      .setFontWeight('bold')
      .setFontSize(13);

    sheet
      .getRange(
        6,
        1,
        statusRows.length,
        2
      )
      .setValues(statusRows);

    sheet
      .getRange(
        6,
        1,
        statusRows.length,
        1
      )
      .setFontWeight('bold');

    /*
     * Currency formatting:
     * Unrealized PnL and Combined PnL.
     */
    sheet
      .getRange(9, 2, 2, 1)
      .setNumberFormat(
        '$#,##0.00;-$#,##0.00'
      );

    /*
     * Pipeline status block
     */
    const pipelineRows = [
      [
        'Pipeline Status',
        this.text_(
          safeStatus.pipelineStatus
        ) || 'UNKNOWN'
      ],
      [
        'Last Run ID',
        this.text_(
          safeStatus.pipelineRunId
        )
      ],
      [
        'Pending Imports',
        this.number_(
          safeStatus.pendingImports
        )
      ]
    ];

    sheet
      .getRange(5, 4, 1, 3)
      .merge()
      .setValue('Operations')
      .setFontWeight('bold')
      .setFontSize(13);

    sheet
      .getRange(
        6,
        4,
        pipelineRows.length,
        2
      )
      .setValues(pipelineRows);

    sheet
      .getRange(
        6,
        4,
        pipelineRows.length,
        1
      )
      .setFontWeight('bold');

    /*
     * Quick Navigation
     */
    sheet
      .getRange(14, 1, 1, 6)
      .merge()
      .setValue('Quick Navigation')
      .setFontWeight('bold')
      .setFontSize(13);

    sheet
      .getRange(15, 1, 1, 3)
      .setValues([
        [
          'Area',
          'Sheet',
          'Purpose'
        ]
      ])
      .setFontWeight('bold')
      .setWrap(true);

    if (navigationRows.length > 0) {
      sheet
        .getRange(
          16,
          1,
          navigationRows.length,
          3
        )
        .setValues(
          navigationRows
        )
        .setWrap(true);
    }

    /*
     * Alerts
     */
    sheet
      .getRange(27, 1, 1, 6)
      .merge()
      .setValue('Alerts')
      .setFontWeight('bold')
      .setFontSize(13);

    sheet
      .getRange(
        28,
        1,
        alertRows.length,
        6
      )
      .merge()
      .setValues(
        alertRows.map(row => {
          return [
            row[0],
            '',
            '',
            '',
            '',
            ''
          ];
        })
      )
      .setWrap(true);

    /*
     * Borders
     */
    sheet
      .getRange(
        15,
        1,
        Math.max(
          navigationRows.length + 1,
          1
        ),
        3
      )
      .setBorder(
        true,
        true,
        true,
        true,
        true,
        true
      );

    sheet
      .getRange(
        6,
        1,
        statusRows.length,
        2
      )
      .setBorder(
        true,
        true,
        true,
        true,
        true,
        true
      );

    /*
     * Column sizing
     */
    sheet.autoResizeColumns(
      1,
      6
    );

    sheet.setColumnWidth(
      1,
      170
    );

    sheet.setColumnWidth(
      2,
      170
    );

    sheet.setColumnWidth(
      3,
      360
    );

    sheet.setColumnWidth(
      4,
      170
    );

    sheet.setColumnWidth(
      5,
      220
    );

    return {
      success: true,
      statusRows:
        statusRows.length,
      navigationItems:
        navigationRows.length,
      alerts:
        alerts.length
    };
  },

  /**
   * Creates or refreshes the real HOME sheet.
   *
   * @param {Object} model Dashboard model.
   * @param {Object} systemStatus Pipeline/import state.
   * @return {Object} Render result.
   */
  render(
    model,
    systemStatus
  ) {
    const ss =
      SpreadsheetApp.getActiveSpreadsheet();

    let sheet =
      ss.getSheetByName(
        this.HOME_SHEET
      );

    if (!sheet) {
      sheet =
        ss.insertSheet(
          this.HOME_SHEET
        );
    }

    return this.renderModel_(
      sheet,
      model,
      systemStatus
    );
  },

  /**
   * Formats timestamps for display.
   *
   * @param {*} value Date or text.
   * @return {string} Display value.
   */
  formatDateTime_(value) {
    if (!(value instanceof Date)) {
      return this.text_(value);
    }

    if (
      typeof Utilities !==
        'undefined' &&
      typeof Session !==
        'undefined'
    ) {
      return Utilities.formatDate(
        value,
        Session.getScriptTimeZone(),
        'yyyy-MM-dd HH:mm:ss'
      );
    }

    return value.toISOString();
  },

  text_(value) {
    return String(
      value === null ||
      value === undefined
        ? ''
        : value
    ).trim();
  },

  number_(value) {
    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return value;
    }

    const normalized =
      this.text_(value);

    if (!normalized) {
      return 0;
    }

    const parsed = Number(
      normalized.replace(
        /,/g,
        ''
      )
    );

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }
};