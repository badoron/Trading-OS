/**
 * Trading OS - Setup helpers
 * Run manually only when configuring secrets.
 */


function setupIBKRFlexConfig() {
  TOS_CONFIG.set(
    TOS_CONFIG.KEYS.IBKR_FLEX_TOKEN,
    'PUT_TOKEN_HERE'
  );

  TOS_CONFIG.set(
    TOS_CONFIG.KEYS.IBKR_FLEX_QUERY_ID,
    '1566805'
  );

  Logger.log('IBKR Flex configuration saved.');
}
function debugScriptProperties() {
  const props = PropertiesService.getScriptProperties().getProperties();

  Logger.log(JSON.stringify(props, null, 2));
}