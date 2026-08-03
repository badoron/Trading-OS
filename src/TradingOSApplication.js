/**
 * Trading OS - Application Orchestrator
 *
 * Coordinates the existing Trading OS services.
 *
 * Responsibilities:
 * - Run the production DDC pipeline.
 * - Record an account-history snapshot.
 * - Refresh Dashboard.
 * - Refresh Home.
 * - Capture non-critical service failures.
 *
 * Non-responsibilities:
 * - Trade lifecycle business logic.
 * - IBKR XML parsing rules.
 * - Spreadsheet rendering details.
 */

const TOS_TRADING_OS_APPLICATION = {
  /**
   * Runs the production Trading OS application.
   *
   * @return {Object} Application execution result.
   */
  run() {
    return this.runWithDependencies_(
      this.buildProductionDependencies_()
    );
  },

  /**
   * Runs the application using injected dependencies.
   *
   * The DDC pipeline is considered a critical operation:
   * if it throws, execution stops and the error is rethrown.
   *
   * Account History, Dashboard and Home are secondary
   * operations. Their failures are captured without preventing
   * the remaining secondary operations from running.
   *
   * @param {Object} dependencies Injected application functions.
   * @return {Object} Application result.
   */
  runWithDependencies_(dependencies) {
    const deps =
      dependencies || {};

    this.validateDependencies_(
      deps
    );

    const startedAt =
      deps.now();

    const spreadsheet =
      deps.getSpreadsheet();

    const brokerSnapshot =
      deps.loadBrokerSnapshot() || {};

    /*
     * Critical operation.
     *
     * Intentionally not wrapped by runSecondaryStep_().
     * A pipeline failure must stop the application and preserve
     * the original error.
     */
    const ddcPipeline =
      deps.runDdcPipeline(
        brokerSnapshot
      );

    const residualPositions =
      typeof deps.syncResidualPositions === 'function'
        ? this.runSecondaryStep_(function () {
            return deps.syncResidualPositions(
              brokerSnapshot.openPositions || [],
              startedAt
            );
          })
        : {
            success: true,
            skipped: true
          };

    const masterTrades =
      typeof deps.loadMasterTrades ===
        'function'
        ? (
            deps.loadMasterTrades(
              spreadsheet
            ) || []
          )
        : (
            brokerSnapshot.trades ||
            []
          );

    const runId =
      this.text_(
        ddcPipeline &&
        ddcPipeline.runId
      );

    const accountHistory =
      this.runSecondaryStep_(
        function () {
          return deps.recordAccountHistory({
            spreadsheet:
              spreadsheet,

            accountInfo:
              brokerSnapshot.accountInfo ||
              null,

            trades:
              masterTrades,

            runId:
              runId,

            timestamp:
              startedAt
          });
        }
      );

    const dashboard =
      this.runSecondaryStep_(
        function () {
          return deps.refreshDashboard();
        }
      );

    const home =
      this.runSecondaryStep_(
        function () {
          return deps.refreshHome();
        }
      );

    const completedAt =
      deps.now();

    const success =
      residualPositions.success !== false &&
      accountHistory.success !== false &&
      dashboard.success !== false &&
      home.success !== false;

    return {
      success:
        success,

      startedAt:
        startedAt,

      completedAt:
        completedAt,

      durationMs:
        this.durationMs_(
          startedAt,
          completedAt
        ),

      brokerSnapshot:
        brokerSnapshot,

      ddcPipeline:
        ddcPipeline,

      residualPositions:
        residualPositions,

      accountHistory:
        accountHistory,

      dashboard:
        dashboard,

      home:
        home
    };
  },

  /**
   * Creates the production dependency adapter.
   *
   * @return {Object} Production dependencies.
   */
  buildProductionDependencies_() {
    return {
      now: function () {
        return new Date();
      },

      getSpreadsheet: function () {
        return SpreadsheetApp
          .getActiveSpreadsheet();
      },

      loadBrokerSnapshot: function () {
        const xml =
          TOS_IBKR_FLEX.getLastXml();

        if (!xml) {
          throw new Error(
            'No cached IBKR XML found. ' +
            'Run the IBKR Flex connection successfully first.'
          );
        }

        const parsed =
          TOS_IBKR_FLEX_PARSER.parse(
            xml
          );

        return {
          accountInfo:
            parsed.accountInfo ||
            null,

          trades:
            parsed.trades ||
            [],

          openPositions:
            parsed.openPositions ||
            [],

          equitySummaries:
            parsed.equitySummaries ||
            []
        };
      },

      runDdcPipeline: function (snapshot) {
        return TOS_DDC_PIPELINE
          .runWithSnapshot_(
            snapshot
          );
      },

      syncResidualPositions:
        function (openPositions, timestamp) {
          return TOS_RESIDUAL_POSITION_MANAGER
            .synchronizeWithOpenPositions_(
              openPositions,
              timestamp
            );
        },

      loadMasterTrades:
        function (spreadsheet) {
          const sheet =
            spreadsheet.getSheetByName(
              TOS_DASHBOARD_SERVICE
                .MASTER_TRADES
            );

          if (!sheet) {
            throw new Error(
              'Missing sheet: ' +
              TOS_DASHBOARD_SERVICE
                .MASTER_TRADES
            );
          }

          const table =
            TOS_DASHBOARD_SERVICE
              .getTable_(
                sheet,
                [
                  'TradeID',
                  'StrategyID',
                  'Symbol',
                  'WorkflowStatus'
                ]
              );

          return TOS_DASHBOARD_SERVICE
            .normalizeMasterTrades_(
              table
            )
            .map(function (trade) {
              return {
                Status:
                  trade.workflowStatus
              };
            });
        },

      recordAccountHistory:
        function (input) {
          return TOS_ACCOUNT_HISTORY_SERVICE
            .recordSnapshot(
              input
            );
        },

      refreshDashboard:
        function () {
          return TOS_DASHBOARD_SERVICE
            .refreshDashboard();
        },

      refreshHome:
        function () {
          return TOS_HOME_SERVICE
            .refreshHome();
        }
    };
  },

  /**
   * Executes a non-critical application step.
   *
   * Successful calls return their original result.
   * Failed calls return a normalized failure result.
   *
   * @param {Function} callback Secondary operation.
   * @return {*} Original result or captured failure.
   */
  runSecondaryStep_(callback) {
    try {
      return callback();
    } catch (error) {
      const message =
        error &&
        error.message
          ? error.message
          : String(error);

      Logger.log(
        'Trading OS application warning: ' +
        message
      );

      return {
        success:
          false,

        error:
          message
      };
    }
  },

  /**
   * Validates injected dependencies.
   *
   * @param {Object} dependencies Dependency object.
   */
  validateDependencies_(dependencies) {
    const required = [
      'now',
      'getSpreadsheet',
      'loadBrokerSnapshot',
      'runDdcPipeline',
      'recordAccountHistory',
      'refreshDashboard',
      'refreshHome'
    ];

    required.forEach(
      (name) => {
        if (
          typeof dependencies[name] !==
          'function'
        ) {
          throw this.createError_(
            TOS_ERROR_CODE.DEPENDENCY_MISSING,
            'TradingOSApplication requires dependency: ' +
            name
          );
        }
      }
    );
  },

  /**
   * Creates an Error with a stable machine-readable code.
   *
   * @param {string} code Stable error code.
   * @param {string} message Human-readable message.
   * @return {Error} Coded error.
   */
  createError_(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  },

  /**
   * Calculates duration safely.
   *
   * @param {*} startedAt Start date.
   * @param {*} completedAt Completion date.
   * @return {number} Duration in milliseconds.
   */
  durationMs_(
    startedAt,
    completedAt
  ) {
    const start =
      startedAt instanceof Date
        ? startedAt.getTime()
        : new Date(
            startedAt
          ).getTime();

    const completed =
      completedAt instanceof Date
        ? completedAt.getTime()
        : new Date(
            completedAt
          ).getTime();

    if (
      Number.isNaN(start) ||
      Number.isNaN(completed)
    ) {
      return 0;
    }

    return Math.max(
      0,
      completed - start
    );
  },

  /**
   * Normalizes arbitrary values to text.
   *
   * @param {*} value Any value.
   * @return {string} Trimmed text.
   */
  text_(value) {
    return String(
      value === null ||
      value === undefined
        ? ''
        : value
    ).trim();
  }
};


