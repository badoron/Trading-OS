/**
 * Trading OS - Dashboard Renderer
 *
 * Presentation layer for the DASHBOARD sheet.
 *
 * Responsibilities:
 * - Render summary metrics
 * - Render DDC trade table
 * - Apply basic formatting
 *
 * This module does not perform business calculations.
 */

const TOS_DASHBOARD_RENDERER = {
  DASHBOARD_SHEET: 'DASHBOARD',

  DDC_HEADERS: [
    'Symbol',
    'Status',
    'Entry Date',
    'Short Expiration',
    'Total Legs',
    'Open Legs',
    'Closed Legs',
    'Market Value',
    'Unrealized PnL',
    'Realized PnL',
    'Long Expiration',
    'Trade ID'
  ],

  /**
   * Builds the dashboard summary metric rows.
   *
   * @param {Object} model Dashboard model.
   * @return {Array[]} Metric rows.
   */
  buildMetricRows_(model) {
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
        'Closed Pending Exit Sync',
        this.number_(
          trades.closedPendingExitSync
        )
      ],
      [
        'Closed Trades',
        this.number_(trades.closed)
      ],
      [
        'Realized PnL',
        this.number_(trades.realizedPnL)
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
   * Builds the DDC trades table rows.
   *
   * @param {Object[]} ddcRows Dashboard DDC rows.
   * @return {Array[]} Table rows.
   */
  buildDdcTableRows_(ddcRows) {
    const safeRows = ddcRows || [];

    if (safeRows.length === 0) {
      return [[
        'No DDC trades found.',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        ''
      ]];
    }

    return safeRows.map(item => {
      return [
        this.text_(item && item.symbol),
        this.text_(
          item && item.workflowStatus
        ),
        item && item.entryDate !== undefined
          ? item.entryDate
          : '',
        this.text_(
          item && item.shortExpiration
        ),
        this.number_(item && item.totalLegs),
        this.number_(item && item.openLegs),
        this.number_(item && item.closedLegs),
        this.number_(item && item.marketValue),
        this.number_(
          item && item.unrealizedPnL
        ),
        this.number_(
          item && item.realizedPnL
        ),
        this.text_(
          item && item.longExpiration
        ),
        this.text_(item && item.tradeId)
      ];
    });
  },

  /**
   * Renders one complete dashboard model to a sheet.
   *
   * @param {Object} sheet Google Sheet or compatible test double.
   * @param {Object} model Dashboard model.
   * @return {Object} Render result.
   */
  renderModel_(sheet, model) {
    if (!sheet) {
      throw new Error(
        'Dashboard sheet is required.'
      );
    }

    const safeModel = model || {};
    const metricRows =
      this.buildMetricRows_(safeModel);

    const ddcRows =
      this.buildDdcTableRows_(
        safeModel.ddcRows
      );

    sheet.clear();
    sheet.setFrozenRows(3);

    /*
     * Main title
     */
    sheet
      .getRange(1, 1, 1, 12)
      .merge()
      .setValue('Trading OS Dashboard')
      .setFontWeight('bold')
      .setFontSize(18)
      .setHorizontalAlignment('center');

    /*
     * Generated timestamp
     */
    sheet
      .getRange(2, 1, 1, 12)
      .merge()
      .setValue(
        'Generated: ' +
        this.formatDateTime_(
          safeModel.generatedAt
        )
      )
      .setHorizontalAlignment('center');

    /*
     * Account data availability message
     */
    const account =
      safeModel.account || {};

    const accountMessage =
      account.accountDataAvailable
        ? 'Account data available'
        : 'Account equity, cash and buying power are not available in the current Flex query.';

    sheet
      .getRange(3, 1, 1, 12)
      .merge()
      .setValue(accountMessage)
      .setWrap(true)
      .setHorizontalAlignment('center');

    /*
     * Summary section
     */
    sheet
      .getRange(4, 1, 1, 4)
      .merge()
      .setValue(
        'Account & Strategy Summary'
      )
      .setFontWeight('bold')
      .setFontSize(13);

    sheet
      .getRange(
        5,
        1,
        metricRows.length,
        2
      )
      .setValues(metricRows);

    sheet
      .getRange(
        5,
        1,
        metricRows.length,
        1
      )
      .setFontWeight('bold');

    /*
     * Format PnL metric rows.
     * Rows 9, 10 and 11 correspond to realized,
     * unrealized and combined PnL.
     */
    sheet
      .getRange(9, 2, 3, 1)
      .setNumberFormat(
        '$#,##0.00;-$#,##0.00'
      );

    /*
     * DDC section
     */
    sheet
      .getRange(15, 1, 1, 12)
      .merge()
      .setValue('DDC Trades')
      .setFontWeight('bold')
      .setFontSize(13);

    sheet
      .getRange(
        16,
        1,
        1,
        this.DDC_HEADERS.length
      )
      .setValues([
        this.DDC_HEADERS.slice()
      ])
      .setFontWeight('bold')
      .setWrap(true);

    sheet
      .getRange(
        17,
        1,
        ddcRows.length,
        this.DDC_HEADERS.length
      )
      .setValues(ddcRows)
      .setWrap(true);

    /*
     * Currency columns:
     * H = Market Value
     * I = Unrealized PnL
     * J = Realized PnL
     */
    sheet
      .getRange(
        17,
        8,
        ddcRows.length,
        3
      )
      .setNumberFormat(
        '$#,##0.00;-$#,##0.00'
      );

    /*
     * Basic borders and resizing.
     */
    sheet
      .getRange(
        16,
        1,
        ddcRows.length + 1,
        this.DDC_HEADERS.length
      )
      .setBorder(
        true,
        true,
        true,
        true,
        true,
        true
      );

    sheet.autoResizeColumns(
      1,
      this.DDC_HEADERS.length
    );

    sheet.setColumnWidth(1, 110);
    sheet.setColumnWidth(2, 140);
    sheet.setColumnWidth(12, 190);

    return {
      success: true,
      metrics: metricRows.length,
      ddcTrades:
        safeModel.ddcRows
          ? safeModel.ddcRows.length
          : 0,
      renderedRows:
        16 + ddcRows.length
    };
  },

  /**
   * Renders the dashboard into the real DASHBOARD sheet.
   *
   * @param {Object} model Dashboard model.
   * @return {Object} Render result.
   */
  render(model) {
    const ss =
      SpreadsheetApp.getActiveSpreadsheet();

    let sheet =
      ss.getSheetByName(
        this.DASHBOARD_SHEET
      );

    if (!sheet) {
      sheet = ss.insertSheet(
        this.DASHBOARD_SHEET
      );
    }

    return this.renderModel_(
      sheet,
      model
    );
  },

  formatDateTime_(value) {
    if (!(value instanceof Date)) {
      return this.text_(value);
    }

    if (
      typeof Utilities !== 'undefined' &&
      typeof Session !== 'undefined'
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
      normalized.replace(/,/g, '')
    );

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }
};