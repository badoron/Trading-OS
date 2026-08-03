/**
 * Trading OS - Trade Finalizer Writer
 *
 * Finalizes MASTER_TRADES rows after every original DDC leg is CLOSED.
 *
 * Writes:
 * - WorkflowStatus = CLOSED
 * - ExitDate
 * - RealizedPnL
 * - ExitReason
 *
 * Does not deduct Commission again from RealizedPnL.
 */

const TOS_TRADE_FINALIZER_WRITER = {
  MASTER_TRADES: 'MASTER_TRADES',

  EXIT_REASON:
    'All original DDC legs are closed. Final exit synchronization completed.',

  /**
   * Applies finalized trade updates to MASTER_TRADES.
   *
   * Only items with readyToClose=true are written.
   * Missing optional columns are ignored.
   *
   * @param {Object} sheet Google Sheet or compatible test double.
   * @param {string[]} headers MASTER_TRADES headers.
   * @param {Object[]} updates Proposed finalization updates.
   * @return {Object} Write result.
   */
  applyUpdates_(sheet, headers, updates) {
    const result = {
      updated: 0,
      skipped: 0,
      writesPerformed: 0
    };

    (updates || []).forEach(update => {
      const rowNumber = Number(
        update && update.rowNumber
      );

      const readyToClose =
        update &&
        update.readyToClose === true;

      if (
        !readyToClose ||
        !Number.isFinite(rowNumber) ||
        rowNumber <= 0
      ) {
        result.skipped++;
        return;
      }

      result.writesPerformed += this.setCell_(
        sheet,
        rowNumber,
        headers,
        'WorkflowStatus',
        'CLOSED'
      );

      result.writesPerformed += this.setCell_(
        sheet,
        rowNumber,
        headers,
        'ExitDate',
        update.exitDateTime
      );

      result.writesPerformed += this.setCell_(
        sheet,
        rowNumber,
        headers,
        'RealizedPnL',
        update.realizedPnL
      );

      result.writesPerformed += this.setCell_(
        sheet,
        rowNumber,
        headers,
        'ExitReason',
        this.EXIT_REASON
      );

      result.updated++;
    });

    return result;
  },

  /**
   * Builds finalization updates from normalized master trades and legs.
   *
   * Only DDC trades that are not already CLOSED are considered.
   * Only trades whose final original leg is CLOSED are returned.
   *
   * @param {Object[]} masterTrades Normalized MASTER_TRADES rows.
   * @param {Object} legsByTradeId TRADE_LEGS grouped by TradeID.
   * @return {Object[]} Ready-to-write finalization updates.
   */
  buildUpdates_(masterTrades, legsByTradeId) {
    const safeMasterTrades = masterTrades || [];
    const safeLegsByTradeId = legsByTradeId || {};
    const updates = [];

    safeMasterTrades.forEach(masterTrade => {
      const strategyId =
        TOS_TRADE_FINALIZER.text_(
          masterTrade &&
          masterTrade.strategyId
        ).toUpperCase();

      const currentStatus =
        TOS_TRADE_FINALIZER.text_(
          masterTrade &&
          masterTrade.workflowStatus
        ).toUpperCase();

      if (
        strategyId !== 'DDC' ||
        currentStatus === 'CLOSED'
      ) {
        return;
      }

      const tradeId =
        TOS_TRADE_FINALIZER.text_(
          masterTrade &&
          masterTrade.tradeId
        );

      if (!tradeId) {
        return;
      }

      const legs =
        safeLegsByTradeId[tradeId] || [];

      const summary =
        TOS_TRADE_FINALIZER.summarizeTrade_(
          legs
        );

      if (!summary.readyToClose) {
        return;
      }

      updates.push({
        rowNumber:
          masterTrade.rowNumber,

        tradeId: tradeId,

        readyToClose:
          summary.readyToClose,

        workflowStatus:
          summary.workflowStatus,

        exitDateTime:
          summary.exitDateTime,

        realizedPnL:
          summary.realizedPnL,

        commission:
          summary.commission,

        totalLegs:
          summary.totalLegs,

        closedLegs:
          summary.closedLegs
      });
    });

    return updates;
  },

  /**
   * Finalizes eligible DDC trades using current sheet data.
   *
   * TRADE_LEGS must already have been synchronized before this runs.
   *
   * @return {Object} Finalization result.
   */
  finalizeClosedTrades(snapshot) {
    const ss =
      SpreadsheetApp.getActiveSpreadsheet();

    const masterSheet =
      ss.getSheetByName(this.MASTER_TRADES);

    if (!masterSheet) {
      throw new Error(
        'Missing sheet: ' +
        this.MASTER_TRADES
      );
    }

    const data =
      TOS_EXIT_SYNCHRONIZER
        .loadDataFromSheets_(snapshot);

    const updates = this.buildUpdates_(
      data.masterTrades,
      data.legsByTradeId
    );

    const masterTable =
      TOS_EXIT_SYNCHRONIZER.getTable_(
        masterSheet,
        [
          'TradeID',
          'WorkflowStatus',
          'ExitDate',
          'RealizedPnL',
          'ExitReason'
        ]
      );

    const writeResult =
      this.applyUpdates_(
        masterSheet,
        masterTable.headers,
        updates
      );

    Logger.log(
      '========================================'
    );

    Logger.log('DDC TRADE FINALIZER');

    Logger.log(
      '========================================'
    );

    Logger.log(
      'ReadyToClose=' + updates.length
    );

    updates.forEach(update => {
      Logger.log(
        'TradeID=' +
        update.tradeId +
        ' | ClosedLegs=' +
        update.closedLegs +
        '/' +
        update.totalLegs +
        ' | ExitDate=' +
        update.exitDateTime +
        ' | RealizedPnL=' +
        update.realizedPnL +
        ' | Commission=' +
        update.commission
      );
    });

    Logger.log(
      'Trade finalizer completed.' +
      ' Updated=' +
      writeResult.updated +
      ', Skipped=' +
      writeResult.skipped +
      ', WritesPerformed=' +
      writeResult.writesPerformed
    );

    return {
      readyToClose: updates.length,
      updated: writeResult.updated,
      skipped: writeResult.skipped,
      writesPerformed:
        writeResult.writesPerformed,
      updates: updates
    };
  },

  /**
   * Writes a cell only when the target column exists.
   *
   * @return {number} 1 when written, otherwise 0.
   */
  setCell_(
    sheet,
    rowNumber,
    headers,
    name,
    value
  ) {
    const index = headers.indexOf(name);

    if (index < 0) {
      return 0;
    }

    sheet
      .getRange(
        rowNumber,
        index + 1
      )
      .setValue(value);

    return 1;
  }
};

/**
 * Real MASTER_TRADES finalization.
 *
 * Run only after leg exit synchronization.
 */
function testTradeFinalizerWriter() {
  return TOS_TRADE_FINALIZER_WRITER
    .finalizeClosedTrades();
}