/**
 * Full synchronization orchestrator.
 *
 * Reuses the existing production services in this order:
 * 1. Download and cache the latest IBKR Flex XML.
 * 2. Parse and validate the cached XML.
 * 3. Detect active DDC groups and upsert IMPORT_REVIEW.
 * 4. Process rows already marked Import/Approve.
 * 5. Pause safely when active groups still require review.
 * 6. Run the existing Trading OS application pipeline.
 */
const TOS_TRADING_OS_FULL_SYNC = {
  STATUS: {
    SUCCESS: 'SUCCESS',
    PAUSED_FOR_REVIEW: 'PAUSED_FOR_REVIEW',
    FAILED: 'FAILED'
  },

  STAGES: {
    DOWNLOAD_XML: 'DOWNLOAD_XML',
    PARSE_XML: 'PARSE_XML',
    IMPORT_REVIEW: 'IMPORT_REVIEW',
    IMPORT_APPROVAL: 'IMPORT_APPROVAL',
    REVIEW_GATE: 'REVIEW_GATE',
    APPLICATION: 'APPLICATION'
  },

  run() {
    return this.runWithDependencies_(
      this.buildProductionDependencies_()
    );
  },

  runWithDependencies_(dependencies) {
    const deps = dependencies || {};
    this.validateDependencies_(deps);

    const startedAt = deps.now();
    const fullSyncRunId = deps.createRunId(startedAt);
    const stages = [];

    Logger.log('========================================');
    Logger.log('TRADING OS FULL SYNCHRONIZATION');
    Logger.log('FullSyncRunID=' + fullSyncRunId);
    Logger.log('========================================');

    try {
      const xml = this.runStage_(
        this.STAGES.DOWNLOAD_XML,
        stages,
        function () {
          return deps.downloadAndCacheXml();
        }
      );

      const snapshot = this.runStage_(
        this.STAGES.PARSE_XML,
        stages,
        function () {
          return deps.parseXml(xml);
        }
      );

      const activeGroups = this.runStage_(
        this.STAGES.IMPORT_REVIEW,
        stages,
        function () {
          const groups = deps.detectActiveDdcGroups();
          const written = deps.writeImportReview(groups);

          return {
            groups: groups || [],
            written: written || 0
          };
        }
      );

      const approval = this.runStage_(
        this.STAGES.IMPORT_APPROVAL,
        stages,
        function () {
          return deps.approvePendingImports();
        }
      );

      const pending = this.runStage_(
        this.STAGES.REVIEW_GATE,
        stages,
        function () {
          return deps.getPendingActiveReviews(
            activeGroups.groups
          );
        }
      );

      if (pending.count > 0) {
        const completedAt = deps.now();
        const result = {
          success: false,
          status: this.STATUS.PAUSED_FOR_REVIEW,
          fullSyncRunId: fullSyncRunId,
          startedAt: startedAt,
          completedAt: completedAt,
          durationMs: this.durationMs_(startedAt, completedAt),
          stages: stages,
          snapshot: snapshot,
          activeGroups: activeGroups,
          approval: approval,
          pendingReviews: pending,
          application: null
        };

        deps.logStatus(
          'FULL_SYNC',
          'Paused for review. Pending active imports=' + pending.count,
          'WARN'
        );

        Logger.log(
          'FULL SYNC PAUSED - Pending active imports=' +
          pending.count
        );

        deps.showResult(result);
        return result;
      }

      const application = this.runStage_(
        this.STAGES.APPLICATION,
        stages,
        function () {
          return deps.runApplication();
        }
      );

      const completedAt = deps.now();
      const success = application.success !== false;
      const result = {
        success: success,
        status: success ? this.STATUS.SUCCESS : this.STATUS.FAILED,
        fullSyncRunId: fullSyncRunId,
        startedAt: startedAt,
        completedAt: completedAt,
        durationMs: this.durationMs_(startedAt, completedAt),
        stages: stages,
        snapshot: snapshot,
        activeGroups: activeGroups,
        approval: approval,
        pendingReviews: pending,
        application: application
      };

      deps.logStatus(
        'FULL_SYNC',
        success
          ? 'Full synchronization completed successfully.'
          : 'Full synchronization completed with secondary failures.',
        success ? 'SUCCESS' : 'ERROR'
      );

      deps.showResult(result);
      return result;
    } catch (error) {
      const completedAt = deps.now();
      const failedStage = error.fullSyncStage || 'UNKNOWN';
      const result = {
        success: false,
        status: this.STATUS.FAILED,
        fullSyncRunId: fullSyncRunId,
        startedAt: startedAt,
        completedAt: completedAt,
        durationMs: this.durationMs_(startedAt, completedAt),
        failedStage: failedStage,
        error: error && error.message ? error.message : String(error),
        stages: stages
      };

      deps.logStatus(
        'FULL_SYNC',
        'Failed at stage ' + failedStage + ': ' + result.error,
        'ERROR'
      );

      deps.showResult(result);
      throw error;
    }
  },

  runStage_(stageName, stages, callback) {
    const startedAt = new Date();
    Logger.log('FULL SYNC STAGE START: ' + stageName);

    try {
      const output = callback();
      const completedAt = new Date();

      stages.push({
        stage: stageName,
        status: 'SUCCESS',
        durationMs: this.durationMs_(startedAt, completedAt)
      });

      Logger.log('FULL SYNC STAGE SUCCESS: ' + stageName);
      return output;
    } catch (error) {
      const completedAt = new Date();
      stages.push({
        stage: stageName,
        status: 'FAILED',
        durationMs: this.durationMs_(startedAt, completedAt),
        error: error && error.message ? error.message : String(error)
      });

      error.fullSyncStage = stageName;
      Logger.log(
        'FULL SYNC STAGE FAILED: ' +
        stageName +
        ' | ' +
        (error.message || error)
      );
      throw error;
    }
  },

  buildProductionDependencies_() {
    return {
      now: function () {
        return new Date();
      },

      createRunId: function (date) {
        return TOS_PIPELINE_AUDIT_LOGGER.createRunId_(date);
      },

      downloadAndCacheXml: function () {
        return TOS_IBKR_FLEX.testConnection();
      },

      parseXml: function (xml) {
        if (!xml) {
          throw new Error('IBKR XML download returned empty content.');
        }

        const parsed = TOS_IBKR_FLEX_PARSER.parse(xml);

        if (!parsed || !Array.isArray(parsed.openPositions)) {
          throw new Error('IBKR XML parser did not return OpenPositions.');
        }

        Logger.log(
          'Full sync parser summary: Trades=' +
          (parsed.trades || []).length +
          ', OpenPositions=' +
          parsed.openPositions.length +
          ', AccountInfo=' +
          (parsed.accountInfo ? 1 : 0)
        );

        return parsed;
      },

      detectActiveDdcGroups: function () {
        return TOS_OPEN_POSITION_GROUPER
          .detectActiveDdcFromCachedXml();
      },

      writeImportReview: function (groups) {
        return TOS_IMPORT_REVIEW_WRITER
          .writeDDCGroups(groups);
      },

      approvePendingImports: function () {
        return TOS_IMPORT_APPROVER
          .approvePendingImports();
      },

      getPendingActiveReviews: function (groups) {
        return TOS_TRADING_OS_FULL_SYNC
          .getPendingActiveReviews_(groups);
      },

      runApplication: function () {
        return TOS_TRADING_OS_APPLICATION.run();
      },

      logStatus: function (module, message, status) {
        tosLog_(module, message, status);
      },

      showResult: function (result) {
        TOS_TRADING_OS_FULL_SYNC.showResult_(result);
      }
    };
  },

  getPendingActiveReviews_(groups) {
    const activeIds = {};
    (groups || []).forEach(function (group) {
      activeIds[String(group.groupId || '').trim()] = group;
    });

    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName('IMPORT_REVIEW');

    if (!sheet) {
      throw new Error('Missing sheet: IMPORT_REVIEW');
    }

    const table = TOS_IMPORT_APPROVER.getTable_(
      sheet,
      ['DetectedGroupID', 'ReviewStatus']
    );

    const pending = [];

    table.rows.forEach(function (item) {
      const groupId = String(
        TOS_IMPORT_APPROVER.getCell_(
          item.row,
          table.headers,
          'DetectedGroupID'
        ) || ''
      ).trim();

      if (!activeIds[groupId]) {
        return;
      }

      const importDecision = String(
        TOS_IMPORT_APPROVER.getCell_(
          item.row,
          table.headers,
          'ImportDecision'
        ) || ''
      ).trim().toUpperCase();

      const reviewStatus = String(
        TOS_IMPORT_APPROVER.getCell_(
          item.row,
          table.headers,
          'ReviewStatus'
        ) || ''
      ).trim().toUpperCase();

      if (
        importDecision === 'IMPORTED' ||
        reviewStatus === 'IMPORTED'
      ) {
        return;
      }

      const group = activeIds[groupId] || {};
      pending.push({
        rowNumber: item.rowNumber,
        groupId: groupId,
        symbol: group.symbol || ''
      });
    });

    return {
      count: pending.length,
      items: pending
    };
  },

  showResult_(result) {
    const ui = SpreadsheetApp.getUi();

    if (result.status === this.STATUS.PAUSED_FOR_REVIEW) {
      ui.alert(
        'Trading OS synchronization paused',
        'XML download: Success\n' +
        'Parser: Success\n' +
        'Import Review: Updated\n' +
        'Pending decisions: ' + result.pendingReviews.count + '\n\n' +
        'Open IMPORT_REVIEW, select Import for the new trades, and run Full Synchronization again.',
        ui.ButtonSet.OK
      );
      return;
    }

    if (result.status === this.STATUS.FAILED) {
      ui.alert(
        'Trading OS synchronization failed',
        'Failed stage: ' + (result.failedStage || 'UNKNOWN') + '\n\n' +
        (result.error || 'Unknown error'),
        ui.ButtonSet.OK
      );
      return;
    }

    const pipeline = result.application && result.application.ddcPipeline;
    const lifecycle = pipeline && pipeline.lifecycle;
    const tradeMonitor = pipeline && pipeline.tradeMonitor;

    ui.alert(
      'Trading OS synchronization completed',
      'XML download: Success\n' +
      'Parser: Success\n' +
      'Active DDC groups: ' + result.activeGroups.groups.length + '\n' +
      'Pending imports: 0\n' +
      'Open trades: ' + (lifecycle ? lifecycle.open : '') + '\n' +
      'Open legs updated: ' + (tradeMonitor ? tradeMonitor.updated : '') + '\n' +
      'Residuals closed: ' +
      (result.application.residualPositions &&
       result.application.residualPositions.closed !== undefined
        ? result.application.residualPositions.closed
        : '') + '\n' +
      'Dashboard: ' +
      (result.application.dashboard.success === false ? 'Failed' : 'Refreshed') + '\n' +
      'HOME: ' +
      (result.application.home.success === false ? 'Failed' : 'Refreshed') + '\n' +
      'Run ID: ' + (pipeline ? pipeline.runId : result.fullSyncRunId),
      ui.ButtonSet.OK
    );
  },

  validateDependencies_(dependencies) {
    const required = [
      'now',
      'createRunId',
      'downloadAndCacheXml',
      'parseXml',
      'detectActiveDdcGroups',
      'writeImportReview',
      'approvePendingImports',
      'getPendingActiveReviews',
      'runApplication',
      'logStatus',
      'showResult'
    ];

    required.forEach(function (name) {
      if (typeof dependencies[name] !== 'function') {
        throw new Error(
          'TradingOSFullSync requires dependency: ' + name
        );
      }
    });
  },

  durationMs_(startedAt, completedAt) {
    return TOS_TRADING_OS_APPLICATION.durationMs_(
      startedAt,
      completedAt
    );
  }
};

/**
 * Runs the full Trading OS application.
 *
 * This performs real spreadsheet writes.
 *
 * @return {Object} Application result.
 */
function runTradingOSApplication() {
  return TOS_TRADING_OS_APPLICATION
    .run();
}
function runDdcPipeline(snapshot) {
  return TOS_TRADING_OS_APPLICATION.runDdcPipeline(snapshot);
}

/**
 * One-button production synchronization.
 *
 * Downloads XML, refreshes import review, processes approved imports,
 * pauses safely for unresolved reviews, then runs the full application.
 *
 * @return {Object} Full synchronization result.
 */
function runFullTradingOSSync() {
  return TOS_TRADING_OS_FULL_SYNC.run();
}
