/**
 * Trading OS - State Engine
 * Version: v3.0.0-core
 */

const TOS_STATE = {
  canMove(fromStatus, toStatus) {
    const allowed = {
      [TOS_TRADE_STATUS.DETECTED]: [
        TOS_TRADE_STATUS.NEEDS_REVIEW,
        TOS_TRADE_STATUS.ARCHIVED
      ],
      [TOS_TRADE_STATUS.NEEDS_REVIEW]: [
        TOS_TRADE_STATUS.IMPORTED,
        TOS_TRADE_STATUS.ARCHIVED
      ],
      [TOS_TRADE_STATUS.IMPORTED]: [
        TOS_TRADE_STATUS.OPEN
      ],
      [TOS_TRADE_STATUS.OPEN]: [
        TOS_TRADE_STATUS.PARTIAL_CLOSE,
        TOS_TRADE_STATUS.CLOSED,
        TOS_TRADE_STATUS.EXPIRED
      ],
      [TOS_TRADE_STATUS.PARTIAL_CLOSE]: [
        TOS_TRADE_STATUS.CLOSED,
        TOS_TRADE_STATUS.EXPIRED,
        TOS_TRADE_STATUS.ARCHIVED
      ],
      [TOS_TRADE_STATUS.CLOSED]: [
        TOS_TRADE_STATUS.ARCHIVED
      ],
      [TOS_TRADE_STATUS.EXPIRED]: [
        TOS_TRADE_STATUS.ARCHIVED
      ]
    };

    return (allowed[fromStatus] || []).includes(toStatus);
  },

  assertMove(fromStatus, toStatus) {
    if (!this.canMove(fromStatus, toStatus)) {
      throw new Error(`Invalid status transition: ${fromStatus} → ${toStatus}`);
    }
    return true;
  }
};