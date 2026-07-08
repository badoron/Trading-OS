/**
 * Trading OS - IBKR Flex Client
 */

const TOS_IBKR_FLEX = {
  BASE_URL: 'https://www.interactivebrokers.com/Universal/servlet',
  RAW_XML_SHEET: 'IBKR_RAW_XML',

  getConfig() {
    return {
      token: TOS_CONFIG.require(TOS_CONFIG.KEYS.IBKR_FLEX_TOKEN),
      queryId: TOS_CONFIG.require(TOS_CONFIG.KEYS.IBKR_FLEX_QUERY_ID)
    };
  },

  fetch_(url) {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true
    });

    return {
      statusCode: response.getResponseCode(),
      body: response.getContentText()
    };
  },

  sendRequest() {
    const config = this.getConfig();

    const url =
      this.BASE_URL +
      '/FlexStatementService.SendRequest?t=' + encodeURIComponent(config.token) +
      '&q=' + encodeURIComponent(config.queryId) +
      '&v=3';

    const result = this.fetch_(url);

    Logger.log('IBKR SendRequest status: ' + result.statusCode);
    Logger.log('IBKR SendRequest body: ' + result.body.substring(0, 1000));

    if (result.statusCode !== 200) {
      throw new Error('IBKR SendRequest failed: HTTP ' + result.statusCode);
    }

    this.assertSuccess_(result.body, 'SendRequest');

    return result.body;
  },

  assertSuccess_(xmlText, stage) {
    if (xmlText.indexOf('<Status>Fail</Status>') !== -1) {
      throw new Error('IBKR ' + stage + ' failed: ' + xmlText);
    }
  },

  extractReferenceCode(xmlText) {
    const match = xmlText.match(/<ReferenceCode>(.*?)<\/ReferenceCode>/);

    if (!match || !match[1]) {
      throw new Error('ReferenceCode not found in IBKR response: ' + xmlText);
    }

    return match[1];
  },

  getStatement(referenceCode) {
    const config = this.getConfig();

    const url =
      this.BASE_URL +
      '/FlexStatementService.GetStatement?t=' + encodeURIComponent(config.token) +
      '&q=' + encodeURIComponent(referenceCode) +
      '&v=3';

    const result = this.fetch_(url);

    Logger.log('IBKR GetStatement status: ' + result.statusCode);
    Logger.log('IBKR GetStatement first 1000 chars: ' + result.body.substring(0, 1000));

    if (result.statusCode !== 200) {
      throw new Error('IBKR GetStatement failed: HTTP ' + result.statusCode);
    }

    this.assertSuccess_(result.body, 'GetStatement');

    return result.body;
  },

  downloadStatement() {
    const requestXml = this.sendRequest();
    const referenceCode = this.extractReferenceCode(requestXml);

    Logger.log('IBKR ReferenceCode: ' + referenceCode);

    Utilities.sleep(3000);

    return this.getStatement(referenceCode);
  },

  saveLastXml_(xml) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(this.RAW_XML_SHEET);

    if (!sheet) {
      throw new Error('Missing sheet: ' + this.RAW_XML_SHEET);
    }

    sheet.getRange('B1').setValue(new Date());
    sheet.getRange('B2').setValue(xml);
  },

  getLastXml() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(this.RAW_XML_SHEET);

    if (!sheet) {
      throw new Error('Missing sheet: ' + this.RAW_XML_SHEET);
    }

    return sheet.getRange('B2').getValue();
  },

  testConnection() {
    const xml = this.downloadStatement();

    this.saveLastXml_(xml);

    Logger.log('IBKR Flex connection test completed.');
    Logger.log('XML length: ' + xml.length);
    Logger.log('XML preview: ' + xml.substring(0, 1000));

    return xml;
  }
};

function testIBKRFlexConnection() {
  return TOS_IBKR_FLEX.testConnection();
}