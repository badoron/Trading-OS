function testDdcCompletionWithResidualUnitTests() {
  const legs = [
    { brokerContractId: '1', longShort: 'SHORT' },
    { brokerContractId: '2', longShort: 'LONG' },
    { brokerContractId: '3', longShort: 'SHORT' },
    { brokerContractId: '4', longShort: 'LONG' }
  ];

  let result = TOS_TRADE_LIFECYCLE_MONITOR.evaluateLifecycle_(legs, {
    '1': true, '2': true, '3': true, '4': true
  });
  ddcResidualAssert_('OPEN', result.status, 'all open');

  result = TOS_TRADE_LIFECYCLE_MONITOR.evaluateLifecycle_(legs, {
    '2': true, '3': true, '4': true
  });
  ddcResidualAssert_('PARTIAL_EXIT', result.status, 'one short remains');

  result = TOS_TRADE_LIFECYCLE_MONITOR.evaluateLifecycle_(legs, {
    '2': true, '4': true
  });
  ddcResidualAssert_('COMPLETED_WITH_RESIDUAL', result.status, 'shorts closed');
  ddcResidualAssert_(true, result.hasResidual, 'residual flag');

  result = TOS_TRADE_LIFECYCLE_MONITOR.evaluateLifecycle_(legs, {});
  ddcResidualAssert_('CLOSED_PENDING_EXIT_SYNC', result.status, 'all closed');

  const finalized = TOS_TRADE_FINALIZER.summarizeTrade_([
    { longShort: 'SHORT', legStatus: 'CLOSED', realizedPnL: 25, commission: -1 },
    { longShort: 'SHORT', legStatus: 'CLOSED', realizedPnL: 15, commission: -1 },
    { longShort: 'LONG', legStatus: 'OPEN', unrealizedPnL: 6 }
  ]);
  ddcResidualAssert_('COMPLETED_WITH_RESIDUAL', finalized.workflowStatus, 'finalizer status');
  ddcResidualAssert_(true, finalized.readyToFinalize, 'ready to finalize');
  ddcResidualAssert_(false, finalized.readyToClose, 'not fully closed');
  ddcResidualAssert_(40, finalized.realizedPnL, 'closed legs realized only');
  return true;
}

function ddcResidualAssert_(expected, actual, label) {
  if (expected !== actual) {
    throw new Error(label + ': expected=' + expected + ', actual=' + actual);
  }
}
