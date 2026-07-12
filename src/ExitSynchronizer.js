/**
 * Trading OS - Exit Synchronizer
 *
 * Matches IBKR closing executions to imported trade legs.
 *
 * V1 scope:
 * - DDC trades only
 * - Match by BrokerContractID / conid
 * - SHORT legs close with BUY
 * - LONG legs close with SELL
 * - Only executions marked as closing are accepted
 * - Summarize realized PnL, commissions and final exit time
 *
 * This module currently contains isolated calculation logic only.
 * It does not read or write Google Sheets yet.
 */

const TOS_EXIT_SYNCHRONIZER = {
  /**
   * Finds all closing executions that belong to one trade leg.
   *
   * @param {Object} leg Imported TRADE_LEGS record.
   * @param {Object[]} trades Parsed IBKR trades.
   * @return {Object[]} Matching closing executions.
   */
  findClosingTradesForLeg_(leg, trades) {
    const contractId = this.text_(
      leg && leg.brokerContractId
    );

    const longShort = this.text_(
      leg && leg.longShort
    ).toUpperCase();

    if (!contractId || !longShort) {
      return [];
    }

    const expectedClosingSide =
      longShort === 'SHORT'
        ? 'BUY'
        : longShort === 'LONG'
          ? 'SELL'
          : '';

    if (!expectedClosingSide) {
      return [];
    }

    return (trades || []).filter(trade => {
      const tradeContractId = this.text_(
        trade && trade.conid
      );

      const buySell = this.text_(
        trade && trade.buySell
      ).toUpperCase();

      const openCloseIndicator = this.text_(
        trade && trade.openCloseIndicator
      ).toUpperCase();

      return (
        tradeContractId === contractId &&
        buySell === expectedClosingSide &&
        openCloseIndicator === 'C'
      );
    });
  },

  /**
   * Builds a closing summary for all legs in a trade.
   *
   * A trade is fully matched only when every original leg has at least
   * one matching closing execution.
   *
   * @param {Object[]} legs Imported trade legs.
   * @param {Object[]} trades Parsed IBKR trades.
   * @return {Object} Closing summary.
   */
  summarizeClosedTrade_(legs, trades) {
    const safeLegs = legs || [];
    const safeTrades = trades || [];

    let matchedLegs = 0;
    let realizedPnL = 0;
    let commission = 0;
    let exitDateTime = '';

    safeLegs.forEach(leg => {
      const matchingTrades =
        this.findClosingTradesForLeg_(
          leg,
          safeTrades
        );

      if (matchingTrades.length === 0) {
        return;
      }

      matchedLegs++;

      matchingTrades.forEach(trade => {
        realizedPnL += this.number_(
          trade.fifoPnlRealized
        );

        commission += this.number_(
          trade.ibCommission
        );

        const tradeDateTime = this.text_(
          trade.dateTime
        );

        if (
          tradeDateTime &&
          (
            !exitDateTime ||
            tradeDateTime > exitDateTime
          )
        ) {
          exitDateTime = tradeDateTime;
        }
      });
    });

    return {
      fullyMatched:
        safeLegs.length > 0 &&
        matchedLegs === safeLegs.length,

      matchedLegs: matchedLegs,
      totalLegs: safeLegs.length,

      realizedPnL:
        this.roundMoney_(realizedPnL),

      commission:
        this.roundMoney_(commission),

      exitDateTime: exitDateTime
    };
  },

  /**
   * Safely converts values to trimmed strings.
   *
   * @param {*} value Any value.
   * @return {string} Normalized string.
   */
  text_(value) {
    return String(
      value === null || value === undefined
        ? ''
        : value
    ).trim();
  },

  /**
   * Safely converts IBKR numeric values to numbers.
   *
   * Blank and invalid values become zero.
   *
   * @param {*} value Any numeric value.
   * @return {number} Parsed number.
   */
  number_(value) {
    const normalized = this.text_(value);

    if (!normalized) {
      return 0;
    }

    const parsed = Number(
      normalized.replace(/,/g, '')
    );

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  },

  /**
   * Prevents floating-point precision artifacts in currency totals.
   *
   * @param {number} value Numeric currency value.
   * @return {number} Value rounded to two decimals.
   */
  roundMoney_(value) {
    return Math.round(
      (Number(value) + Number.EPSILON) * 100
    ) / 100;
  }
};