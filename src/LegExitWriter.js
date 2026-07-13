/**
 * Trading OS - Leg Exit Writer
 *
 * Applies synchronized DDC leg-exit data to TRADE_LEGS.
 *
 * Writes:
 * - ExitPrice
 * - LegStatus
 * - ExitDateTime
 * - RealizedPnL
 * - Commission
 *
 * This module does not update MASTER_TRADES.
 */

const TOS_LEG_EXIT_WRITER = {
  TRADE_LEGS: 'TRADE_LEGS',

  /**
   * Applies proposed leg updates to a sheet.
   *
   * Missing optional columns are ignored.
   * Updates without a valid row number are skipped.
   *
   * @param {Object} sheet Google Sheet or compatible test double.
   * @param {string[]} headers Sheet headers.
   * @param {Object[]} updates Proposed leg-exit updates.
   * @return {Object} Write summary.
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

      if (
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
        'ExitPrice',
        update.exitPrice
      );

      result.writesPerformed += this.setCell_(
        sheet,
        rowNumber,
        headers,
        'LegStatus',
        update.legStatus
      );

      result.writesPerformed += this.setCell_(
        sheet,
        rowNumber,
        headers,
        'ExitDateTime',
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
        'Commission',
        update.commission
      );

      result.updated++;
    });

    return result;
  },

  /**
   * Runs the real incremental leg synchronization.
   *
   * Reads:
   * - MASTER_TRADES
   * - TRADE_LEGS
   * - Cached IBKR Flex trades
   *
   * Writes:
   * - Closed-leg fields in TRADE_LEGS only
   *
   * @return {Object} Synchronization summary.
   */
  syncClosedLegsFromIBKR() {
    const ss =
      SpreadsheetApp.getActiveSpreadsheet();

    const legsSheet =
      ss.getSheetByName(this.TRADE_LEGS);

    if (!legsSheet) {
      throw new Error(
        'Missing sheet: ' + this.TRADE_LEGS
      );
    }

    const data =
      TOS_EXIT_SYNCHRONIZER
        .loadDataFromSheets_();

    const updates =
      TOS_EXIT_SYNCHRONIZER
        .buildLegExitPreview_(
          data.masterTrades,
          data.legsByTradeId,
          data.trades
        );

    const table =
      TOS_EXIT_SYNCHRONIZER.getTable_(
        legsSheet,
        [
          'TradeID',
          'BrokerContractID',
          'ExitPrice',
          'LegStatus',
          'ExitDateTime',
          'RealizedPnL',
          'Commission'
        ]
      );

    const writeResult = this.applyUpdates_(
      legsSheet,
      table.headers,
      updates
    );

    Logger.log(
      '========================================'
    );

    Logger.log('DDC LEG EXIT SYNC');

    Logger.log(
      '========================================'
    );

    Logger.log(
      'ProposedUpdates=' + updates.length
    );

    updates.forEach(update => {
      Logger.log(
        'TradeID=' +
        update.tradeId +
        ' | BrokerContractID=' +
        update.brokerContractId +
        ' | SheetRow=' +
        update.rowNumber +
        ' | LegStatus=' +
        update.legStatus +
        ' | ExitType=' +
        update.exitType +
        ' | ExitPrice=' +
        update.exitPrice +
        ' | ExitDateTime=' +
        update.exitDateTime +
        ' | RealizedPnL=' +
        update.realizedPnL +
        ' | Commission=' +
        update.commission
      );
    });

    Logger.log(
      'Leg exit sync completed.' +
      ' Updated=' +
      writeResult.updated +
      ', Skipped=' +
      writeResult.skipped +
      ', WritesPerformed=' +
      writeResult.writesPerformed
    );

    return {
      proposedUpdates: updates.length,
      updated: writeResult.updated,
      skipped: writeResult.skipped,
      writesPerformed:
        writeResult.writesPerformed,
      updates: updates
    };
  },

  /**
   * Writes a value only when the requested column exists.
   *
   * @param {Object} sheet Google Sheet.
   * @param {number} rowNumber Target row.
   * @param {string[]} headers Sheet headers.
   * @param {string} name Column name.
   * @param {*} value Value to write.
   * @return {number} 1 if written, otherwise 0.
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
 * Real write integration test.
 *
 * Updates only TRADE_LEGS.
 * Does not update MASTER_TRADES.
 */
function testLegExitWriter() {
  return TOS_LEG_EXIT_WRITER
    .syncClosedLegsFromIBKR();
}