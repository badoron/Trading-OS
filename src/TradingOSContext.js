/**
 * Trading OS - Shared Context
 *
 * Loads and exposes one shared snapshot of the Trading OS state.
 *
 * Responsibilities:
 * - Count pending import-review items
 * - Find the latest completed pipeline run
 * - Build one shared dashboard model
 * - Expose normalized source collections
 *
 * This module does not render sheets and does not modify trades.
 */

const TOS_TRADING_OS_CONTEXT = {
  /**
   * Counts import-review rows that still require user action.
   *
   * A row is pending only when:
   * - ReviewStatus = PENDING
   * - ImportDecision is not already completed
   *
   * @param {Object[]} rows Normalized IMPORT_REVIEW rows.
   * @return {number} Pending row count.
   */
  countPendingImports_(rows) {
    return (rows || []).filter(row => {
      const reviewStatus = this.text_(
        row && row.reviewStatus
      ).toUpperCase();

      const importDecision = this.text_(
        row && row.importDecision
      ).toUpperCase();

      const alreadyCompleted = [
        'IMPORTED',
        'IGNORED',
        'RESIDUAL'
      ].indexOf(importDecision) !== -1;

      return (
        reviewStatus === 'PENDING' &&
        !alreadyCompleted
      );
    }).length;
  },

  /**
   * Finds the latest terminal Pipeline audit record.
   *
   * STARTED records are ignored because they do not represent
   * the final state of a run.
   *
   * Module-step records such as Lifecycle or TradeMonitor
   * are ignored.
   *
   * @param {Object[]} records Normalized PIPELINE_AUDIT rows.
   * @return {Object} Latest pipeline summary.
   */
  findLatestPipelineRun_(records) {
    const pipelineRecords = (records || [])
      .filter(record => {
        const moduleName = this.text_(
          record && record.module
        ).toUpperCase();

        const status = this.text_(
          record && record.status
        ).toUpperCase();

        return (
          moduleName === 'PIPELINE' &&
          status !== 'STARTED'
        );
      })
      .sort((left, right) => {
        return (
          this.dateValue_(
            right && right.timestamp
          ) -
          this.dateValue_(
            left && left.timestamp
          )
        );
      });

    if (pipelineRecords.length === 0) {
      return {
        timestamp: '',
        runId: '',
        module: 'Pipeline',
        status: 'UNKNOWN',
        message: '',
        durationMs: 0
      };
    }

    const latest = pipelineRecords[0];

    return {
      timestamp:
        latest.timestamp || '',

      runId:
        this.text_(
          latest.runId
        ),

      module:
        this.text_(
          latest.module
        ) || 'Pipeline',

      status:
        this.text_(
          latest.status
        ).toUpperCase() || 'UNKNOWN',

      message:
        this.text_(
          latest.message
        ),

      durationMs:
        this.number_(
          latest.durationMs
        )
    };
  },

  /**
   * Builds one shared system context from supplied normalized data.
   *
   * @param {Object[]} trades Normalized MASTER_TRADES rows.
   * @param {Object[]} legs Normalized TRADE_LEGS rows.
   * @param {Object[]} importRows Normalized IMPORT_REVIEW rows.
   * @param {Object[]} auditRows Normalized PIPELINE_AUDIT rows.
   * @return {Object} Shared Trading OS context.
   */
  buildContext_(
    trades,
    legs,
    importRows,
    auditRows
  ) {
    const safeTrades = trades || [];
    const safeLegs = legs || [];
    const safeImportRows = importRows || [];
    const safeAuditRows = auditRows || [];

    const dashboardModel =
      TOS_DASHBOARD_SERVICE.buildModel_(
        safeTrades,
        safeLegs
      );

    const pendingImports =
      this.countPendingImports_(
        safeImportRows
      );

    const lastPipeline =
      this.findLatestPipelineRun_(
        safeAuditRows
      );

    return {
      generatedAt: new Date(),

      trades: safeTrades,
      legs: safeLegs,
      importRows: safeImportRows,
      auditRows: safeAuditRows,

      pendingImports: pendingImports,
      lastPipeline: lastPipeline,

      dashboardModel: dashboardModel,

      systemStatus: {
        pendingImports: pendingImports,
        pipelineStatus:
          lastPipeline.status,
        pipelineRunId:
          lastPipeline.runId,
        pipelineTimestamp:
          lastPipeline.timestamp,
        pipelineDurationMs:
          lastPipeline.durationMs
      }
    };
  },

  /**
   * Safely converts values to timestamps for sorting.
   *
   * @param {*} value Date or date-like value.
   * @return {number} Epoch milliseconds or zero.
   */
  dateValue_(value) {
    if (value instanceof Date) {
      return value.getTime();
    }

    const parsed = new Date(value);

    return Number.isNaN(
      parsed.getTime()
    )
      ? 0
      : parsed.getTime();
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