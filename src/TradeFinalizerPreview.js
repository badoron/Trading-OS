/**
 * Trading OS - Trade Finalizer Preview
 *
 * Read-only integration preview for DDC trade finalization.
 *
 * Reads:
 * - MASTER_TRADES
 * - TRADE_LEGS
 *
 * Writes:
 * - Nothing
 */

const TOS_TRADE_FINALIZER_PREVIEW = {
  run() {
    const data =
      TOS_EXIT_SYNCHRONIZER.loadDataFromSheets_();

    const results = [];

    data.masterTrades.forEach(masterTrade => {
      const strategyId =
        TOS_TRADE_FINALIZER.text_(
          masterTrade.strategyId
        ).toUpperCase();

      const workflowStatus =
        TOS_TRADE_FINALIZER.text_(
          masterTrade.workflowStatus
        ).toUpperCase();

      if (strategyId !== 'DDC') {
        return;
      }

      if (
        workflowStatus !== 'OPEN' &&
        workflowStatus !== 'PARTIAL_EXIT' &&
        workflowStatus !==
          'CLOSED_PENDING_EXIT_SYNC'
      ) {
        return;
      }

      const tradeId =
        TOS_TRADE_FINALIZER.text_(
          masterTrade.tradeId
        );

      const legs =
        data.legsByTradeId[tradeId] || [];

      const summary =
        TOS_TRADE_FINALIZER
          .summarizeTrade_(legs);

      results.push({
        tradeId: tradeId,
        currentStatus: workflowStatus,
        proposedStatus:
          summary.workflowStatus,
        readyToClose:
          summary.readyToClose,
        totalLegs:
          summary.totalLegs,
        closedLegs:
          summary.closedLegs,
        openLegs:
          summary.openLegs,
        realizedPnL:
          summary.realizedPnL,
        commission:
          summary.commission,
        exitDateTime:
          summary.exitDateTime
      });
    });

    const result = {
      tradesChecked: results.length,
      readyToClose: 0,
      remainingPartial: 0,
      writesPerformed: 0,
      results: results
    };

    Logger.log(
      '========================================'
    );
    Logger.log('DDC TRADE FINALIZER PREVIEW');
    Logger.log(
      '========================================'
    );

    results.forEach(item => {
      if (item.readyToClose) {
        result.readyToClose++;
      } else {
        result.remainingPartial++;
      }

      Logger.log(
        '----------------------------------------'
      );

      Logger.log(
        'TradeID=' + item.tradeId
      );

      Logger.log(
        'CurrentStatus=' +
        item.currentStatus
      );

      Logger.log(
        'ProposedStatus=' +
        item.proposedStatus
      );

      Logger.log(
        'ClosedLegs=' +
        item.closedLegs +
        '/' +
        item.totalLegs
      );

      Logger.log(
        'OpenLegs=' + item.openLegs
      );

      Logger.log(
        'ReadyToClose=' +
        item.readyToClose
      );

      Logger.log(
        'RealizedPnL=' +
        item.realizedPnL
      );

      Logger.log(
        'Commission=' +
        item.commission
      );

      Logger.log(
        'ExitDateTime=' +
        (
          item.exitDateTime ||
          'NOT_FOUND'
        )
      );
    });

    Logger.log(
      '========================================'
    );

    Logger.log(
      'Trade finalizer preview completed.' +
      ' TradesChecked=' +
      result.tradesChecked +
      ', ReadyToClose=' +
      result.readyToClose +
      ', RemainingPartial=' +
      result.remainingPartial +
      ', WritesPerformed=' +
      result.writesPerformed
    );

    return result;
  }
};

/**
 * Read-only integration preview.
 *
 * Does not write to Google Sheets.
 */
function testTradeFinalizerPreview() {
  return TOS_TRADE_FINALIZER_PREVIEW.run();
}