/**
 * Trading OS - Account Summary Builder
 *
 * Builds a normalized account summary from IBKR account data.
 *
 * Responsibilities:
 * - Normalize account identifiers and currency.
 * - Normalize numeric account values.
 * - Calculate liquidity and margin percentages.
 * - Preserve the source timestamp.
 *
 * Non-responsibilities:
 * - Reading Google Sheets.
 * - Writing Google Sheets.
 * - Parsing IBKR XML.
 * - Loading Flex reports.
 */

const TOS_ACCOUNT_SUMMARY_BUILDER = {
  /**
   * Builds a normalized account-summary model.
   *
   * @param {Object|null|undefined} accountInfo
   * @return {Object}
   */
  buildSummary_(accountInfo) {
    const available =
      accountInfo !== null &&
      accountInfo !== undefined &&
      typeof accountInfo === 'object';

    const source = available
      ? accountInfo
      : {};

    const netLiquidation =
      this.number_(
        source.netLiquidation
      );

    const excessLiquidity =
      this.number_(
        source.excessLiquidity
      );

    const maintenanceMargin =
      this.number_(
        source.maintenanceMargin
      );

    return {
      available: available,

      accountId: this.text_(
        source.accountId
      ),

      currency: this.text_(
        source.currency
      ),

      netLiquidation: netLiquidation,

      cash: this.number_(
        source.totalCashValue
      ),

      buyingPower: this.number_(
        source.buyingPower
      ),

      excessLiquidity: excessLiquidity,

      maintenanceMargin:
        maintenanceMargin,

      initialMargin: this.number_(
        source.initialMargin
      ),

      excessLiquidityPercent:
        this.percentage_(
          excessLiquidity,
          netLiquidation
        ),

      maintenanceMarginPercent:
        this.percentage_(
          maintenanceMargin,
          netLiquidation
        ),

      timestamp:
        source.timestamp !== undefined
          ? source.timestamp
          : null
    };
  },

  /**
   * Normalizes text values.
   *
   * @param {*} value
   * @return {string}
   */
  text_(value) {
    if (
      value === null ||
      value === undefined
    ) {
      return '';
    }

    return String(value).trim();
  },

  /**
   * Normalizes numeric values.
   *
   * Supports values such as:
   * - 1234.56
   * - "1234.56"
   * - "12,345.67"
   *
   * Invalid or blank values return zero.
   *
   * @param {*} value
   * @return {number}
   */
  number_(value) {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return 0;
    }

    if (
      typeof value === 'number'
    ) {
      return Number.isFinite(value)
        ? value
        : 0;
    }

    const normalized =
      String(value)
        .trim()
        .replace(/,/g, '');

    if (normalized === '') {
      return 0;
    }

    const number =
      Number(normalized);

    return Number.isFinite(number)
      ? number
      : 0;
  },

  /**
   * Calculates one value as a percentage
   * of another value.
   *
   * Returns zero when the denominator is zero.
   *
   * @param {*} value
   * @param {*} total
   * @return {number}
   */
  percentage_(value, total) {
    const normalizedValue =
      this.number_(value);

    const normalizedTotal =
      this.number_(total);

    if (normalizedTotal === 0) {
      return 0;
    }

    return this.round_(
      (
        normalizedValue /
        normalizedTotal
      ) * 100,
      2
    );
  },

  /**
   * Rounds a number to the requested precision.
   *
   * @param {*} value
   * @param {number} decimalPlaces
   * @return {number}
   */
  round_(value, decimalPlaces) {
    const number =
      this.number_(value);

    const places =
      Math.max(
        0,
        Math.trunc(
          this.number_(decimalPlaces)
        )
      );

    const factor =
      Math.pow(10, places);

    return Math.round(
      (number + Number.EPSILON) *
      factor
    ) / factor;
  }
};