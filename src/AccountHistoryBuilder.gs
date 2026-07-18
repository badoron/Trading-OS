/**
 * Trading OS - Account History Builder
 *
 * Builds a normalized account-history record.
 *
 * Responsibilities:
 * - Map account information into a stable history model.
 * - Normalize missing text and numeric values.
 *
 * Non-responsibilities:
 * - Reading sheets.
 * - Parsing IBKR XML.
 * - Counting trade statuses.
 * - Writing rows to ACCOUNT_HISTORY.
 */

const TOS_ACCOUNT_HISTORY_BUILDER = {
  build(context) {
    const safeContext = context || {};
    const accountInfo = safeContext.accountInfo || {};

    return {
      timestamp: this.date_(
        safeContext.timestamp
      ),

      reportDate: this.text_(
        accountInfo.reportDate
      ),

      runId: this.text_(
        safeContext.runId
      ),

      accountId: this.text_(
        accountInfo.accountId
      ),

      currency: this.text_(
        accountInfo.currency
      ),

      netLiquidation: this.number_(
        accountInfo.netLiquidation
      ),

      cash: this.number_(
        accountInfo.totalCashValue
      ),

      stockValue: this.number_(
        accountInfo.stockValue
      ),

      optionsValue: this.number_(
        accountInfo.optionsValue
      ),

      openTrades: this.integer_(
        safeContext.openTrades
      ),

      partialExitTrades: this.integer_(
        safeContext.partialExitTrades
      ),

      closedTrades: this.integer_(
        safeContext.closedTrades
      ),

      totalTrades: this.integer_(
        safeContext.totalTrades
      )
    };
  },

  text_(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return '';
    }

    return String(value).trim();
  },

  number_(value) {
    if (
      value === '' ||
      value === null ||
      value === undefined
    ) {
      return 0;
    }

    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  },

  integer_(value) {
    const number = this.number_(value);

    return Math.max(
      0,
      Math.trunc(number)
    );
  },

  date_(value) {
    if (value instanceof Date) {
      return new Date(value.getTime());
    }

    if (
      value === '' ||
      value === null ||
      value === undefined
    ) {
      return new Date();
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }

    return parsed;
  }
};