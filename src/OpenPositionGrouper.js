/**
 * Trading OS - Open Position Grouper
 * MVP: Detect active DDC strategies from IBKR Open Positions.
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
      const groups = this.detectDdcForSymbol_(symbol, bySymbol[symbol]);
      ddcGroups.push.apply(ddcGroups, groups);
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
    const results = [];

    for (let i = 0; i < expiries.length; i++) {
      for (let j = 0; j < expiries.length; j++) {
        if (i === j) continue;

        const shortExpiry = expiries[i];
        const longExpiry = expiries[j];

        if (shortExpiry >= longExpiry) continue;

        const shortLegs = byExpiry[shortExpiry].filter(p => p.side === 'Short');
        const longLegs = byExpiry[longExpiry].filter(p => p.side === 'Long');

        if (!this.isCallPutPair_(shortLegs)) continue;
        if (!this.isCallPutPair_(longLegs)) continue;

        const legs = shortLegs.concat(longLegs);

        if (legs.length !== 4) continue;

        results.push(this.buildDdcGroup_(symbol, shortExpiry, longExpiry, legs));
      }
    }

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
      groupId: [
        'IBKR-ACTIVE-DDC',
        symbol,
        shortExpiry,
        longExpiry
      ].join('-'),

      symbol: symbol,
      strategyGuess: 'DDC',
      assetClass: 'OPT',
      legCount: 4,

      shortExpiry: shortExpiry,
      longExpiry: longExpiry,
      expirationSummary: shortExpiry + ' / ' + longExpiry,

      legs: legs,

      sourcePositionIds: legs.map(p => p.conid || p.symbol || '').filter(String),

      netCostBasis: legs.reduce((sum, p) => {
        return sum + Number(p.costBasisMoney || 0);
      }, 0),

      marketValue: legs.reduce((sum, p) => {
        return sum + Number(p.positionValue || 0);
      }, 0)
    };
  },

  groupBy_(items, keyFn) {
    const map = {};

    items.forEach(item => {
      const key = keyFn(item);

      if (!key) return;

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(item);
    });

    return map;
  }
};

function testOpenPositionGrouper() {
  return TOS_OPEN_POSITION_GROUPER.detectActiveDdcFromCachedXml();
}