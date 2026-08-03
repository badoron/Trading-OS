/**
 * Trading OS - Setup helpers
 * Run manually only when configuring secrets.
 */

function setupIBKRFlexConfig(token, queryId) {
  const normalizedToken = String(token || '').trim();
  const normalizedQueryId = String(queryId || '').trim();

  if (!normalizedToken || normalizedToken === 'PUT_TOKEN_HERE') {
    throw new Error('A valid IBKR Flex token is required.');
  }

  if (!/^\d+$/.test(normalizedQueryId)) {
    throw new Error('A numeric IBKR Flex query ID is required.');
  }

  TOS_CONFIG.set(TOS_CONFIG.KEYS.IBKR_FLEX_TOKEN, normalizedToken);
  TOS_CONFIG.set(TOS_CONFIG.KEYS.IBKR_FLEX_QUERY_ID, normalizedQueryId);

  Logger.log('IBKR Flex configuration saved.');
}

function debugScriptProperties() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const redacted = {};

  Object.keys(props).forEach(key => {
    const value = String(props[key] || '');
    redacted[key] = value
      ? '[REDACTED length=' + value.length + ']'
      : '[EMPTY]';
  });

  Logger.log(JSON.stringify(redacted, null, 2));
  return redacted;
}
