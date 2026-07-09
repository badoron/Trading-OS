/**
 * Trading OS - Config Service
 * Centralized access to Script Properties.
 */

const TOS_CONFIG = {
  KEYS: {
    IBKR_FLEX_TOKEN: 'IBKR_FLEX_TOKEN',
    IBKR_FLEX_QUERY_ID: 'IBKR_FLEX_QUERY_ID'
  },

  get(key) {
    return PropertiesService
      .getScriptProperties()
      .getProperty(key);
  },

  set(key, value) {
    PropertiesService
      .getScriptProperties()
      .setProperty(key, value);
  },

  require(key) {
    const value = this.get(key);

    if (!value) {
      throw new Error('Missing required config: ' + key);
    }

    return value;
  }
};