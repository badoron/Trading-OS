function testResidualPositionClassifierUnitTests() {
  const c = TOS_RESIDUAL_POSITION_CLASSIFIER;
  const allOpen = c.classify_([
    { longShort: 'SHORT', legStatus: 'OPEN' },
    { longShort: 'LONG', legStatus: 'OPEN' }
  ]);
  residualAssert_(false, allOpen.strategyComplete, 'all-open complete');

  const residual = c.classify_([
    { longShort: 'SHORT', legStatus: 'CLOSED' },
    { longShort: 'SHORT', legStatus: 'CLOSED' },
    { longShort: 'LONG', legStatus: 'OPEN', legId: 'L1' },
    { longShort: 'LONG', legStatus: 'OPEN', legId: 'L2' }
  ]);
  residualAssert_(true, residual.strategyComplete, 'strategy complete');
  residualAssert_(true, residual.hasResidual, 'has residual');
  residualAssert_(2, residual.residualLegs.length, 'residual count');
  residualAssert_('CONVERT_TO_RESIDUAL', residual.recommendedDecision, 'decision');

  const unknown = c.classify_([
    { longShort: 'SHORT', legStatus: 'CLOSED' },
    { longShort: '', legStatus: 'OPEN' }
  ]);
  residualAssert_(false, unknown.strategyComplete, 'unknown side safety');

  const preview = c.buildPreview_('T-1', residual);
  residualAssert_(false, preview.destructiveActionTaken, 'preview is safe');
  return true;
}

function residualAssert_(expected, actual, label) {
  if (expected !== actual) {
    throw new Error(label + ': expected=' + expected + ', actual=' + actual);
  }
}
