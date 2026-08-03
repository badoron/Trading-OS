function testReleasePreflightUnitTests() {
  const complete = TOS_RELEASE_PREFLIGHT.evaluate({
    version: 'v3.1.0-rc.2',
    functions: [
      { name: 'runTradingOSApplication', available: true },
      { name: 'runDdcPipeline', available: true }
    ],
    config: [
      { key: 'IBKR_FLEX_TOKEN', present: true },
      { key: 'IBKR_FLEX_QUERY_ID', present: true }
    ],
    sheets: [
      { name: 'MASTER_TRADES', exists: true }
    ]
  });

  tosAssertReleasePreflight_(complete.ok === true, 'Complete preflight should pass.');
  tosAssertReleasePreflight_(complete.failures.length === 0, 'Complete preflight should have no failures.');

  const incomplete = TOS_RELEASE_PREFLIGHT.evaluate({
    version: 'v3.0.0-core',
    functions: [{ name: 'runDdcPipeline', available: false }],
    config: [{ key: 'IBKR_FLEX_TOKEN', present: false }],
    sheets: [{ name: 'TRADE_LEGS', exists: false }]
  });

  tosAssertReleasePreflight_(incomplete.ok === false, 'Incomplete preflight should fail.');
  tosAssertReleasePreflight_(incomplete.failures.length === 4, 'Expected four preflight failures.');

  return true;
}

function tosAssertReleasePreflight_(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
