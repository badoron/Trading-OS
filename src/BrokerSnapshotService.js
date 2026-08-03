/**
 * Trading OS - Broker Snapshot Service
 *
 * Loads and normalizes the latest cached IBKR Flex snapshot.
 *
 * Responsibilities:
 * - Load the cached IBKR XML.
 * - Parse the XML exactly once per service call.
 * - Return a normalized broker snapshot.
 *
 * This service performs no spreadsheet writes.
 */

const TOS_BROKER_SNAPSHOT_SERVICE = {
  /**
   * Loads the production broker snapshot.
   *
   * @return {Object} Normalized broker snapshot.
   */
  load() {
    return this.loadWithDependencies_({
      getLastXml: function () {
        return TOS_IBKR_FLEX.getLastXml();
      },

      parse: function (xml) {
        return TOS_IBKR_FLEX_PARSER.parse(xml);
      }
    });
  },

  /**
   * Loads a broker snapshot using injected dependencies.
   *
   * @param {Object} dependencies Service dependencies.
   * @return {Object} Normalized broker snapshot.
   */
  loadWithDependencies_(dependencies) {
    const deps = dependencies || {};

    this.validateDependencies_(deps);

    const xml = deps.getLastXml();

    if (!xml) {
      throw new Error(
        'No cached IBKR XML found. ' +
        'Run testIBKRFlexConnection successfully first.'
      );
    }

    const parsed = deps.parse(xml) || {};

    return {
      xml: xml,
      parsed: parsed,

      trades: Array.isArray(parsed.trades)
        ? parsed.trades
        : [],

      openPositions: Array.isArray(parsed.openPositions)
        ? parsed.openPositions
        : [],

      accountInfo:
        parsed.accountInfo || null,

      equitySummaries:
        Array.isArray(parsed.equitySummaries)
          ? parsed.equitySummaries
          : []
    };
  },

  /**
   * Validates injected dependencies.
   *
   * @param {Object} dependencies Dependency object.
   */
  validateDependencies_(dependencies) {
    const required = [
      'getLastXml',
      'parse'
    ];

    required.forEach(function (name) {
      if (
        typeof dependencies[name] !==
        'function'
      ) {
        throw new Error(
          'BrokerSnapshotService requires dependency: ' +
          name
        );
      }
    });
  }
};

/**
 * Diagnostic entry point.
 *
 * Loads the real cached IBKR snapshot but performs no writes.
 *
 * @return {Object} Snapshot summary.
 */
function testLoadBrokerSnapshot() {
  const snapshot =
    TOS_BROKER_SNAPSHOT_SERVICE.load();

  const result = {
    hasXml: Boolean(snapshot.xml),
    trades: snapshot.trades.length,
    openPositions: snapshot.openPositions.length,
    hasAccountInfo: Boolean(snapshot.accountInfo),
    equitySummaries:
      snapshot.equitySummaries.length
  };

  Logger.log(
    'Broker snapshot loaded: ' +
    JSON.stringify(result)
  );

  return result;
}