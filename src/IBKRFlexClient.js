/**
 * Trading OS - IBKR Flex Client
 * Downloads IBKR Flex XML and persists it in sheet chunks.
 */

const TOS_IBKR_FLEX = {
  BASE_URL: 'https://www.interactivebrokers.com/Universal/servlet',
  RAW_XML_SHEET: 'IBKR_RAW_XML',

  MAX_RETRIES: 10,
  RETRY_SLEEP_MS: 10000,

  // Safely below Google Sheets' 50,000-character cell limit.
  XML_CHUNK_SIZE: 45000,

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

  hasFailure_(xmlText) {
    return String(xmlText || '').indexOf('<Status>Fail</Status>') !== -1;
  },

  getErrorCode_(xmlText) {
    const match = String(xmlText || '').match(
      /<ErrorCode>(.*?)<\/ErrorCode>/
    );

    return match ? match[1] : '';
  },

  sendRequestOnce_() {
    const config = this.getConfig();

    const url =
      this.BASE_URL +
      '/FlexStatementService.SendRequest?t=' +
      encodeURIComponent(config.token) +
      '&q=' +
      encodeURIComponent(config.queryId) +
      '&v=3';

    const result = this.fetch_(url);

    Logger.log('IBKR SendRequest HTTP: ' + result.statusCode);
    Logger.log(
      'IBKR SendRequest body: ' +
      result.body.substring(0, 1000)
    );

    if (result.statusCode !== 200) {
      throw new Error(
        'IBKR SendRequest HTTP failed: ' + result.statusCode
      );
    }

    return result.body;
  },

  sendRequest() {
    for (
      let attempt = 1;
      attempt <= this.MAX_RETRIES;
      attempt++
    ) {
      Logger.log(
        'IBKR SendRequest attempt ' +
        attempt +
        '/' +
        this.MAX_RETRIES
      );

      const body = this.sendRequestOnce_();

      if (!this.hasFailure_(body)) {
        return body;
      }

      const errorCode = this.getErrorCode_(body);

      if (errorCode !== '1001') {
        throw new Error(
          'IBKR SendRequest failed: ' + body
        );
      }

      if (attempt < this.MAX_RETRIES) {
        Logger.log(
          'IBKR 1001 received. Waiting before retry...'
        );

        Utilities.sleep(this.RETRY_SLEEP_MS);
      }
    }

    throw new Error(
      'IBKR SendRequest failed after retries.'
    );
  },

  extractReferenceCode(xmlText) {
    const match = String(xmlText || '').match(
      /<ReferenceCode>(.*?)<\/ReferenceCode>/
    );

    if (!match || !match[1]) {
      throw new Error(
        'ReferenceCode not found in IBKR response: ' +
        xmlText
      );
    }

    return match[1];
  },

  getStatement(referenceCode) {
    const config = this.getConfig();

    const url =
      this.BASE_URL +
      '/FlexStatementService.GetStatement?t=' +
      encodeURIComponent(config.token) +
      '&q=' +
      encodeURIComponent(referenceCode) +
      '&v=3';

    const result = this.fetch_(url);

    Logger.log(
      'IBKR GetStatement HTTP: ' + result.statusCode
    );

    Logger.log(
      'IBKR GetStatement body: ' +
      result.body.substring(0, 1000)
    );

    if (result.statusCode !== 200) {
      throw new Error(
        'IBKR GetStatement HTTP failed: ' +
        result.statusCode
      );
    }

    if (this.hasFailure_(result.body)) {
      throw new Error(
        'IBKR GetStatement failed: ' + result.body
      );
    }

    return result.body;
  },

  downloadStatement() {
    const requestXml = this.sendRequest();
    const referenceCode =
      this.extractReferenceCode(requestXml);

    Logger.log(
      'IBKR ReferenceCode: ' + referenceCode
    );

    Utilities.sleep(3000);

    return this.getStatement(referenceCode);
  },

  getRawXmlSheet_() {
    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(this.RAW_XML_SHEET);

    if (!sheet) {
      throw new Error(
        'Missing sheet: ' + this.RAW_XML_SHEET
      );
    }

    return sheet;
  },

  splitXmlIntoChunks_(xml) {
    const chunks = [];

    for (
      let start = 0;
      start < xml.length;
      start += this.XML_CHUNK_SIZE
    ) {
      chunks.push(
        xml.substring(
          start,
          start + this.XML_CHUNK_SIZE
        )
      );
    }

    return chunks;
  },

  saveLastXml_(xml) {
    if (!xml) {
      throw new Error('Cannot save empty IBKR XML.');
    }

    const sheet = this.getRawXmlSheet_();
    const chunks = this.splitXmlIntoChunks_(xml);

    // Layout:
    // B1 = last updated timestamp
    // B2 = chunk count
    // B3:B... = XML chunks
    sheet
      .getRange(1, 2, sheet.getMaxRows(), 1)
      .clearContent();

    sheet.getRange('B1').setValue(new Date());
    sheet.getRange('B2').setValue(chunks.length);

    const chunkRows = chunks.map(chunk => [chunk]);

    sheet
      .getRange(3, 2, chunkRows.length, 1)
      .setValues(chunkRows);

    Logger.log(
      'IBKR XML saved in ' +
      chunks.length +
      ' chunk(s).'
    );
  },

  getLastXml() {
    const sheet = this.getRawXmlSheet_();
    const chunkCountValue = sheet
      .getRange('B2')
      .getValue();

    /*
     * Backward compatibility:
     * Old implementation stored the full XML directly in B2.
     */
    if (
      typeof chunkCountValue === 'string' &&
      chunkCountValue.trim().indexOf('<') === 0
    ) {
      return chunkCountValue;
    }

    const chunkCount = Number(chunkCountValue || 0);

    if (!Number.isFinite(chunkCount) || chunkCount <= 0) {
      return '';
    }

    const chunks = sheet
      .getRange(3, 2, chunkCount, 1)
      .getValues()
      .map(row => String(row[0] || ''));

    return chunks.join('');
  },

  testConnection() {
    const xml = this.downloadStatement();

    this.saveLastXml_(xml);

    Logger.log(
      'IBKR Flex connection test completed.'
    );

    Logger.log('XML length: ' + xml.length);

    Logger.log(
      'XML preview: ' + xml.substring(0, 1000)
    );

    return xml;
  }
};

function testIBKRFlexConnection() {
  return TOS_IBKR_FLEX.testConnection();
}