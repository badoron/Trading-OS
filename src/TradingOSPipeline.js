/**
 * Trading OS - DDC E2E Pipeline
 *
 * Runs the current DDC lifecycle flow using cached IBKR Flex data.
 *
 * Order:
 * 1. Update open legs from IBKR Open Positions
 * 2. Update trade lifecycle
 * 3. Synchronize closed legs from IBKR Trades
 * 4. Finalize trades whose final original leg has closed
 *
 * V1 scope:
 * - DDC only
 * - Uses cached IBKR Flex XML
 */

const TOS_DDC_PIPELINE = {
  run() {
    const startedAt = new Date();

    const result = {
      startedAt: startedAt,
      tradeMonitor: null,
      lifecycle: null,
      legExitSync: null,
      tradeFinalizer: null,
      completedAt: null,
      success: false
    };

    Logger.log(
      '========================================'
    );
    Logger.log('TRADING OS DDC PIPELINE');
    Logger.log(
      '========================================'
    );

    try {
      Logger.log('STEP 1/4 - Trade Monitor');

      result.tradeMonitor =
        TOS_TRADE_MONITOR
          .updateOpenLegsFromIBKR();

      Logger.log('STEP 2/4 - Lifecycle Monitor');

      result.lifecycle =
        TOS_TRADE_LIFECYCLE_MONITOR
          .syncLifecycleFromOpenPositions();

      Logger.log('STEP 3/4 - Leg Exit Synchronizer');

      result.legExitSync =
        TOS_LEG_EXIT_WRITER
          .syncClosedLegsFromIBKR();

      Logger.log('STEP 4/4 - Trade Finalizer');

      result.tradeFinalizer =
        TOS_TRADE_FINALIZER_WRITER
          .finalizeClosedTrades();

      result.completedAt = new Date();
      result.success = true;

      Logger.log(
        '========================================'
      );

      Logger.log(
        'DDC pipeline completed successfully.'
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
        '========================================'
      );

      return result;
    } catch (error) {
      result.completedAt = new Date();

      Logger.log(
        'DDC pipeline failed: ' +
        error.message
      );

      throw error;
    }
  }
};

/**
 * Runs the full DDC lifecycle pipeline using cached IBKR data.
 *
 * This function writes to:
 * - TRADE_LEGS
 * - MASTER_TRADES
 */
function testTradingOSDdcPipeline() {
  return TOS_DDC_PIPELINE.run();
}