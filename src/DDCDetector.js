/**
 * Trading OS - DDC Detector
 * MVP: detect DDC candidates from cached IBKR trades.
 */

const TOS_DDC_DETECTOR = {
  detectFromCachedXml() {
    const xml = TOS_IBKR_FLEX.getLastXml();

    if (!xml) {
      throw new Error('No cached IBKR XML found.');
    }

    const parsed = TOS_IBKR_FLEX_PARSER.parse(xml);
    const trades = parsed.trades || [];

    Logger.log('IBKR trades loaded: ' + trades.length);

    const optionTrades = trades.filter(t => t.assetCategory === 'OPT');
    Logger.log('Option trades: ' + optionTrades.length);

    const groups = this.groupByUnderlyingExpiry_(optionTrades);

    Logger.log('DDC candidate groups: ' + groups.length);

    groups.forEach((group, index) => {
      Logger.log(
        'Group #' + (index + 1) +
        ' | Symbol: ' + group.symbol +
        ' | Expiry: ' + group.expiry +
        ' | Legs: ' + group.legs.length +
        ' | Net: ' + group.netCreditDebit
      );

      Logger.log(JSON.stringify(group.legs, null, 2));
    });

    return groups;
  },

  groupByUnderlyingExpiry_(trades) {
    const map = {};

    trades.forEach(trade => {
      const symbol = trade.underlyingSymbol || trade.symbol || '';
      const expiry = trade.expiry || '';
      const key = symbol + '|' + expiry;

      if (!map[key]) {
        map[key] = {
          symbol: symbol,
          expiry: expiry,
          legs: [],
          netCreditDebit: 0
        };
      }

      map[key].legs.push(trade);
      map[key].netCreditDebit += this.calcLegValue_(trade);
    });

    return Object.keys(map)
      .map(key => map[key])
      .filter(group => group.legs.length >= 2);
  },

  calcLegValue_(trade) {
    const qty = Number(trade.quantity || 0);
    const price = Number(trade.tradePrice || 0);
    const multiplier = Number(trade.multiplier || 100);

    return qty * price * multiplier;
  }
};

function testDDCDetector() {
  return TOS_DDC_DETECTOR.detectFromCachedXml();
}