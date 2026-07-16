/**
 * Trading OS - DDC E2E Pipeline
 *
 * Official production runner for the DDC lifecycle.
 *
 * Order:
 * 0. Validate cached IBKR snapshot
 * 1. Update open legs from IBKR Open Positions
 * 2. Update trade lifecycle
 * 3. Synchronize closed legs from IBKR Trades
 * 4. Finalize trades whose final original leg has closed
 *
 * V1 scope:
 * - DDC only
 * - Uses cached IBKR Flex XML
 * - Prevents concurrent executions
 * - Stops before lifecycle writes when the snapshot is unsafe
 * - Writes a standardized audit trail to SYNC_LOG
 */

const TOS_DDC_PIPELINE = {
  LOCK_WAIT_MS: 1000,

  MODULES: {
    PIPELINE: 'Pipeline',
    SAFETY: 'Safety',
    TRADE_MONITOR: 'TradeMonitor',
    LIFECYCLE: 'Lifecycle',
    LEG_EXIT_SYNC: 'LegExitSync',
    TRADE_FINALIZER: 'TradeFinalizer'
  },

  /**
   * Runs the full DDC lifecycle pipeline.
   *
   * @return {Object} Pipeline execution result.
   */
  run() {
    const lock = LockService.getScriptLock();

    const lockAcquired = lock.tryLock(
      this.LOCK_WAIT_MS
    );

    if (!lockAcquired) {
      throw new Error(
        'Trading OS is already running. ' +
        'Wait for the current execution to finish and try again.'
      );
    }

    const startedAt = new Date();

    const runId =
      TOS_PIPELINE_AUDIT_LOGGER.createRunId_(
        startedAt
      );

    const result = {
      runId: runId,
      startedAt: startedAt,
      completedAt: null,
      durationMs: 0,
      success: false,

      safety: null,
      tradeMonitor: null,
      lifecycle: null,
      legExitSync: null,
      tradeFinalizer: null
    };

    let currentModule =
      this.MODULES.PIPELINE;

    const completedModules = [];

    Logger.log(
      '========================================'
    );

    Logger.log('TRADING OS DDC PIPELINE');
    Logger.log('RunID=' + runId);

    Logger.log(
      '========================================'
    );

    this.safeAudit_({
      timestamp: startedAt,
      runId: runId,
      module: this.MODULES.PIPELINE,
      status: 'STARTED',
      message: 'DDC production pipeline started.',
      durationMs: 0
    });

    try {
      /*
       * STEP 0 — Safety validation
       */
      currentModule = this.MODULES.SAFETY;

      Logger.log(
        'STEP 0/4 - Validate IBKR snapshot'
      );

      result.safety = this.runAuditedStep_(
        runId,
        currentModule,
        function () {
          return TOS_DDC_PIPELINE
            .validateSnapshotBeforeWrites_();
        },
        function (stepResult) {
          return (
            'ActiveTrades=' +
            stepResult.activeTrades +
            ', OpenPositions=' +
            stepResult.openPositions +
            ', SafeToContinue=' +
            stepResult.safeToContinue +
            (
              stepResult.reason
                ? ', Reason=' + stepResult.reason
                : ''
            )
          );
        }
      );

      if (!result.safety.safeToContinue) {
        throw new Error(
          'Pipeline safety check failed: ' +
          result.safety.reason +
          '. Active DDC trades=' +
          result.safety.activeTrades +
          ', IBKR open positions=' +
          result.safety.openPositions +
          '. No lifecycle data was changed.'
        );
      }

      completedModules.push(currentModule);

      /*
       * STEP 1 — Trade Monitor
       */
      currentModule =
        this.MODULES.TRADE_MONITOR;

      Logger.log(
        'STEP 1/4 - Trade Monitor'
      );

      result.tradeMonitor =
        this.runAuditedStep_(
          runId,
          currentModule,
          function () {
            return TOS_TRADE_MONITOR
              .updateOpenLegsFromIBKR();
          },
          function (stepResult) {
            return TOS_PIPELINE_AUDIT_LOGGER
              .formatDetails_(stepResult);
          }
        );

      completedModules.push(currentModule);

      /*
       * STEP 2 — Lifecycle
       */
      currentModule =
        this.MODULES.LIFECYCLE;

      Logger.log(
        'STEP 2/4 - Lifecycle Monitor'
      );

      result.lifecycle =
        this.runAuditedStep_(
          runId,
          currentModule,
          function () {
            return TOS_TRADE_LIFECYCLE_MONITOR
              .syncLifecycleFromOpenPositions();
          },
          function (stepResult) {
            return TOS_PIPELINE_AUDIT_LOGGER
              .formatDetails_(stepResult);
          }
        );

      completedModules.push(currentModule);

      /*
       * STEP 3 — Closed-leg synchronization
       */
      currentModule =
        this.MODULES.LEG_EXIT_SYNC;

      Logger.log(
        'STEP 3/4 - Leg Exit Synchronizer'
      );

      result.legExitSync =
        this.runAuditedStep_(
          runId,
          currentModule,
          function () {
            return TOS_LEG_EXIT_WRITER
              .syncClosedLegsFromIBKR();
          },
          function (stepResult) {
            return TOS_PIPELINE_AUDIT_LOGGER
              .formatDetails_(stepResult);
          }
        );

      completedModules.push(currentModule);

      /*
       * STEP 4 — Final trade closure
       */
      currentModule =
        this.MODULES.TRADE_FINALIZER;

      Logger.log(
        'STEP 4/4 - Trade Finalizer'
      );

      result.tradeFinalizer =
        this.runAuditedStep_(
          runId,
          currentModule,
          function () {
            return TOS_TRADE_FINALIZER_WRITER
              .finalizeClosedTrades();
          },
          function (stepResult) {
            return TOS_PIPELINE_AUDIT_LOGGER
              .formatDetails_(stepResult);
          }
        );

      completedModules.push(currentModule);

      result.completedAt = new Date();

      result.durationMs =
        result.completedAt.getTime() -
        startedAt.getTime();

      result.success = true;

      this.safeAudit_({
        timestamp: result.completedAt,
        runId: runId,
        module: this.MODULES.PIPELINE,
        status: 'SUCCESS',
        message:
          'DDC production pipeline completed successfully.',
        durationMs: result.durationMs
      });

      Logger.log(
        '========================================'
      );

      Logger.log(
        'DDC pipeline completed successfully.'
      );

      Logger.log(
        'RunID=' + result.runId
      );

      Logger.log(
        'TradeMonitor Updated=' +
        result.tradeMonitor.updated +
        ', Missing=' +
        result.tradeMonitor.missing
      );

      Logger.log(
        'Lifecycle Open=' +
        result.lifecycle.open +
        ', PartialExit=' +
        result.lifecycle.partialExit +
        ', ClosedPendingExitSync=' +
        result.lifecycle.closedPendingExitSync +
        ', Skipped=' +
        result.lifecycle.skipped
      );

      Logger.log(
        'LegExit Updated=' +
        result.legExitSync.updated +
        ', Skipped=' +
        result.legExitSync.skipped
      );

      Logger.log(
        'Finalizer Updated=' +
        result.tradeFinalizer.updated +
        ', ReadyToClose=' +
        result.tradeFinalizer.readyToClose
      );

      Logger.log(
        'DurationMs=' + result.durationMs
      );

      Logger.log(
        '========================================'
      );

      return result;
    } catch (error) {
      result.completedAt = new Date();

      result.durationMs =
        result.completedAt.getTime() -
        startedAt.getTime();

      result.success = false;

      this.safeAudit_({
        timestamp: result.completedAt,
        runId: runId,
        module: this.MODULES.PIPELINE,
        status: 'FAILED',
        message:
          'FailedModule=' +
          currentModule +
          ', Error=' +
          error.message,
        durationMs: result.durationMs
      });

      this.logSkippedModules_(
        runId,
        completedModules,
        currentModule
      );

      Logger.log(
        '========================================'
      );

      Logger.log(
        'DDC pipeline failed: ' +
        error.message
      );

      Logger.log(
        'RunID=' + result.runId
      );

      Logger.log(
        'FailedModule=' + currentModule
      );

      Logger.log(
        'DurationMs=' + result.durationMs
      );

      Logger.log(
        '========================================'
      );

      throw error;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Executes one pipeline step with STARTED, SUCCESS and FAILED audit rows.
   *
   * @param {string} runId Pipeline RunID.
   * @param {string} moduleName Module name.
   * @param {Function} callback Module execution.
   * @param {Function} detailFormatter Converts result to audit message.
   * @return {*} Module result.
   */
  runAuditedStep_(
    runId,
    moduleName,
    callback,
    detailFormatter
  ) {
    const startedAt = new Date();

    this.safeAudit_({
      timestamp: startedAt,
      runId: runId,
      module: moduleName,
      status: 'STARTED',
      message: moduleName + ' started.',
      durationMs: 0
    });

    try {
      const stepResult = callback();

      const completedAt = new Date();

      const durationMs =
        completedAt.getTime() -
        startedAt.getTime();

      const message =
        typeof detailFormatter === 'function'
          ? detailFormatter(stepResult)
          : '';

      this.safeAudit_({
        timestamp: completedAt,
        runId: runId,
        module: moduleName,
        status: 'SUCCESS',
        message: message,
        durationMs: durationMs
      });

      return stepResult;
    } catch (error) {
      const completedAt = new Date();

      const durationMs =
        completedAt.getTime() -
        startedAt.getTime();

      this.safeAudit_({
        timestamp: completedAt,
        runId: runId,
        module: moduleName,
        status: 'FAILED',
        message: error.message,
        durationMs: durationMs
      });

      throw error;
    }
  },

  /**
   * Writes audit records without allowing audit failure
   * to hide or replace the original pipeline result.
   *
   * @param {Object} record Audit record.
   */
  safeAudit_(record) {
    try {
      TOS_PIPELINE_AUDIT_LOGGER.log(record);
    } catch (auditError) {
      Logger.log(
        'Audit log warning: ' +
        auditError.message
      );
    }
  },

  /**
   * Logs remaining modules as SKIPPED after pipeline failure.
   *
   * @param {string} runId Pipeline RunID.
   * @param {string[]} completedModules Modules already completed.
   * @param {string} failedModule Module where execution stopped.
   */
  logSkippedModules_(
    runId,
    completedModules,
    failedModule
  ) {
    const orderedModules = [
      this.MODULES.SAFETY,
      this.MODULES.TRADE_MONITOR,
      this.MODULES.LIFECYCLE,
      this.MODULES.LEG_EXIT_SYNC,
      this.MODULES.TRADE_FINALIZER
    ];

    const failedIndex =
      orderedModules.indexOf(failedModule);

    if (failedIndex < 0) {
      return;
    }

    for (
      let index = failedIndex + 1;
      index < orderedModules.length;
      index++
    ) {
      const moduleName =
        orderedModules[index];

      if (
        completedModules.indexOf(
          moduleName
        ) !== -1
      ) {
        continue;
      }

      this.safeAudit_({
        timestamp: new Date(),
        runId: runId,
        module: moduleName,
        status: 'SKIPPED',
        message:
          'Skipped because an earlier pipeline stage failed.',
        durationMs: 0
      });
    }
  },

  /**
   * Loads the cached IBKR snapshot and verifies it is safe
   * before any lifecycle module is allowed to write.
   *
   * @return {Object} Safety validation result.
   */
  validateSnapshotBeforeWrites_() {
    const xml =
      TOS_IBKR_FLEX.getLastXml();

    if (!xml) {
      throw new Error(
        'No cached IBKR XML found. ' +
        'Run testIBKRFlexConnection successfully first.'
      );
    }

    const parsed =
      TOS_IBKR_FLEX_PARSER.parse(xml);

    const openPositions =
      parsed.openPositions || [];

    const data =
      TOS_EXIT_SYNCHRONIZER
        .loadDataFromSheets_();

    return TOS_DDC_PIPELINE_SAFETY
      .validateOpenPositionsSnapshot_(
        data.masterTrades,
        openPositions
      );
  }
};

/**
 * Official production entry point.
 *
 * Writes to:
 * - TRADE_LEGS
 * - MASTER_TRADES
 * - SYNC_LOG
 *
 * Uses the latest cached IBKR Flex XML.
 */
function runTradingOS() {
  return TOS_DDC_PIPELINE.run();
}

/**
 * Backward compatibility.
 *
 * This function performs real writes.
 */
function testTradingOSDdcPipeline() {
  return runTradingOS();
}