/**
 * Trading OS - Open Position Grouper
 * MVP: Detect active DDC strategies from IBKR Open Positions.
 */

const TOS_OPEN_POSITION_GROUPER = {
detectActiveDdcFromCachedXml() {
  const snapshot =
    TOS_BROKER_SNAPSHOT_SERVICE.load();

  return this.detectActiveDdcFromSnapshot_(
    snapshot
  );
},

detectActiveDdcFromSnapshot_(snapshot) {
  if (!snapshot) {
    throw new Error(
      'Broker snapshot is required.'
    );
  }

  const positions =
    (snapshot.openPositions || [])
      .filter(
        position =>
          position.assetCategory ===
          'OPT'
      );

  Logger.log(
    'Open option positions: ' +
    positions.length
  );

  const bySymbol =
    this.groupBy_(
      positions,
      position =>
        position.underlyingSymbol ||
        position.symbol ||
        ''
    );

  const ddcGroups = [];

  Object.keys(bySymbol)
    .forEach(symbol => {
      ddcGroups.push.apply(
        ddcGroups,
        this.detectDdcForSymbol_(
          symbol,
          bySymbol[symbol]
        )
      );
    });

  Logger.log(
    'Active DDC groups found: ' +
    ddcGroups.length
  );

  ddcGroups.forEach(
    (group, index) => {
      Logger.log(
        'DDC #' +
        (index + 1) +
        ' | ID=' +
        group.groupId +
        ' | Symbol=' +
        group.symbol +
        ' | ShortExp=' +
        group.shortExpiry +
        ' | LongExp=' +
        group.longExpiry +
        ' | Legs=' +
        group.legs.length +
        ' | CostBasis=' +
        group.netCostBasis +
        ' | MarketValue=' +
        group.marketValue
      );
    }
  );

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

      if (this.isCallPutPair_(shorts)) shortPairs.push({ expiry, legs: shorts });
      if (this.isCallPutPair_(longs)) longPairs.push({ expiry, legs: longs, used: false });
    });

    const results = [];

    shortPairs.forEach(shortPair => {
      const longPair = longPairs.find(lp => !lp.used && lp.expiry > shortPair.expiry);
      if (!longPair) return;

      longPair.used = true;

      const legs = shortPair.legs.concat(longPair.legs);
      results.push(this.buildDdcGroup_(symbol, shortPair.expiry, longPair.expiry, legs));
    });

    return results;
  },

  isCallPutPair_(legs) {
    if (!legs || legs.length !== 2) return false;
    return legs.filter(l => l.putCall === 'C').length === 1 &&
           legs.filter(l => l.putCall === 'P').length === 1;
  },

  buildDdcGroup_(symbol, shortExpiry, longExpiry, legs) {
    const groupId = this.buildStableDdcId_(symbol, shortExpiry, longExpiry, legs);

    return {
      groupId,
      symbol,
      strategyGuess: 'DDC',
      assetClass: 'OPT',
      legCount: 4,
      shortExpiry,
      longExpiry,
      expirationSummary: shortExpiry + ' / ' + longExpiry,
      legs,
      sourcePositionIds: legs.map(p => p.conid || p.symbol || '').filter(String),
      netCostBasis: legs.reduce((sum, p) => sum + Number(p.costBasisMoney || 0), 0),
      marketValue: legs.reduce((sum, p) => sum + Number(p.positionValue || 0), 0)
    };
  },

  buildStableDdcId_(symbol, shortExpiry, longExpiry, legs) {
    const legKey = legs
      .map(l => [
        l.side,
        l.expiry,
        l.putCall,
        l.strike
      ].join(':'))
      .sort()
      .join('|');

    return ['DDC', symbol, shortExpiry, longExpiry, legKey].join('|');
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