/**
 * Trading OS - IBKR Flex Parser
 * Parses IBKR Flex XML into basic Trading OS objects.
 */

const TOS_IBKR_FLEX_PARSER = {
  parse(xmlText) {
    const doc = XmlService.parse(xmlText);
    const root = doc.getRootElement();

    return {
      accountInfo: this.findElements_(root, 'AccountInformation'),
      trades: this.findElements_(root, 'Trade'),
      openPositions: this.findElements_(root, 'OpenPosition')
    };
  },

  findElements_(element, tagName) {
    let results = [];

    if (element.getName && element.getName() === tagName) {
      results.push(this.elementToObject_(element));
    }

    element.getChildren().forEach(child => {
      results = results.concat(this.findElements_(child, tagName));
    });

    return results;
  },

  elementToObject_(element) {
    const obj = {};

    element.getAttributes().forEach(attr => {
      obj[attr.getName()] = attr.getValue();
    });

    return obj;
  },

testParse() {
  const xml = TOS_IBKR_FLEX.getLastXml();

  if (!xml) {
    throw new Error('No cached IBKR XML found.');
  }

  const parsed = this.parse(xml);
  const trades = parsed.trades || [];
  const openPositions = parsed.openPositions || [];

  Logger.log('============================');
  Logger.log('IBKR FLEX PARSER');
  Logger.log('============================');

  Logger.log('Trades count: ' + trades.length);
  Logger.log('OpenPositions count: ' + openPositions.length);
  Logger.log('AccountInfo count: ' + (parsed.accountInfo || []).length);

  Logger.log('============================');
  Logger.log('TRADES');
  Logger.log('============================');

  trades.forEach((t, i) => {
    Logger.log(
      'TRD #' + (i + 1) +
      ' | Symbol=' + (t.underlyingSymbol || '') +
      ' | Exp=' + (t.expiry || '') +
      ' | ' + (t.putCall || '') + ' ' + (t.strike || '') +
      ' | BuySell=' + (t.buySell || '') +
      ' | Qty=' + (t.quantity || '') +
      ' | OpenClose=' + (t.openCloseIndicator || '') +
      ' | Type=' + (t.transactionType || '') +
      ' | Price=' + (t.tradePrice || '') +
      ' | NetCash=' + (t.netCash || '') +
      ' | Commission=' + (t.ibCommission || '') +
      ' | Notes=' + (t.notes || '') +
      ' | DateTime=' + (t.dateTime || '') +
      ' | Conid=' + (t.conid || '')
    );
  });

  Logger.log('============================');
  Logger.log('OPEN POSITIONS');
  Logger.log('============================');

  openPositions.forEach((p, i) => {
    Logger.log(
      'POS #' + (i + 1) +
      ' | Symbol=' + (p.underlyingSymbol || '') +
      ' | Exp=' + (p.expiry || '') +
      ' | ' + (p.putCall || '') + ' ' + (p.strike || '') +
      ' | Side=' + (p.side || '') +
      ' | Position=' + (p.position || '') +
      ' | Cost=' + (p.costBasisMoney || '') +
      ' | Value=' + (p.positionValue || '')
    );
  });

  return parsed;
}
};

function testIBKRFlexParser() {
  return TOS_IBKR_FLEX_PARSER.testParse();
}