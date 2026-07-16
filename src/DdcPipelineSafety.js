/**
 * Trading OS - DDC Pipeline Safety
 *
 * Guards the DDC lifecycle pipeline against suspicious
 * or incomplete IBKR Open Positions snapshots.
 *
 * Safety rule:
 * - If active DDC trades exist in MASTER_TRADES
 * - And IBKR returns zero Open Positions
 * - The pipeline must stop before lifecycle writes occur
 *
 * This module contains isolated validation logic only.
 */

const TOS_DDC_PIPELINE_SAFETY = {
  ACTIVE_STATUSES: [
    'OPEN',
    'PARTIAL_EXIT',
    'CLOSED_PENDING_EXIT_SYNC'
  ],

  /**
   * Validates whether an IBKR Open Positions snapshot is safe
   * to use for DDC lifecycle updates.
   *
   * @param {Object[]} masterTrades Normalized MASTER_TRADES rows.
   * @param {Object[]} openPositions Parsed IBKR Open Positions.
   * @return {Object} Validation result.
   */
  validateOpenPositionsSnapshot_(
    masterTrades,
    openPositions
  ) {
    const safeMasterTrades = masterTrades || [];
    const safeOpenPositions = openPositions || [];

    const activeDdcTrades = safeMasterTrades.filter(
      trade => {
        const strategyId = this.text_(
          trade && trade.strategyId
        ).toUpperCase();

        const workflowStatus = this.text_(
          trade && trade.workflowStatus
        ).toUpperCase();

        return (
          strategyId === 'DDC' &&
          this.ACTIVE_STATUSES.indexOf(
            workflowStatus
          ) !== -1
        );
      }
    );

    const activeTrades = activeDdcTrades.length;
    const openPositionCount =
      safeOpenPositions.length;

    if (
      activeTrades > 0 &&
      openPositionCount === 0
    ) {
      return {
        safeToContinue: false,
        reason:
          'EMPTY_OPEN_POSITIONS_WITH_ACTIVE_TRADES',
        activeTrades: activeTrades,
        openPositions: openPositionCount
      };
    }

    return {
      safeToContinue: true,
      reason: '',
      activeTrades: activeTrades,
      openPositions: openPositionCount
    };
  },

  text_(value) {
    return String(
      value === null ||
      value === undefined
        ? ''
        : value
    ).trim();
  }
};