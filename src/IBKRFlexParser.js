/**
 * Trading OS - IBKR Flex Parser
 * Parses IBKR Flex XML into basic Trading OS objects.
 */

const TOS_IBKR_FLEX_PARSER = {
  parse(xmlText) {
    const doc = XMLService.parse(xmlText);
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

    const children = element.getChildren();

    children.forEach(child => {
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
    const xml = TOS_IBKR_FLEX.downloadStatement();
    const parsed = this.parse(xml);

    Logger.log('AccountInfo count: ' + parsed.accountInfo.length);
    Logger.log('Trades count: ' + parsed.trades.length);
    Logger.log('OpenPositions count: ' + parsed.openPositions.length);

    if (parsed.trades.length > 0) {
      Logger.log('First trade: ' + JSON.stringify(parsed.trades[0], null, 2));
    }

    if (parsed.openPositions.length > 0) {
      Logger.log('First open position: ' + JSON.stringify(parsed.openPositions[0], null, 2));
    }

    return parsed;
  }
};

function testIBKRFlexParser() {
  return TOS_IBKR_FLEX_PARSER.testParse();
}