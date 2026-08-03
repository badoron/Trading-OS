/**
 * Trading OS - Account History Context Builder
 *
 * Pure business-logic layer for preparing account-history context.
 *
 * Responsibilities:
 * - Normalize the incoming request.
 * - Count trades by lifecycle status.
 * - Preserve account information.
 * - Supply a stable timestamp and run ID.
 *
 * Non-responsibilities:
 * - Building the final account-history record.
 * - Defining sheet columns.
 * - Reading or writing Google Sheets.
 * - Parsing IBKR XML.
 */

const TOS_ACCOUNT_HISTORY_CONTEXT_BUILDER = {

  /**
   * Builds the normalized context used by AccountHistoryBuilder.
   *
   * @param {Object=} input Input data.
   * @return {Object} Stable account-history context.
   */
  build(input) {
    const safeInput = input || {};

    const accountInfo =
      safeInput.accountInfo &&
      typeof safeInput.accountInfo === 'object'
        ? safeInput.accountInfo
        : {};

    const trades = Array.isArray(
      safeInput.trades
    )
      ? safeInput.trades
      : [];

    const counts =
      this.countTradeStatuses_(trades);

    return {
      timestamp:
        this.date_(
          safeInput.timestamp
        ),

      runId:
        this.text_(
          safeInput.runId
        ),

      accountInfo: accountInfo,

      openTrades:
        counts.openTrades,

      partialExitTrades:
        counts.partialExitTrades,

      closedTrades:
        counts.closedTrades,

      totalTrades:
        trades.length
    };
  },

  /**
   * Counts supported lifecycle statuses.
   *
   * Unknown, missing, and malformed statuses are included
   * in totalTrades by build(), but are not counted inside
   * OPEN, PARTIAL_EXIT, or CLOSED.
   *
   * @param {Array} trades Trade records.
   * @return {Object} Status counts.
   */
  countTradeStatuses_(trades) {
    const counts = {
      openTrades: 0,
      partialExitTrades: 0,
      closedTrades: 0
    };

    trades.forEach(function(trade) {
      const status =
        TOS_ACCOUNT_HISTORY_CONTEXT_BUILDER
          .getTradeStatus_(trade);

      if (status === 'OPEN') {
        counts.openTrades++;
        return;
      }

      if (status === 'PARTIAL_EXIT') {
        counts.partialExitTrades++;
        return;
      }

      if (status === 'CLOSED') {
        counts.closedTrades++;
      }
    });

    return counts;
  },

  /**
   * Reads and normalizes a trade status.
   *
   * Supports both:
   * - Status
   * - status
   *
   * @param {*} trade Trade record.
   * @return {string} Normalized uppercase status.
   */
  getTradeStatus_(trade) {
    if (
      !trade ||
      typeof trade !== 'object'
    ) {
      return '';
    }

    const rawStatus =
      trade.Status !== undefined
        ? trade.Status
        : trade.status;

    return this.text_(
      rawStatus
    ).toUpperCase();
  },

  /**
   * Returns a valid Date.
   *
   * Missing or invalid values use the current time.
   *
   * @param {*} value Date-like value.
   * @return {Date} Valid Date instance.
   */
  date_(value) {
    if (
      value instanceof Date &&
      !Number.isNaN(value.getTime())
    ) {
      return new Date(
        value.getTime()
      );
    }

    if (
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      const parsed =
        new Date(value);

      if (
        !Number.isNaN(
          parsed.getTime()
        )
      ) {
        return parsed;
      }
    }

    return new Date();
  },

  /**
   * Normalizes arbitrary values to trimmed text.
   *
   * @param {*} value Any value.
   * @return {string} Normalized string.
   */
  text_(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return '';
    }

    return String(value).trim();
  }

};