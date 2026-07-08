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
      throw new Error('No cached IBKR XML found. Run testIBKRFlexConnection successfully first.');
    }

    const parsed = this.parse(xml);
    const trades = parsed.trades || [];

    Logger.log('Trades count: ' + trades.length);
    Logger.log(JSON.stringify(trades, null, 2));

    return parsed;
  }
};

function testIBKRFlexParser() {
  return TOS_IBKR_FLEX_PARSER.testParse();
}