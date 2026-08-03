/**
 * Trading OS - Residual Position Classifier
 *
 * Pure DDC completion logic. A DDC strategy is complete once every
 * original SHORT leg is closed. Any remaining open LONG leg is a residual
 * position and must not keep the strategy in PARTIAL_EXIT indefinitely.
 */
const TOS_RESIDUAL_POSITION_CLASSIFIER = {
  DECISIONS: {
    IGNORE: 'IGNORE',
    ARCHIVE: 'ARCHIVE',
    CONVERT_TO_RESIDUAL: 'CONVERT_TO_RESIDUAL'
  },

  classify_(legs) {
    const safeLegs = legs || [];
    const result = {
      totalLegs: safeLegs.length,
      openLegs: 0,
      closedLegs: 0,
      openShorts: 0,
      closedShorts: 0,
      openLongs: 0,
      closedLongs: 0,
      unknownOpenLegs: 0,
      strategyComplete: false,
      hasResidual: false,
      residualLegs: [],
      recommendedDecision: this.DECISIONS.IGNORE
    };

    safeLegs.forEach(leg => {
      const status = this.text_(leg && leg.legStatus).toUpperCase();
      const side = this.text_(leg && leg.longShort).toUpperCase();
      const isClosed = status === 'CLOSED';

      if (isClosed) {
        result.closedLegs++;
        if (side === 'SHORT') result.closedShorts++;
        if (side === 'LONG') result.closedLongs++;
        return;
      }

      result.openLegs++;
      if (side === 'SHORT') {
        result.openShorts++;
      } else if (side === 'LONG') {
        result.openLongs++;
        result.residualLegs.push(leg);
      } else {
        result.unknownOpenLegs++;
      }
    });

    const totalShorts = result.openShorts + result.closedShorts;
    result.strategyComplete =
      totalShorts > 0 &&
      result.openShorts === 0 &&
      result.unknownOpenLegs === 0;

    result.hasResidual =
      result.strategyComplete &&
      result.openLongs > 0;

    result.recommendedDecision = result.hasResidual
      ? this.DECISIONS.CONVERT_TO_RESIDUAL
      : this.DECISIONS.IGNORE;

    return result;
  },

  fromOpenPositionSnapshot_(tradeLegs, openConids) {
    const safeOpenConids = openConids || {};
    const normalized = (tradeLegs || []).map(leg => {
      const contractId = this.text_(leg && leg.brokerContractId);
      return Object.assign({}, leg, {
        legStatus: contractId && safeOpenConids[contractId] === true
          ? 'OPEN'
          : 'CLOSED'
      });
    });
    return this.classify_(normalized);
  },

  buildPreview_(tradeId, classification) {
    const safe = classification || this.classify_([]);
    return {
      tradeId: this.text_(tradeId),
      strategyComplete: safe.strategyComplete,
      hasResidual: safe.hasResidual,
      residualLegCount: safe.residualLegs.length,
      recommendedDecision: safe.recommendedDecision,
      destructiveActionTaken: false
    };
  },

  text_(value) {
    return String(value === null || value === undefined ? '' : value).trim();
  }
};
