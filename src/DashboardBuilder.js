/**
 * Trading OS - Dashboard Builder
 *
 * Pure data and calculation layer for HOME and DASHBOARD.
 *
 * Responsibilities:
 * - Normalize MASTER_TRADES data
 * - Normalize TRADE_LEGS data
 * - Calculate account/trade summary metrics
 * - Build per-strategy dashboard rows
 * - Define HOME navigation
 *
 * This module does not write to Google Sheets.
 */

const TOS_DASHBOARD_BUILDER = {
  /**
   * Summarizes workflow status and realized PnL.
   *
   * RealizedPnL uses MASTER_TRADES when that field is populated.
   * For partial exits where MASTER_TRADES is still blank, it falls
   * back to the sum of closed-leg RealizedPnL values in TRADE_LEGS.
   * Commission is not deducted again.
   *
   * @param {Object[]} trades Normalized MASTER_TRADES records.
   * @param {Object} legsByTradeId Legs grouped by TradeID.
   * @return {Object} Trade summary.
   */
  summarizeTrades_(trades, legsByTradeId) {
    const result = {
      total: 0,
      open: 0,
      partialExit: 0,
      completedWithResidual: 0,
      residualPositions: 0,
      residualUnrealizedPnL: 0,
      closedPendingExitSync: 0,
      closed: 0,
      other: 0,
      realizedPnL: 0
    };

    (trades || []).forEach(trade => {
      const status = this.text_(
        trade && trade.workflowStatus
      ).toUpperCase();

      result.total++;
      result.realizedPnL +=
        this.calculateTradeRealizedPnL_(
          trade,
          (legsByTradeId || {})[
            this.text_(trade && trade.tradeId)
          ] || []
        );

      if (status === 'OPEN') {
        result.open++;
      } else if (status === 'PARTIAL_EXIT') {
        result.partialExit++;
      } else if (status === 'COMPLETED_WITH_RESIDUAL') {
        result.completedWithResidual++;
        const residual = this.summarizeResidualLegs_(
          (legsByTradeId || {})[this.text_(trade && trade.tradeId)] || []
        );
        result.residualPositions += residual.count;
        result.residualUnrealizedPnL += residual.unrealizedPnL;
      } else if (
        status === 'CLOSED_PENDING_EXIT_SYNC'
      ) {
        result.closedPendingExitSync++;
      } else if (status === 'CLOSED') {
        result.closed++;
      } else {
        result.other++;
      }
    });

    result.realizedPnL = this.roundMoney_(result.realizedPnL);
    result.residualUnrealizedPnL = this.roundMoney_(
      result.residualUnrealizedPnL
    );

    return result;
  },


  /**
   * Calculates realized PnL for one trade without double counting.
   *
   * MASTER_TRADES is authoritative when RealizedPnL is populated,
   * including an explicit zero. When it is blank, closed-leg values
   * are summed so PARTIAL_EXIT trades appear correctly on the
   * dashboard before finalization.
   *
   * @param {Object} trade Normalized master trade.
   * @param {Object[]} legs Legs belonging to the trade.
   * @return {number} Effective realized PnL.
   */
  calculateTradeRealizedPnL_(trade, legs) {
    const safeTrade = trade || {};
    const rawValue =
      safeTrade.realizedPnLRaw !== undefined
        ? safeTrade.realizedPnLRaw
        : safeTrade.realizedPnL;

    if (this.text_(rawValue) !== '') {
      return this.roundMoney_(
        this.number_(safeTrade.realizedPnL)
      );
    }

    let realizedPnL = 0;

    (legs || []).forEach(leg => {
      const status = this.text_(
        leg && leg.legStatus
      ).toUpperCase();

      if (status !== 'CLOSED') {
        return;
      }

      realizedPnL += this.number_(
        leg && leg.realizedPnL
      );
    });

    return this.roundMoney_(realizedPnL);
  },

  summarizeResidualLegs_(legs) {
    let count = 0;
    let unrealizedPnL = 0;
    (legs || []).forEach(leg => {
      const status = this.text_(leg && leg.legStatus).toUpperCase();
      const side = this.text_(leg && leg.longShort).toUpperCase();
      if (status !== 'CLOSED' && side === 'LONG') {
        count++;
        unrealizedPnL += this.number_(leg && leg.unrealizedPnL);
      }
    });
    return {
      count: count,
      unrealizedPnL: this.roundMoney_(unrealizedPnL)
    };
  },

  /**
   * Summarizes open and closed legs.
   *
   * Blank LegStatus is considered OPEN for backward compatibility
   * with imported legs that predate the LegStatus column.
   *
   * UnrealizedPnL is included only for open legs.
   *
   * @param {Object[]} legs Normalized TRADE_LEGS records.
   * @return {Object} Leg summary.
   */
  summarizeLegs_(legs) {
    const result = {
      totalLegs: 0,
      openLegs: 0,
      closedLegs: 0,
      unrealizedPnL: 0,
      marketValue: 0
    };

    (legs || []).forEach(leg => {
      const status = this.text_(
        leg && leg.legStatus
      ).toUpperCase();

      const isClosed =
        status === 'CLOSED';

      result.totalLegs++;

      if (isClosed) {
        result.closedLegs++;
        return;
      }

      result.openLegs++;

      result.unrealizedPnL += this.number_(
        leg && leg.unrealizedPnL
      );

      result.marketValue += this.number_(
        leg && leg.marketValue
      );
    });

    result.unrealizedPnL = this.roundMoney_(
      result.unrealizedPnL
    );

    result.marketValue = this.roundMoney_(
      result.marketValue
    );

    return result;
  },

  /**
   * Builds one dashboard row per trade for a requested strategy.
   *
   * @param {Object[]} trades Normalized MASTER_TRADES records.
   * @param {Object} legsByTradeId Legs grouped by TradeID.
   * @param {string} strategyId Requested strategy, such as DDC.
   * @return {Object[]} Strategy dashboard rows.
   */
  buildStrategyRows_(
    trades,
    legsByTradeId,
    strategyId
  ) {
    const requestedStrategy = this.text_(
      strategyId
    ).toUpperCase();

    const safeLegsByTradeId =
      legsByTradeId || {};

    return (trades || [])
      .filter(trade => {
        return (
          this.text_(
            trade && trade.strategyId
          ).toUpperCase() ===
          requestedStrategy
        );
      })
      .map(trade => {
        const tradeId = this.text_(
          trade && trade.tradeId
        );

        const legs =
          safeLegsByTradeId[tradeId] || [];

        const legSummary =
          this.summarizeLegs_(legs);

        const expirationSummary =
          this.summarizeExpirations_(legs);

        return {
          tradeId: tradeId,

          strategyId: this.text_(
            trade && trade.strategyId
          ),

          symbol: this.text_(
            trade && trade.symbol
          ),

          workflowStatus: this.text_(
            trade && trade.workflowStatus
          ).toUpperCase(),

          entryDate:
            trade && trade.entryDate !== undefined
              ? trade.entryDate
              : '',

          exitDate:
            trade && trade.exitDate !== undefined
              ? trade.exitDate
              : '',

          totalLegs:
            legSummary.totalLegs,

          openLegs:
            legSummary.openLegs,

          closedLegs:
            legSummary.closedLegs,

          marketValue:
            legSummary.marketValue,

          unrealizedPnL:
            legSummary.unrealizedPnL,

          realizedPnL:
            this.calculateTradeRealizedPnL_(
              trade,
              legs
            ),

          shortExpiration:
            expirationSummary.shortExpiration,

          longExpiration:
            expirationSummary.longExpiration,

          exitReason: this.text_(
            trade && trade.exitReason
          )
        };
      });
  },

  /**
   * Finds the short and long expirations for a DDC trade.
   *
   * @param {Object[]} legs Trade legs.
   * @return {Object} Expiration summary.
   */
  summarizeExpirations_(legs) {
    const shortExpirations = [];
    const longExpirations = [];

    (legs || []).forEach(leg => {
      const longShort = this.text_(
        leg && leg.longShort
      ).toUpperCase();

      const expiration = this.text_(
        leg && leg.expiration
      );

      if (!expiration) {
        return;
      }

      if (
        longShort === 'SHORT' &&
        shortExpirations.indexOf(
          expiration
        ) === -1
      ) {
        shortExpirations.push(
          expiration
        );
      }

      if (
        longShort === 'LONG' &&
        longExpirations.indexOf(
          expiration
        ) === -1
      ) {
        longExpirations.push(
          expiration
        );
      }
    });

    shortExpirations.sort();
    longExpirations.sort();

    return {
      shortExpiration:
        shortExpirations.length > 0
          ? shortExpirations[0]
          : '',

      longExpiration:
        longExpirations.length > 0
          ? longExpirations[
              longExpirations.length - 1
            ]
          : ''
    };
  },

  /**
   * Builds the complete dashboard model.
   *
   * @param {Object[]} trades Normalized master trades.
   * @param {Object[]} legs Normalized legs.
   * @param {Object} legsByTradeId Legs grouped by trade.
   * @return {Object} Dashboard model.
   */
  buildDashboardModel_(
    trades,
    legs,
    legsByTradeId
  ) {
    const tradeSummary =
      this.summarizeTrades_(
        trades,
        legsByTradeId
      );

    const legSummary =
      this.summarizeLegs_(
        legs
      );

    return {
      generatedAt: new Date(),

      account: {
        equity: '',
        cash: '',
        buyingPower: '',
        accountDataAvailable: false
      },

      trades: tradeSummary,
      legs: legSummary,

      combinedPnL: this.roundMoney_(
        tradeSummary.realizedPnL +
        legSummary.unrealizedPnL
      ),

      ddcRows:
        this.buildStrategyRows_(
          trades,
          legsByTradeId,
          'DDC'
        ),

      navigation:
        this.getNavigationItems_()
    };
  },

  /**
   * Navigation shown on the HOME sheet.
   *
   * @return {Object[]} Navigation items.
   */
  getNavigationItems_() {
    return [
      {
        label: 'Dashboard',
        sheetName: 'DASHBOARD',
        description:
          'Current DDC account and strategy status.'
      },
      {
        label: 'Import Review',
        sheetName: 'IMPORT_REVIEW',
        description:
          'Review and approve newly detected trades.'
      },
      {
        label: 'Master Trades',
        sheetName: 'MASTER_TRADES',
        description:
          'One row per Trading OS trade.'
      },
      {
        label: 'Trade Legs',
        sheetName: 'TRADE_LEGS',
        description:
          'Leg-level position, exit and PnL details.'
      },
      {
        label: 'Pipeline Audit',
        sheetName: 'PIPELINE_AUDIT',
        description:
          'Production pipeline execution history.'
      },
      {
        label: 'System Log',
        sheetName: 'SYNC_LOG',
        description:
          'General system and diagnostic log.'
      },
      {
        label: 'QA Report',
        sheetName: 'QA_REPORT',
        description:
          'Current system quality report.'
      },
      {
        label: 'QA Checklist',
        sheetName: 'QA_CHECKLIST',
        description:
          'Release and operational verification checklist.'
      }
    ];
  },

  /**
   * Groups normalized legs by TradeID.
   *
   * @param {Object[]} legs Normalized legs.
   * @return {Object} Legs grouped by trade.
   */
  groupLegsByTradeId_(legs) {
    const map = {};

    (legs || []).forEach(leg => {
      const tradeId = this.text_(
        leg && leg.tradeId
      );

      if (!tradeId) {
        return;
      }

      if (!map[tradeId]) {
        map[tradeId] = [];
      }

      map[tradeId].push(leg);
    });

    return map;
  },

  /**
   * Normalizes arbitrary values to trimmed strings.
   *
   * @param {*} value Input value.
   * @return {string} Normalized text.
   */
  text_(value) {
    return String(
      value === null ||
      value === undefined
        ? ''
        : value
    ).trim();
  },

  /**
   * Safely parses numeric values.
   *
   * Supports formatted strings such as "1,234.50".
   *
   * @param {*} value Input value.
   * @return {number} Parsed number or zero.
   */
  number_(value) {
    const normalized =
      this.text_(value);

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
   * Rounds currency values to two decimal places.
   *
   * @param {*} value Numeric value.
   * @return {number} Rounded value.
   */
  roundMoney_(value) {
    return Math.round(
      (
        Number(value) +
        Number.EPSILON
      ) * 100
    ) / 100;
  }
};