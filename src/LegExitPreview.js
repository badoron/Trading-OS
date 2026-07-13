/**
 * Trading OS - Leg Exit Preview
 *
 * Read-only integration preview for incremental DDC leg exits.
 *
 * Reads:
 * - MASTER_TRADES
 * - TRADE_LEGS
 * - Cached IBKR Flex trades
 *
 * Writes:
 * - Nothing
 */

const TOS_LEG_EXIT_PREVIEW = {
  /**
   * Builds and logs proposed leg-exit updates from real data.
   *
   * This function does not modify Google Sheets.
   *
   * @return {Object} Preview result.
   */
  run() {
    const data =
      TOS_EXIT_SYNCHRONIZER.loadDataFromSheets_();

    const updates =
      TOS_EXIT_SYNCHRONIZER.buildLegExitPreview_(
        data.masterTrades,
        data.legsByTradeId,
        data.trades
      );

    const result = {
      proposedUpdates: updates.length,
      expirations: 0,
      trades: 0,
      writesPerformed: 0,
      updates: updates
    };

    Logger.log(
      '========================================'
    );
    Logger.log('DDC LEG EXIT PREVIEW');
    Logger.log(
      '========================================'
    );

    Logger.log(
      'IBKR trades available: ' +
      data.trades.length
    );

    Logger.log(
      'Proposed leg updates: ' +
      updates.length
    );

    if (updates.length === 0) {
      Logger.log(
        'No closed DDC legs were found for synchronization.'
      );
    }

    updates.forEach(function (update) {
      if (update.exitType === 'EXPIRATION') {
        result.expirations++;
      } else {
        result.trades++;
      }

      Logger.log(
        '----------------------------------------'
      );

      Logger.log(
        'TradeID=' + update.tradeId
      );

      Logger.log(
        'BrokerContractID=' +
        update.brokerContractId
      );

      Logger.log(
        'SheetRow=' + update.rowNumber
      );

      Logger.log(
        'LegStatus=' + update.legStatus
      );

      Logger.log(
        'ExitType=' + update.exitType
      );

      Logger.log(
        'ExitPrice=' + update.exitPrice
      );

      Logger.log(
        'ExitDateTime=' +
        (
          update.exitDateTime ||
          'NOT_FOUND'
        )
      );

      Logger.log(
        'RealizedPnL=' +
        update.realizedPnL
      );

      Logger.log(
        'Commission=' +
        update.commission
      );

      Logger.log(
        'MatchedExecutions=' +
        update.matchedExecutions
      );
    });

    Logger.log(
      '========================================'
    );

    Logger.log(
      'Leg exit preview completed.' +
      ' ProposedUpdates=' +
      result.proposedUpdates +
      ', Expirations=' +
      result.expirations +
      ', Trades=' +
      result.trades +
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
function testLegExitPreview() {
  return TOS_LEG_EXIT_PREVIEW.run();
}