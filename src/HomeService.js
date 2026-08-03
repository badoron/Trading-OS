/**
 * Trading OS - Home Service
 *
 * Connects real Trading OS sheet data to:
 * - TOS_TRADING_OS_CONTEXT
 * - TOS_HOME_BUILDER
 *
 * Responsibilities:
 * - Read MASTER_TRADES
 * - Read TRADE_LEGS
 * - Read IMPORT_REVIEW
 * - Read PIPELINE_AUDIT
 * - Normalize all source collections
 * - Build one shared Trading OS context
 * - Render the HOME portal
 */

const TOS_HOME_SERVICE = {
  MASTER_TRADES: 'MASTER_TRADES',
  TRADE_LEGS: 'TRADE_LEGS',
  IMPORT_REVIEW: 'IMPORT_REVIEW',
  PIPELINE_AUDIT: 'PIPELINE_AUDIT',

  /**
   * Normalizes IMPORT_REVIEW rows.
   *
   * @param {Object} table Normalized sheet table.
   * @return {Object[]} Normalized import-review rows.
   */
  normalizeImportReview_(table) {
    const safeTable = table || {
      headers: [],
      rows: []
    };

    return (safeTable.rows || []).map(item => {
      return {
        rowNumber:
          item.rowNumber,

        reviewId:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'ReviewID'
            )
          ),

        detectedGroupId:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'DetectedGroupID'
            )
          ),

        decision:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'Decision'
            )
          ).toUpperCase(),

        importDecision:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'ImportDecision'
            )
          ).toUpperCase(),

        reviewStatus:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'ReviewStatus'
            )
          ).toUpperCase(),

        createOrLinkTradeId:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'CreateOrLinkTradeID'
            )
          )
      };
    });
  },

  /**
   * Normalizes PIPELINE_AUDIT rows.
   *
   * @param {Object} table Normalized sheet table.
   * @return {Object[]} Normalized audit rows.
   */
  normalizePipelineAudit_(table) {
    const safeTable = table || {
      headers: [],
      rows: []
    };

    return (safeTable.rows || []).map(item => {
      return {
        rowNumber:
          item.rowNumber,

        timestamp:
          this.getCell_(
            item.row,
            safeTable.headers,
            'Timestamp'
          ),

        runId:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'RunID'
            )
          ),

        module:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'Module'
            )
          ),

        status:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'Status'
            )
          ).toUpperCase(),

        message:
          this.text_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'Message'
            )
          ),

        durationMs:
          this.number_(
            this.getCell_(
              item.row,
              safeTable.headers,
              'DurationMs'
            )
          )
      };
    });
  },

  /**
   * Builds the shared Trading OS context.
   *
   * @param {Object[]} trades Normalized master trades.
   * @param {Object[]} legs Normalized trade legs.
   * @param {Object[]} importRows Normalized import-review rows.
   * @param {Object[]} auditRows Normalized pipeline-audit rows.
   * @return {Object} Shared Trading OS context.
   */
  buildContext_(
    trades,
    legs,
    importRows,
    auditRows
  ) {
    return TOS_TRADING_OS_CONTEXT
      .buildContext_(
        trades || [],
        legs || [],
        importRows || [],
        auditRows || []
      );
  },

  /**
   * Builds shared context and renders HOME using supplied data.
   *
   * Used by unit tests and by the real refresh flow.
   *
   * @param {Object[]} trades Normalized master trades.
   * @param {Object[]} legs Normalized trade legs.
   * @param {Object[]} importRows Normalized import-review rows.
   * @param {Object[]} auditRows Normalized pipeline-audit rows.
   * @param {Object} homeBuilder HOME renderer implementation.
   * @return {Object} HOME render result.
   */
  refreshFromData_(
    trades,
    legs,
    importRows,
    auditRows,
    homeBuilder
  ) {
    const effectiveHomeBuilder =
      homeBuilder ||
      TOS_HOME_BUILDER;

    const context =
      this.buildContext_(
        trades,
        legs,
        importRows,
        auditRows
      );

    return effectiveHomeBuilder.render(
      context.dashboardModel,
      context.systemStatus
    );
  },

  /**
   * Reads all real source sheets and refreshes HOME.
   *
   * @return {Object} HOME refresh result.
   */
  refreshHome() {
    const ss =
      SpreadsheetApp.getActiveSpreadsheet();

    const masterSheet =
      ss.getSheetByName(
        this.MASTER_TRADES
      );

    const legsSheet =
      ss.getSheetByName(
        this.TRADE_LEGS
      );

    const importSheet =
      ss.getSheetByName(
        this.IMPORT_REVIEW
      );

    const auditSheet =
      ss.getSheetByName(
        this.PIPELINE_AUDIT
      );

    if (!masterSheet) {
      throw new Error(
        'Missing sheet: ' +
        this.MASTER_TRADES
      );
    }

    if (!legsSheet) {
      throw new Error(
        'Missing sheet: ' +
        this.TRADE_LEGS
      );
    }

    if (!importSheet) {
      throw new Error(
        'Missing sheet: ' +
        this.IMPORT_REVIEW
      );
    }

    if (!auditSheet) {
      throw new Error(
        'Missing sheet: ' +
        this.PIPELINE_AUDIT
      );
    }

    /*
     * MASTER_TRADES and TRADE_LEGS are normalized through
     * DashboardService so HOME and DASHBOARD use identical data.
     */
    const masterTable =
      TOS_DASHBOARD_SERVICE.getTable_(
        masterSheet,
        [
          'TradeID',
          'StrategyID',
          'Symbol',
          'WorkflowStatus'
        ]
      );

    const legsTable =
      TOS_DASHBOARD_SERVICE.getTable_(
        legsSheet,
        [
          'LegID',
          'TradeID',
          'BrokerContractID'
        ]
      );

    const importTable =
      this.getTable_(
        importSheet,
        [
          'ReviewID',
          'DetectedGroupID',
          'ReviewStatus'
        ]
      );

    const auditTable =
      this.getTable_(
        auditSheet,
        [
          'Timestamp',
          'RunID',
          'Module',
          'Status'
        ]
      );

    const trades =
      TOS_DASHBOARD_SERVICE
        .normalizeMasterTrades_(
          masterTable
        );

    const legs =
      TOS_DASHBOARD_SERVICE
        .normalizeTradeLegs_(
          legsTable
        );

    const importRows =
      this.normalizeImportReview_(
        importTable
      );

    const auditRows =
      this.normalizePipelineAudit_(
        auditTable
      );

    const context =
      this.buildContext_(
        trades,
        legs,
        importRows,
        auditRows
      );

    const result =
      TOS_HOME_BUILDER.render(
        context.dashboardModel,
        context.systemStatus
      );

    Logger.log(
      'HOME refresh completed.' +
      ' Trades=' +
      trades.length +
      ', Legs=' +
      legs.length +
      ', PendingImports=' +
      context.pendingImports +
      ', PipelineStatus=' +
      context.lastPipeline.status +
      ', RunID=' +
      context.lastPipeline.runId
    );

    return {
      success:
        result.success === true,

      statusRows:
        result.statusRows || 0,

      navigationItems:
        result.navigationItems || 0,

      alerts:
        result.alerts || 0,

      trades:
        trades.length,

      legs:
        legs.length,

      pendingImports:
        context.pendingImports,

      pipelineStatus:
        context.lastPipeline.status,

      pipelineRunId:
        context.lastPipeline.runId
    };
  },

  /**
   * Reads a table using dynamic header detection.
   *
   * @param {Object} sheet Google Sheet.
   * @param {string[]} requiredHeaders Required column names.
   * @return {Object} Normalized sheet table.
   */
  getTable_(
    sheet,
    requiredHeaders
  ) {
    const headerInfo =
      this.findHeaderRow_(
        sheet,
        requiredHeaders
      );

    const headers =
      headerInfo.headers;

    const headerRow =
      headerInfo.row;

    const lastRow =
      sheet.getLastRow();

    const rows = [];

    if (lastRow > headerRow) {
      const values = sheet
        .getRange(
          headerRow + 1,
          1,
          lastRow - headerRow,
          headers.length
        )
        .getValues();

      values.forEach(
        (row, index) => {
          const isEmpty =
            row.every(value => {
              return (
                this.text_(value) === ''
              );
            });

          if (!isEmpty) {
            rows.push({
              rowNumber:
                headerRow +
                1 +
                index,

              row: row
            });
          }
        }
      );
    }

    return {
      headerRow: headerRow,
      headers: headers,
      rows: rows
    };
  },

  /**
   * Finds a row containing all required headers.
   *
   * @param {Object} sheet Google Sheet.
   * @param {string[]} requiredHeaders Required column names.
   * @return {Object} Header metadata.
   */
  findHeaderRow_(
    sheet,
    requiredHeaders
  ) {
    const maxRows =
      Math.min(
        sheet.getLastRow(),
        20
      );

    const maxCols =
      sheet.getLastColumn();

    for (
      let rowNumber = 1;
      rowNumber <= maxRows;
      rowNumber++
    ) {
      const headers = sheet
        .getRange(
          rowNumber,
          1,
          1,
          maxCols
        )
        .getValues()[0]
        .map(value => {
          return this.text_(
            value
          );
        });

      const allFound =
        requiredHeaders.every(
          requiredHeader => {
            return (
              headers.indexOf(
                requiredHeader
              ) !== -1
            );
          }
        );

      if (allFound) {
        return {
          row: rowNumber,
          headers: headers
        };
      }
    }

    throw new Error(
      'Could not find header row in sheet: ' +
      sheet.getName()
    );
  },

  /**
   * Reads one value from a normalized row.
   *
   * @param {Array} row Row values.
   * @param {string[]} headers Header names.
   * @param {string} name Column name.
   * @return {*} Cell value.
   */
  getCell_(
    row,
    headers,
    name
  ) {
    const index =
      headers.indexOf(name);

    if (index < 0) {
      return '';
    }

    return row[index];
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

/**
 * Official HOME refresh entry point.
 *
 * Writes only to HOME.
 */
function refreshTradingOSHome() {
  return TOS_HOME_SERVICE
    .refreshHome();
}

/**
 * Backward-compatible test-style entry point.
 *
 * Writes to HOME.
 */
function testHomeRefresh() {
  return refreshTradingOSHome();
}