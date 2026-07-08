/**
 * Trading OS - Open Position Grouper
 * MVP: Detect active DDC strategies from IBKR Open Positions.
 * Future-ready: strategy-specific detection can be added here.
 */

const TOS_OPEN_POSITION_GROUPER = {
  detectActiveDdcFromCachedXml() {
    const xml = TOS_IBKR_FLEX.getLastXml();

    if (!xml) {
      throw new Error('No cached IBKR XML found.');
    }

    const parsed = TOS_IBKR_FLEX_PARSER.parse(xml);
    const positions = (parsed.openPositions || [])
      .filter(p => p.assetCategory === 'OPT');

    Logger.log('Open option positions: ' + positions.length);

    const bySymbol = this.groupBy_(positions, p => p.underlyingSymbol || p.symbol || '');
    const ddcGroups = [];

    Object.keys(bySymbol).forEach(symbol => {
      ddcGroups.push.apply(
        ddcGroups,
        this.detectDdcForSymbol_(symbol, bySymbol[symbol])
      );
    });

    Logger.log('Active DDC groups found: ' + ddcGroups.length);

    ddcGroups.forEach((group, index) => {
      Logger.log(
        'DDC #' + (index + 1) +
        ' | Symbol=' + group.symbol +
        ' | ShortExp=' + group.shortExpiry +
        ' | LongExp=' + group.longExpiry +
        ' | Legs=' + group.legs.length +
        ' | CostBasis=' + group.netCostBasis +
        ' | MarketValue=' + group.marketValue
      );
    });

    return ddcGroups;
  },

  detectDdcForSymbol_(symbol, positions) {
    const byExpiry = this.groupBy_(positions, p => p.expiry || '');
    const expiries = Object.keys(byExpiry).sort();

    const shortPairs = [];
    const longPairs = [];

    expiries.forEach(expiry => {
      const legs = byExpiry[expiry];

      const shorts = legs.filter(p => p.side === 'Short');
      const longs = legs.filter(p => p.side === 'Long');

      if (this.isCallPutPair_(shorts)) {
        shortPairs.push({ expiry: expiry, legs: shorts });
      }

      if (this.isCallPutPair_(longs)) {
        longPairs.push({ expiry: expiry, legs: longs, used: false });
      }
    });

    const results = [];

    shortPairs.forEach(shortPair => {
      const longPair = longPairs.find(lp =>
        !lp.used && lp.expiry > shortPair.expiry
      );

      if (!longPair) return;

      longPair.used = true;

      const legs = shortPair.legs.concat(longPair.legs);
      results.push(this.buildDdcGroup_(symbol, shortPair.expiry, longPair.expiry, legs));
    });

    return results;
  },

  isCallPutPair_(legs) {
    if (!legs || legs.length !== 2) return false;

    const calls = legs.filter(l => l.putCall === 'C');
    const puts = legs.filter(l => l.putCall === 'P');

    return calls.length === 1 && puts.length === 1;
  },

  buildDdcGroup_(symbol, shortExpiry, longExpiry, legs) {
    return {
      groupId: ['IBKR-ACTIVE-DDC', symbol, shortExpiry, longExpiry].join('-'),
      symbol: symbol,
      strategyGuess: 'DDC',
      assetClass: 'OPT',
      legCount: 4,
      shortExpiry: shortExpiry,
      longExpiry: longExpiry,
      expirationSummary: shortExpiry + ' / ' + longExpiry,
      legs: legs,
      sourcePositionIds: legs.map(p => p.conid || p.symbol || '').filter(String),
      netCostBasis: legs.reduce((sum, p) => sum + Number(p.costBasisMoney || 0), 0),
      marketValue: legs.reduce((sum, p) => sum + Number(p.positionValue || 0), 0)
    };
  },

  groupBy_(items, keyFn) {
    const map = {};

    items.forEach(item => {
      const key = keyFn(item);
      if (!key) return;

      if (!map[key]) map[key] = [];
      map[key].push(item);
    });

    return map;
  }
};

function testOpenPositionGrouper() {
  return TOS_OPEN_POSITION_GROUPER.detectActiveDdcFromCachedXml();
}