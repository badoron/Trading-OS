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
      deps.runDdcPipeline();

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
              brokerSnapshot.trades ||
              [],

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

      runDdcPipeline: function () {
        return TOS_DDC_PIPELINE.run();
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
      function (name) {
        if (
          typeof dependencies[name] !==
          'function'
        ) {
          throw new Error(
            'TradingOSApplication requires dependency: ' +
            name
          );
        }
      }
    );
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