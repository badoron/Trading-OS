/**
 * Trading OS - Trade Grouper
 * MVP grouping for DDC opening batches.
 */

const TOS_TRADE_GROUPER = {
  DDC_OPEN_WINDOW_SECONDS: 20,

  groupDdcOpenBatches(trades) {
    const optionTrades = (trades || [])
      .filter(t => t.assetCategory === 'OPT')
      .sort((a, b) => this.parseDateTime_(a.dateTime) - this.parseDateTime_(b.dateTime));

    const groups = [];
    let current = [];

    optionTrades.forEach(trade => {
      if (current.length === 0) {
        current.push(trade);
        return;
      }

      const firstTime = this.parseDateTime_(current[0].dateTime);
      const tradeTime = this.parseDateTime_(trade.dateTime);
      const diffSeconds = Math.abs((tradeTime - firstTime) / 1000);

      const sameSymbol =
        (trade.underlyingSymbol || trade.symbol || '') ===
        (current[0].underlyingSymbol || current[0].symbol || '');

      const sameExpiry = (trade.expiry || '') === (current[0].expiry || '');

      if (
        sameSymbol &&
        sameExpiry &&
        diffSeconds <= this.DDC_OPEN_WINDOW_SECONDS &&
        current.length < 4
      ) {
        current.push(trade);
      } else {
        this.pushIfDdcOpen_(groups, current);
        current = [trade];
      }
    });

    this.pushIfDdcOpen_(groups, current);

    return groups;
  },

  pushIfDdcOpen_(groups, legs) {
    if (legs.length !== 4) return;

    const first = legs[0];

    groups.push({
      groupId: this.buildGroupId_(first),
      symbol: first.underlyingSymbol || first.symbol || '',
      expiry: first.expiry || '',
      assetClass: first.assetCategory || '',
      firstDateTime: first.dateTime || '',
      strategyGuess: 'DDC',
      legCount: legs.length,
      legs: legs,
      sourceTradeIds: legs.map(t => t.tradeID || '').filter(String),
      sourceTransactionIds: legs.map(t => t.transactionID || '').filter(String),
      netCreditDebit: legs.reduce((sum, leg) => sum + this.calcLegValue_(leg), 0)
    });
  },

  buildGroupId_(trade) {
    return [
      'IBKR-DDC',
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
    const groups = this.groupDdcOpenBatches(parsed.trades);

    Logger.log('DDC open groups: ' + groups.length);

    groups.forEach((group, index) => {
      Logger.log(
        'DDC Group #' + (index + 1) +
        ' | ' + group.symbol +
        ' | Expiry: ' + group.expiry +
        ' | Legs: ' + group.legCount +
        ' | Net: ' + group.netCreditDebit
      );

      Logger.log(JSON.stringify(group.legs, null, 2));
    });

    return groups;
  }
};

function testTradeGrouper() {
  return TOS_TRADE_GROUPER.testFromCachedXml();
}