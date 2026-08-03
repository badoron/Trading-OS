/**
 * Trading OS - IBKR Flex Parser
 *
 * Parses IBKR Flex XML into Trading OS objects.
 *
 * Supported sections:
 * - AccountInformation
 * - Trade
 * - OpenPosition
 * - EquitySummaryInBase
 *   → EquitySummaryByReportDateInBase
 */

const TOS_IBKR_FLEX_PARSER = {
  /**
   * Parses a complete IBKR Flex XML document.
   *
   * Backward compatibility:
   * - trades remains an array
   * - openPositions remains an array
   * - accountInformation exposes the original AccountInformation array
   *
   * New account output:
   * - equitySummaries contains all dated NAV records
   * - accountInfo contains the latest normalized account snapshot
   *
   * @param {string} xmlText IBKR Flex XML.
   * @return {Object} Parsed Flex data.
   */
  parse(xmlText) {
    const doc =
      XmlService.parse(xmlText);

    const root =
      doc.getRootElement();

    const accountInformation =
      this.findElements_(
        root,
        'AccountInformation'
      );

    const trades =
      this.findElements_(
        root,
        'Trade'
      );

    const openPositions =
      this.findElements_(
        root,
        'OpenPosition'
      );

    const equitySummaries =
      this.parseEquitySummaryFromRoot_(
        root
      );

    const latestEquitySummary =
      this.selectLatestEquitySummary_(
        equitySummaries
      );

    return {
      /*
       * Original raw AccountInformation records.
       * Preserved separately for backward compatibility.
       */
      accountInformation:
        accountInformation,

      /*
       * Current normalized account snapshot.
       * Null when EquitySummaryInBase is unavailable.
       */
      accountInfo:
        this.buildAccountInfo_(
          latestEquitySummary
        ),

      trades:
        trades,

      openPositions:
        openPositions,

      equitySummaries:
        equitySummaries
    };
  },

  /**
   * Parses all EquitySummaryByReportDateInBase records
   * from an XML string.
   *
   * Exposed separately for isolated unit testing.
   *
   * @param {string} xmlText IBKR Flex XML.
   * @return {Object[]} Equity summary records.
   */
  parseEquitySummaryFromXml_(
    xmlText
  ) {
    const doc =
      XmlService.parse(xmlText);

    return this.parseEquitySummaryFromRoot_(
      doc.getRootElement()
    );
  },

  /**
   * Extracts and normalizes dated equity summary records.
   *
   * @param {Object} root XML root element.
   * @return {Object[]} Equity summary records.
   */
  parseEquitySummaryFromRoot_(
    root
  ) {
    const rawRecords =
      this.findElements_(
        root,
        'EquitySummaryByReportDateInBase'
      );

    return rawRecords.map(record => {
      return {
        accountId:
          this.text_(
            record.accountId
          ),

        currency:
          this.text_(
            record.currency
          ).toUpperCase(),

        reportDate:
          this.text_(
            record.reportDate
          ),

        cash:
          this.number_(
            record.cash
          ),

        cashLong:
          this.number_(
            record.cashLong
          ),

        cashShort:
          this.number_(
            record.cashShort
          ),

        stock:
          this.number_(
            record.stock
          ),

        stockLong:
          this.number_(
            record.stockLong
          ),

        stockShort:
          this.number_(
            record.stockShort
          ),

        options:
          this.number_(
            record.options
          ),

        optionsLong:
          this.number_(
            record.optionsLong
          ),

        optionsShort:
          this.number_(
            record.optionsShort
          ),

        total:
          this.number_(
            record.total
          ),

        totalLong:
          this.number_(
            record.totalLong
          ),

        totalShort:
          this.number_(
            record.totalShort
          )
      };
    });
  },

  /**
   * Selects the latest equity record by IBKR reportDate.
   *
   * IBKR uses YYYYMMDD, so normalized string comparison is safe.
   * The input array is not mutated.
   *
   * @param {Object[]} records Equity summary records.
   * @return {Object|null} Latest record or null.
   */
  selectLatestEquitySummary_(
    records
  ) {
    const safeRecords =
      (records || []).filter(
        record => {
          return Boolean(record);
        }
      );

    if (safeRecords.length === 0) {
      return null;
    }

    return safeRecords
      .slice()
      .sort((left, right) => {
        const leftDate =
          this.normalizeReportDate_(
            left &&
            left.reportDate
          );

        const rightDate =
          this.normalizeReportDate_(
            right &&
            right.reportDate
          );

        if (
          leftDate === rightDate
        ) {
          return 0;
        }

        return leftDate < rightDate
          ? 1
          : -1;
      })[0];
  },

  /**
   * Converts the latest equity record into the standard
   * Trading OS account-info shape.
   *
   * Net Liquidation is sourced from Equity Summary "total".
   * Total Cash Value is sourced from "cash".
   *
   * Buying Power and margin fields are not supplied by this
   * Flex section and therefore remain zero.
   *
   * @param {Object|null} latest Latest equity record.
   * @return {Object|null} Normalized account info.
   */
  buildAccountInfo_(
    latest
  ) {
    if (!latest) {
      return null;
    }

    return {
      accountId:
        this.text_(
          latest.accountId
        ),

      currency:
        this.text_(
          latest.currency
        ).toUpperCase(),

      reportDate:
        this.text_(
          latest.reportDate
        ),

      timestamp:
        this.reportDateToDate_(
          latest.reportDate
        ),

      netLiquidation:
        this.number_(
          latest.total
        ),

      totalCashValue:
        this.number_(
          latest.cash
        ),

      cash:
        this.number_(
          latest.cash
        ),

      stockValue:
        this.number_(
          latest.stock
        ),

      optionsValue:
        this.number_(
          latest.options
        ),

      cashLong:
        this.number_(
          latest.cashLong
        ),

      cashShort:
        this.number_(
          latest.cashShort
        ),

      stockLong:
        this.number_(
          latest.stockLong
        ),

      stockShort:
        this.number_(
          latest.stockShort
        ),

      optionsLong:
        this.number_(
          latest.optionsLong
        ),

      optionsShort:
        this.number_(
          latest.optionsShort
        ),

      totalLong:
        this.number_(
          latest.totalLong
        ),

      totalShort:
        this.number_(
          latest.totalShort
        ),

      /*
       * Not available from EquitySummaryInBase.
       * These can later be populated from an IBKR account API.
       */
      buyingPower: 0,
      excessLiquidity: 0,
      maintenanceMargin: 0,
      initialMargin: 0
    };
  },

  /**
   * Recursively finds XML elements by tag name.
   *
   * @param {Object} element XML element.
   * @param {string} tagName Requested XML tag.
   * @return {Object[]} Attribute objects.
   */
  findElements_(
    element,
    tagName
  ) {
    let results = [];

    if (
      element.getName &&
      element.getName() === tagName
    ) {
      results.push(
        this.elementToObject_(
          element
        )
      );
    }

    element
      .getChildren()
      .forEach(child => {
        results = results.concat(
          this.findElements_(
            child,
            tagName
          )
        );
      });

    return results;
  },

  /**
   * Converts an XML element's attributes into a plain object.
   *
   * Attribute values remain strings here so the existing
   * Trade/OpenPosition behavior does not change.
   *
   * @param {Object} element XML element.
   * @return {Object} Attribute map.
   */
  elementToObject_(
    element
  ) {
    const obj = {};

    element
      .getAttributes()
      .forEach(attr => {
        obj[
          attr.getName()
        ] = attr.getValue();
      });

    return obj;
  },

  /**
   * Converts YYYYMMDD to a Date at local midnight.
   *
   * @param {*} value IBKR report date.
   * @return {Date|string} Date or blank.
   */
  reportDateToDate_(
    value
  ) {
    const normalized =
      this.normalizeReportDate_(
        value
      );

    if (
      normalized.length !== 8
    ) {
      return '';
    }

    const year =
      Number(
        normalized.substring(
          0,
          4
        )
      );

    const month =
      Number(
        normalized.substring(
          4,
          6
        )
      );

    const day =
      Number(
        normalized.substring(
          6,
          8
        )
      );

    if (
      !year ||
      !month ||
      !day
    ) {
      return '';
    }

    return new Date(
      year,
      month - 1,
      day
    );
  },

  /**
   * Normalizes report-date values for comparison.
   *
   * @param {*} value Report date.
   * @return {string} YYYYMMDD-like digit string.
   */
  normalizeReportDate_(
    value
  ) {
    return this.text_(
      value
    ).replace(
      /[^0-9]/g,
      ''
    );
  },

  /**
   * Parses a numeric XML attribute safely.
   *
   * @param {*} value Attribute value.
   * @return {number} Parsed number or zero.
   */
  number_(
    value
  ) {
    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return value;
    }

    const normalized =
      this.text_(
        value
      ).replace(
        /,/g,
        ''
      );

    if (!normalized) {
      return 0;
    }

    const parsed =
      Number(normalized);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  },

  /**
   * Normalizes arbitrary values to text.
   *
   * @param {*} value Any value.
   * @return {string} Trimmed text.
   */
  text_(
    value
  ) {
    return String(
      value === null ||
      value === undefined
        ? ''
        : value
    ).trim();
  },

  /**
   * Diagnostic parser execution against the cached Flex XML.
   *
   * No spreadsheet writes.
   *
   * @return {Object} Parsed data.
   */
  testParse() {
    const xml =
      TOS_IBKR_FLEX.getLastXml();

    if (!xml) {
      throw new Error(
        'No cached IBKR XML found.'
      );
    }

    const parsed =
      this.parse(xml);

    const trades =
      parsed.trades || [];

    const openPositions =
      parsed.openPositions || [];

    const equitySummaries =
      parsed.equitySummaries || [];

    const accountInfo =
      parsed.accountInfo;

    Logger.log(
      '============================'
    );

    Logger.log(
      'IBKR FLEX PARSER'
    );

    Logger.log(
      '============================'
    );

    Logger.log(
      'Trades count: ' +
      trades.length
    );

    Logger.log(
      'OpenPositions count: ' +
      openPositions.length
    );

    Logger.log(
      'AccountInformation count: ' +
      (
        parsed.accountInformation ||
        []
      ).length
    );

    Logger.log(
      'EquitySummaries count: ' +
      equitySummaries.length
    );

    Logger.log(
      'AccountInfo count: ' +
      (
        accountInfo
          ? 1
          : 0
      )
    );

    if (accountInfo) {
      Logger.log(
        '============================'
      );

      Logger.log(
        'LATEST ACCOUNT SUMMARY'
      );

      Logger.log(
        '============================'
      );

      Logger.log(
        'AccountID=' +
        accountInfo.accountId +
        ' | Currency=' +
        accountInfo.currency +
        ' | ReportDate=' +
        accountInfo.reportDate +
        ' | NetLiquidation=' +
        accountInfo.netLiquidation +
        ' | Cash=' +
        accountInfo.totalCashValue +
        ' | StockValue=' +
        accountInfo.stockValue +
        ' | OptionsValue=' +
        accountInfo.optionsValue
      );
    }

    Logger.log(
      '============================'
    );

    Logger.log(
      'TRADES'
    );

    Logger.log(
      '============================'
    );

    trades.forEach(
      (trade, index) => {
        Logger.log(
          'TRD #' +
          (index + 1) +
          ' | Symbol=' +
          (
            trade.underlyingSymbol ||
            ''
          ) +
          ' | Exp=' +
          (
            trade.expiry ||
            ''
          ) +
          ' | ' +
          (
            trade.putCall ||
            ''
          ) +
          ' ' +
          (
            trade.strike ||
            ''
          ) +
          ' | BuySell=' +
          (
            trade.buySell ||
            ''
          ) +
          ' | Qty=' +
          (
            trade.quantity ||
            ''
          ) +
          ' | OpenClose=' +
          (
            trade.openCloseIndicator ||
            ''
          ) +
          ' | Type=' +
          (
            trade.transactionType ||
            ''
          ) +
          ' | Price=' +
          (
            trade.tradePrice ||
            ''
          ) +
          ' | NetCash=' +
          (
            trade.netCash ||
            ''
          ) +
          ' | Commission=' +
          (
            trade.ibCommission ||
            ''
          ) +
          ' | Notes=' +
          (
            trade.notes ||
            ''
          ) +
          ' | DateTime=' +
          (
            trade.dateTime ||
            ''
          ) +
          ' | Conid=' +
          (
            trade.conid ||
            ''
          )
        );
      }
    );

    Logger.log(
      '============================'
    );

    Logger.log(
      'OPEN POSITIONS'
    );

    Logger.log(
      '============================'
    );

    openPositions.forEach(
      (position, index) => {
        Logger.log(
          'POS #' +
          (index + 1) +
          ' | Symbol=' +
          (
            position.underlyingSymbol ||
            ''
          ) +
          ' | Exp=' +
          (
            position.expiry ||
            ''
          ) +
          ' | ' +
          (
            position.putCall ||
            ''
          ) +
          ' ' +
          (
            position.strike ||
            ''
          ) +
          ' | Side=' +
          (
            position.side ||
            ''
          ) +
          ' | Position=' +
          (
            position.position ||
            ''
          ) +
          ' | Cost=' +
          (
            position.costBasisMoney ||
            ''
          ) +
          ' | Value=' +
          (
            position.positionValue ||
            ''
          )
        );
      }
    );

    return parsed;
  }
};

/**
 * Cached IBKR Flex parser diagnostic.
 */
function testIBKRFlexParser() {
  return TOS_IBKR_FLEX_PARSER
    .testParse();
}