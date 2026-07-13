/**
 * Trading OS - Trade Finalizer
 *
 * Finalizes a DDC trade only after every original leg is CLOSED.
 *
 * DDC lifecycle rules:
 * - No closed legs: OPEN
 * - Some closed legs and some open legs: PARTIAL_EXIT
 * - All original legs closed: CLOSED
 * - Final RealizedPnL is the sum of closed leg RealizedPnL values.
 * - Commission is summed separately and is not deducted again.
 * - ExitDateTime is taken from the latest closed leg.
 *
 * Current stage:
 * - Isolated trade summary logic
 * - No Google Sheets writes yet
 */

const TOS_TRADE_FINALIZER = {
  /**
   * Summarizes the state of a DDC trade from its original legs.
   *
   * @param {Object[]} legs Normalized TRADE_LEGS records.
   * @return {Object} Trade finalization summary.
   */
  summarizeTrade_(legs) {
    const safeLegs = legs || [];
    const totalLegs = safeLegs.length;

    if (totalLegs === 0) {
      return {
        readyToClose: false,
        workflowStatus: 'OPEN',
        totalLegs: 0,
        closedLegs: 0,
        openLegs: 0,
        realizedPnL: 0,
        commission: 0,
        exitDateTime: ''
      };
    }

    let closedLegs = 0;
    let realizedPnL = 0;
    let commission = 0;
    let exitDateTime = '';

    safeLegs.forEach(leg => {
      const legStatus = this.text_(
        leg && leg.legStatus
      ).toUpperCase();

      if (legStatus !== 'CLOSED') {
        return;
      }

      closedLegs++;

      realizedPnL += this.number_(
        leg && leg.realizedPnL
      );

      commission += this.number_(
        leg && leg.commission
      );

      const legExitDateTime = this.text_(
        leg && leg.exitDateTime
      );

      if (
        legExitDateTime &&
        (
          !exitDateTime ||
          legExitDateTime > exitDateTime
        )
      ) {
        exitDateTime = legExitDateTime;
      }
    });

    const openLegs = totalLegs - closedLegs;
    const readyToClose = closedLegs === totalLegs;

    let workflowStatus = 'OPEN';

    if (readyToClose) {
      workflowStatus = 'CLOSED';
    } else if (closedLegs > 0) {
      workflowStatus = 'PARTIAL_EXIT';
    }

    return {
      readyToClose: readyToClose,
      workflowStatus: workflowStatus,
      totalLegs: totalLegs,
      closedLegs: closedLegs,
      openLegs: openLegs,
      realizedPnL: this.roundMoney_(realizedPnL),
      commission: this.roundMoney_(commission),
      exitDateTime: exitDateTime
    };
  },

  text_(value) {
    return String(
      value === null || value === undefined
        ? ''
        : value
    ).trim();
  },

  number_(value) {
    const normalized = this.text_(value);

    if (!normalized) {
      return 0;
    }

    const parsed = Number(
      normalized.replace(/,/g, '')
    );

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  },

  roundMoney_(value) {
    return Math.round(
      (Number(value) + Number.EPSILON) * 100
    ) / 100;
  }
};