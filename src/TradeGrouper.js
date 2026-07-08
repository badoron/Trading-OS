/**
 * Trading OS - Trade Grouper
 * MVP grouping for DDC opening batches.
 */

const TOS_TRADE_GROUPER = {
  MAX_ALLOWED_DDC_DEBIT: 10,

  getOptionTrades_(trades) {
    return (trades || [])
      .filter(t => t.assetCategory === 'OPT')
      .sort((a, b) => this.parseDateTime_(a.dateTime) - this.parseDateTime_(b.dateTime));
  },

  getOpeningExchTrades_(trades) {
    return this.getOptionTrades_(trades)
      .filter(t => t.transactionType === 'ExchTrade')
      .filter(t => t.openCloseIndicator === 'O');
  },

  groupDdcOpenBatches(trades) {
    const openingTrades = this.getOpeningExchTrades_(trades);
    const byOrder = {};

    openingTrades.forEach(trade => {
      const key = trade.brokerageOrderID || trade.ibOrderID || '';

      if (!key) return;

      if (!byOrder[key]) {
        byOrder[key] = [];
      }

      byOrder[key].push(trade);
    });

    return Object.keys(byOrder)
      .map(orderId => this.buildDdcGroupFromOrder_(orderId, byOrder[orderId]))
      .filter(group => group !== null);
  },

  buildDdcGroupFromOrder_(orderId, legs) {
    if (legs.length !== 4) return null;

    const underlyingSymbols = this.unique_(legs.map(t => t.underlyingSymbol || t.symbol || ''));
    const expiries = this.unique_(legs.map(t => t.expiry || ''));
    const shortLegs = legs.filter(t => String(t.buySell).toUpperCase() === 'SELL');
    const longLegs = legs.filter(t => String(t.buySell).toUpperCase() === 'BUY');

    if (underlyingSymbols.length !== 1) return null;
    if (expiries.length !== 2) return null;
    if (shortLegs.length !== 2) return null;
    if (longLegs.length !== 2) return null;

    const first = legs[0];
    const netCreditDebit = legs.reduce((sum, leg) => sum + this.calcLegValue_(leg), 0);
    const recommendation = this.getDdcRecommendation_(netCreditDebit);

    return {
      groupId: [
        'IBKR-DDC',
        orderId,
        underlyingSymbols[0],
        expiries.join('-')
      ].join('-'),

      brokerageOrderID: orderId,
      symbol: underlyingSymbols[0],
      expiries: expiries,
      expirationSummary: expiries.join(' / '),
      assetClass: 'OPT',
      firstDateTime: first.dateTime || '',
      strategyGuess: 'DDC',
      legCount: legs.length,
      legs: legs,

      sourceTradeIds: legs.map(t => t.tradeID || '').filter(String),
      sourceTransactionIds: legs.map(t => t.transactionID || '').filter(String),
      brokerageOrderIds: [orderId],

      netCreditDebit: netCreditDebit,
      riskWarning: recommendation.warning,
      recommendedAction: recommendation.action,
      recommendationReason: recommendation.reason
    };
  },

  getDdcRecommendation_(netCreditDebit) {
    if (netCreditDebit >= 0) {
      return {
        action: 'REVIEW',
        warning: '',
        reason: 'DDC opened for credit or zero debit.'
      };
    }

    const debit = Math.abs(netCreditDebit);

    if (debit <= this.MAX_ALLOWED_DDC_DEBIT) {
      return {
        action: 'REVIEW',
        warning: 'SMALL_DEBIT',
        reason: 'DDC opened for small debit up to $10. Manual approval allowed.'
      };
    }

    return {
      action: 'REVIEW_WARNING',
      warning: 'DEBIT_OVER_LIMIT',
      reason: 'DDC opened for debit greater than $10. Requires careful manual review.'
    };
  },

  logDiagnostics_(trades) {
    const optionTrades = this.getOptionTrades_(trades);
    const exchTrades = optionTrades.filter(t => t.transactionType === 'ExchTrade');
    const bookTrades = optionTrades.filter(t => t.transactionType === 'BookTrade');
    const opens = optionTrades.filter(t => t.openCloseIndicator === 'O');
    const closes = optionTrades.filter(t => t.openCloseIndicator === 'C');
    const openingExchTrades = this.getOpeningExchTrades_(trades);

    Logger.log('Total trades: ' + (trades || []).length);
    Logger.log('Option trades: ' + optionTrades.length);
    Logger.log('ExchTrade: ' + exchTrades.length);
    Logger.log('BookTrade: ' + bookTrades.length);
    Logger.log('Open indicator O: ' + opens.length);
    Logger.log('Close indicator C: ' + closes.length);
    Logger.log('Opening ExchTrades used for DDC: ' + openingExchTrades.length);

    openingExchTrades.forEach((trade, index) => {
      Logger.log(
        'OPEN #' + (index + 1) +
        ' | ' + (trade.underlyingSymbol || '') +
        ' | exp ' + trade.expiry +
        ' | ' + trade.putCall +
        ' | strike ' + trade.strike +
        ' | ' + trade.buySell +
        ' | qty ' + trade.quantity +
        ' | price ' + trade.tradePrice +
        ' | time ' + trade.dateTime +
        ' | order ' + (trade.brokerageOrderID || trade.ibOrderID || '')
      );
    });
  },

  unique_(values) {
    return values
      .filter(String)
      .filter((value, index, array) => array.indexOf(value) === index)
      .sort();
  },

  calcLegValue_(trade) {
  return Number(trade.netCash || 0);
},

  parseDateTime_(value) {
    if (!value) return new Date(0);

    const parts = String(value).split(';');
    if (parts.length !== 2) return new Date(value);

    const d = parts[0];
    const t = parts[1];

    return new Date(
      Number(d.substring(0, 4)),
      Number(d.substring(4, 6)) - 1,
      Number(d.substring(6, 8)),
      Number(t.substring(0, 2)),
      Number(t.substring(2, 4)),
      Number(t.substring(4, 6))
    );
  },

  testFromCachedXml() {
    const xml = TOS_IBKR_FLEX.getLastXml();

    if (!xml) {
      throw new Error('No cached IBKR XML found.');
    }

    const parsed = TOS_IBKR_FLEX_PARSER.parse(xml);
    const trades = parsed.trades || [];

    this.logDiagnostics_(trades);

    const groups = this.groupDdcOpenBatches(trades);

    Logger.log('DDC open groups: ' + groups.length);

    groups.forEach((group, index) => {
      Logger.log(
        'DDC Group #' + (index + 1) +
        ' | ' + group.symbol +
        ' | Expiries: ' + group.expirationSummary +
        ' | Legs: ' + group.legCount +
        ' | Net: ' + group.netCreditDebit +
        ' | Warning: ' + group.riskWarning +
        ' | Reason: ' + group.recommendationReason
      );

      Logger.log(JSON.stringify(group.legs, null, 2));
    });

    return groups;
  }
};

function testTradeGrouper() {
  return TOS_TRADE_GROUPER.testFromCachedXml();
}