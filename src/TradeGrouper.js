/**
 * Trading OS - Trade Grouper
 * Generic grouping layer. Does not classify strategy.
 */

const TOS_TRADE_GROUPER = {
  GROUP_WINDOW_SECONDS: 120,

  groupOptionTrades(trades) {
    const optionTrades = (trades || [])
      .filter(t => t.assetCategory === 'OPT')
      .sort((a, b) => this.parseDateTime_(a.dateTime) - this.parseDateTime_(b.dateTime));

    const groups = [];

    optionTrades.forEach(trade => {
      const group = this.findMatchingGroup_(groups, trade);

      if (group) {
        group.legs.push(trade);
        group.sourceTradeIds.push(trade.tradeID || '');
        group.sourceTransactionIds.push(trade.transactionID || '');
        group.netCreditDebit += this.calcLegValue_(trade);
      } else {
        groups.push(this.createGroup_(trade));
      }
    });

    return groups;
  },

  createGroup_(trade) {
    return {
      groupId: this.buildGroupId_(trade),
      symbol: trade.underlyingSymbol || trade.symbol || '',
      expiry: trade.expiry || '',
      assetClass: trade.assetCategory || '',
      firstDateTime: trade.dateTime || '',
      legs: [trade],
      sourceTradeIds: [trade.tradeID || ''],
      sourceTransactionIds: [trade.transactionID || ''],
      netCreditDebit: this.calcLegValue_(trade)
    };
  },

  findMatchingGroup_(groups, trade) {
    const symbol = trade.underlyingSymbol || trade.symbol || '';
    const expiry = trade.expiry || '';
    const tradeTime = this.parseDateTime_(trade.dateTime);

    return groups.find(group => {
      if (group.symbol !== symbol) return false;
      if (group.expiry !== expiry) return false;

      const groupTime = this.parseDateTime_(group.firstDateTime);
      const diffSeconds = Math.abs((tradeTime - groupTime) / 1000);

      return diffSeconds <= this.GROUP_WINDOW_SECONDS;
    });
  },

  buildGroupId_(trade) {
    return [
      'IBKR-GRP',
      trade.underlyingSymbol || trade.symbol || 'UNKNOWN',
      trade.expiry || 'NOEXP',
      trade.dateTime || new Date().getTime()
    ].join('-');
  },

  calcLegValue_(trade) {
    const qty = Number(trade.quantity || 0);
    const price = Number(trade.tradePrice || 0);
    const multiplier = Number(trade.multiplier || 100);

    return qty * price * multiplier;
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
    const parsed = TOS_IBKR_FLEX_PARSER.parse(xml);
    const groups = this.groupOptionTrades(parsed.trades);

    Logger.log('Trade groups: ' + groups.length);

    groups.forEach((group, index) => {
      Logger.log(
        'Group #' + (index + 1) +
        ' | ' + group.symbol +
        ' | Expiry: ' + group.expiry +
        ' | Legs: ' + group.legs.length +
        ' | Net: ' + group.netCreditDebit
      );
    });

    return groups;
  }
};

function testTradeGrouper() {
  return TOS_TRADE_GROUPER.testFromCachedXml();
}