/**
 * Trading OS - Playbook Rules
 * Version: v3.0.0-core
 */

const TOS_PLAYBOOK = {
  DDC_DEFAULTS: {
    MAX_RISK: {
      value: 400,
      enforcement: TOS_ENFORCEMENT.CRITICAL,
      overrideAllowed: true,
      weight: 25
    },
    MAX_WING_WIDTH: {
      value: 4,
      enforcement: TOS_ENFORCEMENT.WARNING,
      overrideAllowed: true,
      weight: 10
    },
    MIN_STOCK_PRICE: {
      value: 50,
      enforcement: TOS_ENFORCEMENT.WARNING,
      overrideAllowed: true,
      weight: 10
    },
    MIN_EXPECTED_MOVE_DISTANCE: {
      value: 1.5,
      enforcement: TOS_ENFORCEMENT.WARNING,
      overrideAllowed: true,
      weight: 15
    },
    NO_DEBIT: {
      value: 0,
      enforcement: TOS_ENFORCEMENT.CRITICAL,
      overrideAllowed: true,
      weight: 20
    },
    LIQUIDITY_REQUIRED: {
      value: true,
      enforcement: TOS_ENFORCEMENT.WARNING,
      overrideAllowed: true,
      weight: 10
    },
    IV_EXPANSION_REQUIRED: {
      value: true,
      enforcement: TOS_ENFORCEMENT.INFO,
      overrideAllowed: true,
      weight: 10
    }
  },

  evaluateDDC(input) {
    const checks = [];

    checks.push(this.check_(
      'Max Risk',
      input.risk <= this.DDC_DEFAULTS.MAX_RISK.value,
      this.DDC_DEFAULTS.MAX_RISK
    ));

    checks.push(this.check_(
      'Wing Width',
      input.wingWidth <= this.DDC_DEFAULTS.MAX_WING_WIDTH.value,
      this.DDC_DEFAULTS.MAX_WING_WIDTH
    ));

    checks.push(this.check_(
      'Stock Price',
      input.stockPrice >= this.DDC_DEFAULTS.MIN_STOCK_PRICE.value,
      this.DDC_DEFAULTS.MIN_STOCK_PRICE
    ));

    checks.push(this.check_(
      'Expected Move Distance',
      input.expectedMoveDistance >= this.DDC_DEFAULTS.MIN_EXPECTED_MOVE_DISTANCE.value,
      this.DDC_DEFAULTS.MIN_EXPECTED_MOVE_DISTANCE
    ));

    checks.push(this.check_(
      'No Debit',
      input.netCredit >= this.DDC_DEFAULTS.NO_DEBIT.value,
      this.DDC_DEFAULTS.NO_DEBIT
    ));

    const maxScore = checks.reduce((sum, c) => sum + c.weight, 0);
    const actualScore = checks.reduce((sum, c) => sum + (c.pass ? c.weight : 0), 0);

    return {
      score: maxScore ? Math.round((actualScore / maxScore) * 100) : 0,
      checks,
      hasCriticalFailure: checks.some(c => !c.pass && c.enforcement === TOS_ENFORCEMENT.CRITICAL),
      hasWarnings: checks.some(c => !c.pass && c.enforcement === TOS_ENFORCEMENT.WARNING)
    };
  },

  check_(name, condition, rule) {
    return {
      name,
      pass: !!condition,
      enforcement: rule.enforcement,
      overrideAllowed: rule.overrideAllowed,
      weight: rule.weight
    };
  }
};