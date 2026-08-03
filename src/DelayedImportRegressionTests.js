/**
 * Trading OS - Delayed Import Regression Test
 *
 * User journey:
 * Day 1:
 * - A four-leg DDC trade exists in Trading OS.
 * - No broker import is performed.
 *
 * Day 2:
 * - Two legs are closed at IBKR.
 * - A single delayed Flex import contains the current
 *   open positions and the closing executions.
 *
 * Expected:
 * - Trade lifecycle becomes PARTIAL_EXIT.
 * - Two original legs remain open.
 * - Two original legs are synchronized as closed.
 * - Trade Finalizer must not close the whole trade.
 *
 * Isolated test:
 * - No Google Sheets reads or writes.
 * - No IBKR connection.
 */

function testDelayedImportRegressionUnitTests() {
  const tradeId =
    'TRD-DELAYED-IMPORT';

  const masterTrade = {
    tradeId: tradeId,
    strategyId: 'DDC',
    workflowStatus: 'OPEN'
  };

  const legs = [
    {
      rowNumber: 101,
      tradeId: tradeId,
      brokerContractId: 'DDC-101',
      longShort: 'SHORT',
      quantity: '-1',
      legStatus: 'OPEN'
    },
    {
      rowNumber: 102,
      tradeId: tradeId,
      brokerContractId: 'DDC-102',
      longShort: 'LONG',
      quantity: '1',
      legStatus: 'OPEN'
    },
    {
      rowNumber: 103,
      tradeId: tradeId,
      brokerContractId: 'DDC-103',
      longShort: 'SHORT',
      quantity: '-1',
      legStatus: 'OPEN'
    },
    {
      rowNumber: 104,
      tradeId: tradeId,
      brokerContractId: 'DDC-104',
      longShort: 'LONG',
      quantity: '1',
      legStatus: 'OPEN'
    }
  ];

  /*
   * The delayed import reports that only
   * contracts 101 and 102 are still open.
   */
  const openPositions = [
    {
      conid: 'DDC-101'
    },
    {
      conid: 'DDC-102'
    }
  ];

  /*
   * The same Flex history window contains
   * the closing executions for contracts
   * 103 and 104.
   */
  const executions = [
    {
      conid: 'DDC-103',
      buySell: 'BUY',
      quantity: '1',
      openCloseIndicator: 'C',
      transactionType: 'ExchTrade',
      tradePrice: '0.25',
      netCash: '-26.50',
      ibCommission: '-1.50',
      fifoPnlRealized: '48.50',
      notes: '',
      dateTime: '20260724;101500'
    },
    {
      conid: 'DDC-104',
      buySell: 'SELL',
      quantity: '1',
      openCloseIndicator: 'C',
      transactionType: 'ExchTrade',
      tradePrice: '0.10',
      netCash: '8.50',
      ibCommission: '-1.50',
      fifoPnlRealized: '-19',
      notes: '',
      dateTime: '20260724;101500'
    }
  ];

  /*
   * STEP 1:
   * Reconstruct lifecycle from current open positions.
   */
  const openConidMap =
    TOS_TRADE_LIFECYCLE_MONITOR
      .buildOpenConidMap_(
        openPositions
      );

  const lifecycle =
    TOS_TRADE_LIFECYCLE_MONITOR
      .evaluateLifecycle_(
        legs,
        openConidMap
      );

  delayedImportAssertEqual_(
    'PARTIAL_EXIT',
    lifecycle.status,
    'lifecycle status'
  );

  delayedImportAssertEqual_(
    2,
    lifecycle.openLegs,
    'lifecycle open legs'
  );

  delayedImportAssertEqual_(
    2,
    lifecycle.closedLegs,
    'lifecycle closed legs'
  );

  masterTrade.workflowStatus =
    lifecycle.status;

  /*
   * STEP 2:
   * Match closing executions to the two
   * original legs that disappeared from
   * IBKR open positions.
   */
  const legsByTradeId = {};

  legsByTradeId[tradeId] =
    legs;

  const exitUpdates =
    TOS_EXIT_SYNCHRONIZER
      .buildLegExitPreview_(
        [masterTrade],
        legsByTradeId,
        executions
      );

  delayedImportAssertEqual_(
    2,
    exitUpdates.length,
    'exit update count'
  );

  delayedImportApplyExitUpdates_(
    legs,
    exitUpdates
  );

  /*
   * STEP 3:
   * Verify the reconstructed leg state.
   */
  const openLegs =
    legs.filter(function (leg) {
      return leg.legStatus === 'OPEN';
    });

  const closedLegs =
    legs.filter(function (leg) {
      return leg.legStatus === 'CLOSED';
    });

  delayedImportAssertEqual_(
    2,
    openLegs.length,
    'final open leg count'
  );

  delayedImportAssertEqual_(
    2,
    closedLegs.length,
    'final closed leg count'
  );

  delayedImportAssertEqual_(
    'OPEN',
    legs[0].legStatus,
    'contract DDC-101 status'
  );

  delayedImportAssertEqual_(
    'OPEN',
    legs[1].legStatus,
    'contract DDC-102 status'
  );

  delayedImportAssertEqual_(
    'CLOSED',
    legs[2].legStatus,
    'contract DDC-103 status'
  );

  delayedImportAssertEqual_(
    'CLOSED',
    legs[3].legStatus,
    'contract DDC-104 status'
  );

  /*
   * STEP 4:
   * The trade must remain partial because
   * two original legs are still open.
   */
  const finalization =
    TOS_TRADE_FINALIZER
      .summarizeTrade_(
        legs
      );

  delayedImportAssertEqual_(
    false,
    finalization.readyToClose,
    'readyToClose'
  );

  delayedImportAssertEqual_(
    'PARTIAL_EXIT',
    finalization.workflowStatus,
    'final workflow status'
  );

  Logger.log(
    'Delayed import regression completed. Passed=1'
  );

  return {
    passed: 1,
    failed: 0
  };
}

function delayedImportApplyExitUpdates_(
  legs,
  updates
) {
  const legsByConid = {};

  legs.forEach(function (leg) {
    legsByConid[
      String(
        leg.brokerContractId
      )
    ] = leg;
  });

  updates.forEach(function (update) {
    const conid =
      String(
        update.brokerContractId
      );

    const leg =
      legsByConid[conid];

    if (!leg) {
      throw new Error(
        'Unknown exit update contract: ' +
        conid
      );
    }

    leg.legStatus =
      update.legStatus ||
      'CLOSED';

    leg.exitPrice =
      update.exitPrice;

    leg.exitDateTime =
      update.exitDateTime;

    leg.exitType =
      update.exitType;

    leg.realizedPnL =
      update.realizedPnL;

    leg.commission =
      update.commission;
  });
}

function delayedImportAssertEqual_(
  expected,
  actual,
  label
) {
  if (expected !== actual) {
    throw new Error(
      label +
      ': expected=' +
      expected +
      ', actual=' +
      actual
    );
  }
}
/**
 * User journey:
 * Day 1:
 * - A four-leg DDC trade exists in Trading OS.
 * - No broker import is performed.
 *
 * Day 2:
 * - All four legs are closed at IBKR.
 * - One delayed Flex import contains all closing executions.
 *
 * Expected:
 * - Lifecycle first identifies CLOSED_PENDING_EXIT_SYNC.
 * - All four original legs are synchronized as CLOSED.
 * - Finalizer marks the trade CLOSED.
 * - Realized PnL, commission and final exit time are reconstructed.
 */
function testDelayedImportFullExitRegressionUnitTests() {
  const tradeId =
    'TRD-DELAYED-FULL-EXIT';

  const masterTrade = {
    tradeId: tradeId,
    strategyId: 'DDC',
    workflowStatus: 'OPEN'
  };

  const legs = [
    {
      rowNumber: 201,
      tradeId: tradeId,
      brokerContractId: 'FULL-201',
      longShort: 'SHORT',
      quantity: '-1',
      legStatus: 'OPEN'
    },
    {
      rowNumber: 202,
      tradeId: tradeId,
      brokerContractId: 'FULL-202',
      longShort: 'LONG',
      quantity: '1',
      legStatus: 'OPEN'
    },
    {
      rowNumber: 203,
      tradeId: tradeId,
      brokerContractId: 'FULL-203',
      longShort: 'SHORT',
      quantity: '-1',
      legStatus: 'OPEN'
    },
    {
      rowNumber: 204,
      tradeId: tradeId,
      brokerContractId: 'FULL-204',
      longShort: 'LONG',
      quantity: '1',
      legStatus: 'OPEN'
    }
  ];

  /*
   * No original leg remains open when the delayed
   * import is finally performed.
   */
  const openPositions = [];

  const executions = [
    {
      conid: 'FULL-201',
      buySell: 'BUY',
      quantity: '1',
      openCloseIndicator: 'C',
      transactionType: 'ExchTrade',
      tradePrice: '0.20',
      netCash: '-21.50',
      ibCommission: '-1.50',
      fifoPnlRealized: '40',
      notes: '',
      dateTime: '20260724;101000'
    },
    {
      conid: 'FULL-202',
      buySell: 'SELL',
      quantity: '1',
      openCloseIndicator: 'C',
      transactionType: 'ExchTrade',
      tradePrice: '0.05',
      netCash: '3.50',
      ibCommission: '-1.50',
      fifoPnlRealized: '-10',
      notes: '',
      dateTime: '20260724;101000'
    },
    {
      conid: 'FULL-203',
      buySell: 'BUY',
      quantity: '1',
      openCloseIndicator: 'C',
      transactionType: 'ExchTrade',
      tradePrice: '0.30',
      netCash: '-31.50',
      ibCommission: '-1.50',
      fifoPnlRealized: '25',
      notes: '',
      dateTime: '20260724;103000'
    },
    {
      conid: 'FULL-204',
      buySell: 'SELL',
      quantity: '1',
      openCloseIndicator: 'C',
      transactionType: 'ExchTrade',
      tradePrice: '0.10',
      netCash: '8.50',
      ibCommission: '-1.50',
      fifoPnlRealized: '-15',
      notes: '',
      dateTime: '20260724;103000'
    }
  ];

  /*
   * STEP 1:
   * Lifecycle recognizes that no original
   * contracts remain in IBKR open positions.
   */
  const openConidMap =
    TOS_TRADE_LIFECYCLE_MONITOR
      .buildOpenConidMap_(
        openPositions
      );

  const lifecycle =
    TOS_TRADE_LIFECYCLE_MONITOR
      .evaluateLifecycle_(
        legs,
        openConidMap
      );

  delayedImportAssertEqual_(
    'CLOSED_PENDING_EXIT_SYNC',
    lifecycle.status,
    'lifecycle status before exit sync'
  );

  delayedImportAssertEqual_(
    0,
    lifecycle.openLegs,
    'lifecycle open legs'
  );

  delayedImportAssertEqual_(
    4,
    lifecycle.closedLegs,
    'lifecycle closed legs'
  );

  masterTrade.workflowStatus =
    lifecycle.status;

  /*
   * STEP 2:
   * Match all four closing executions to the
   * original trade legs.
   */
  const legsByTradeId = {};

  legsByTradeId[tradeId] =
    legs;

  const exitUpdates =
    TOS_EXIT_SYNCHRONIZER
      .buildLegExitPreview_(
        [masterTrade],
        legsByTradeId,
        executions
      );

  delayedImportAssertEqual_(
    4,
    exitUpdates.length,
    'exit update count'
  );

  delayedImportApplyExitUpdates_(
    legs,
    exitUpdates
  );

  const openLegs =
    legs.filter(function (leg) {
      return leg.legStatus === 'OPEN';
    });

  const closedLegs =
    legs.filter(function (leg) {
      return leg.legStatus === 'CLOSED';
    });

  delayedImportAssertEqual_(
    0,
    openLegs.length,
    'final open leg count'
  );

  delayedImportAssertEqual_(
    4,
    closedLegs.length,
    'final closed leg count'
  );

  /*
   * STEP 3:
   * Finalizer reconstructs the completed trade.
   *
   * PnL:
   * 40 - 10 + 25 - 15 = 40
   *
   * Commission:
   * -1.50 * 4 = -6
   */
  const finalization =
    TOS_TRADE_FINALIZER
      .summarizeTrade_(
        legs
      );

  delayedImportAssertEqual_(
    true,
    finalization.readyToClose,
    'readyToClose'
  );

  delayedImportAssertEqual_(
    'CLOSED',
    finalization.workflowStatus,
    'final workflow status'
  );

  delayedImportAssertEqual_(
    40,
    finalization.realizedPnL,
    'final realized PnL'
  );

  delayedImportAssertEqual_(
    -6,
    finalization.commission,
    'final commission'
  );

  delayedImportAssertEqual_(
    '20260724;103000',
    finalization.exitDateTime,
    'final exit date and time'
  );

  Logger.log(
    'Delayed full-exit import regression completed. Passed=1'
  );

  return {
    passed: 1,
    failed: 0
  };
}
/**
 * User journey:
 * Day 1:
 * - A four-leg DDC trade exists in Trading OS.
 *
 * Days 2-4:
 * - No Flex imports are performed.
 *
 * Day 5:
 * - Two legs are closed at IBKR.
 *
 * Days 6-7:
 * - No Flex imports are performed.
 *
 * Day 8:
 * - One Flex import contains the current open positions
 *   and the historical closing executions.
 *
 * Expected:
 * - The elapsed days and missed imports do not affect reconstruction.
 * - Trade becomes PARTIAL_EXIT.
 * - Two legs remain OPEN.
 * - Two legs become CLOSED.
 */
function testMultipleMissedImportsRegressionUnitTests() {
  const tradeId =
    'TRD-MULTIPLE-MISSED-IMPORTS';

  const masterTrade = {
    tradeId: tradeId,
    strategyId: 'DDC',
    workflowStatus: 'OPEN'
  };

  const legs = [
    {
      rowNumber: 301,
      tradeId: tradeId,
      brokerContractId: 'MISSED-301',
      longShort: 'SHORT',
      quantity: '-1',
      legStatus: 'OPEN'
    },
    {
      rowNumber: 302,
      tradeId: tradeId,
      brokerContractId: 'MISSED-302',
      longShort: 'LONG',
      quantity: '1',
      legStatus: 'OPEN'
    },
    {
      rowNumber: 303,
      tradeId: tradeId,
      brokerContractId: 'MISSED-303',
      longShort: 'SHORT',
      quantity: '-1',
      legStatus: 'OPEN'
    },
    {
      rowNumber: 304,
      tradeId: tradeId,
      brokerContractId: 'MISSED-304',
      longShort: 'LONG',
      quantity: '1',
      legStatus: 'OPEN'
    }
  ];

  /*
   * Day 8 snapshot:
   * Only contracts 301 and 302 remain open.
   */
  const openPositions = [
    {
      conid: 'MISSED-301'
    },
    {
      conid: 'MISSED-302'
    }
  ];

  /*
   * The 14-day Flex window still includes
   * the Day 5 closing executions.
   */
  const executions = [
    {
      conid: 'MISSED-303',
      buySell: 'BUY',
      quantity: '1',
      openCloseIndicator: 'C',
      transactionType: 'ExchTrade',
      tradePrice: '0.35',
      netCash: '-36.50',
      ibCommission: '-1.50',
      fifoPnlRealized: '32',
      notes: '',
      dateTime: '20260720;110000'
    },
    {
      conid: 'MISSED-304',
      buySell: 'SELL',
      quantity: '1',
      openCloseIndicator: 'C',
      transactionType: 'ExchTrade',
      tradePrice: '0.08',
      netCash: '6.50',
      ibCommission: '-1.50',
      fifoPnlRealized: '-12',
      notes: '',
      dateTime: '20260720;110000'
    }
  ];

  const openConidMap =
    TOS_TRADE_LIFECYCLE_MONITOR
      .buildOpenConidMap_(
        openPositions
      );

  const lifecycle =
    TOS_TRADE_LIFECYCLE_MONITOR
      .evaluateLifecycle_(
        legs,
        openConidMap
      );

  delayedImportAssertEqual_(
    'PARTIAL_EXIT',
    lifecycle.status,
    'lifecycle status after missed imports'
  );

  delayedImportAssertEqual_(
    2,
    lifecycle.openLegs,
    'open legs after missed imports'
  );

  delayedImportAssertEqual_(
    2,
    lifecycle.closedLegs,
    'closed legs after missed imports'
  );

  masterTrade.workflowStatus =
    lifecycle.status;

  const legsByTradeId = {};

  legsByTradeId[tradeId] =
    legs;

  const exitUpdates =
    TOS_EXIT_SYNCHRONIZER
      .buildLegExitPreview_(
        [masterTrade],
        legsByTradeId,
        executions
      );

  delayedImportAssertEqual_(
    2,
    exitUpdates.length,
    'historical exit update count'
  );

  delayedImportApplyExitUpdates_(
    legs,
    exitUpdates
  );

  const openLegs =
    legs.filter(function (leg) {
      return leg.legStatus === 'OPEN';
    });

  const closedLegs =
    legs.filter(function (leg) {
      return leg.legStatus === 'CLOSED';
    });

  delayedImportAssertEqual_(
    2,
    openLegs.length,
    'final open leg count'
  );

  delayedImportAssertEqual_(
    2,
    closedLegs.length,
    'final closed leg count'
  );

  const finalization =
    TOS_TRADE_FINALIZER
      .summarizeTrade_(
        legs
      );

  delayedImportAssertEqual_(
    false,
    finalization.readyToClose,
    'readyToClose after missed imports'
  );

  delayedImportAssertEqual_(
    'PARTIAL_EXIT',
    finalization.workflowStatus,
    'final status after missed imports'
  );

  Logger.log(
    'Multiple missed imports regression completed. Passed=1'
  );

  return {
    passed: 1,
    failed: 0
  };
}
/**
 * User journey:
 *
 * Day 1:
 * - A four-leg DDC trade opens.
 *
 * Day 3:
 * - Legs 303 and 304 close.
 *
 * Day 5:
 * - Legs 301 and 302 close.
 *
 * Day 6:
 * - The first Flex import contains all four historical
 *   closing executions.
 *
 * Expected replay:
 * - First historical exit event reconstructs PARTIAL_EXIT.
 * - Second historical exit event reconstructs CLOSED.
 * - All legs are CLOSED.
 * - Final PnL, commission and exit time are correct.
 */
function testDelayedImportFullLifecycleReplayRegressionUnitTests() {
  const tradeId =
    'TRD-DELAYED-FULL-LIFECYCLE-REPLAY';

  const masterTrade = {
    tradeId: tradeId,
    strategyId: 'DDC',
    workflowStatus: 'OPEN'
  };

  const legs = [
    {
      rowNumber: 401,
      tradeId: tradeId,
      brokerContractId: 'REPLAY-401',
      longShort: 'SHORT',
      quantity: '-1',
      legStatus: 'OPEN'
    },
    {
      rowNumber: 402,
      tradeId: tradeId,
      brokerContractId: 'REPLAY-402',
      longShort: 'LONG',
      quantity: '1',
      legStatus: 'OPEN'
    },
    {
      rowNumber: 403,
      tradeId: tradeId,
      brokerContractId: 'REPLAY-403',
      longShort: 'SHORT',
      quantity: '-1',
      legStatus: 'OPEN'
    },
    {
      rowNumber: 404,
      tradeId: tradeId,
      brokerContractId: 'REPLAY-404',
      longShort: 'LONG',
      quantity: '1',
      legStatus: 'OPEN'
    }
  ];

  /*
   * One delayed Flex import contains two separate
   * historical exit events.
   */
  const executions = [
    {
      conid: 'REPLAY-403',
      buySell: 'BUY',
      quantity: '1',
      openCloseIndicator: 'C',
      transactionType: 'ExchTrade',
      tradePrice: '0.30',
      netCash: '-31.50',
      ibCommission: '-1.50',
      fifoPnlRealized: '30',
      notes: '',
      dateTime: '20260720;101500'
    },
    {
      conid: 'REPLAY-404',
      buySell: 'SELL',
      quantity: '1',
      openCloseIndicator: 'C',
      transactionType: 'ExchTrade',
      tradePrice: '0.05',
      netCash: '3.50',
      ibCommission: '-1.50',
      fifoPnlRealized: '-10',
      notes: '',
      dateTime: '20260720;101500'
    },
    {
      conid: 'REPLAY-401',
      buySell: 'BUY',
      quantity: '1',
      openCloseIndicator: 'C',
      transactionType: 'ExchTrade',
      tradePrice: '0.20',
      netCash: '-21.50',
      ibCommission: '-1.50',
      fifoPnlRealized: '45',
      notes: '',
      dateTime: '20260722;143000'
    },
    {
      conid: 'REPLAY-402',
      buySell: 'SELL',
      quantity: '1',
      openCloseIndicator: 'C',
      transactionType: 'ExchTrade',
      tradePrice: '0.08',
      netCash: '6.50',
      ibCommission: '-1.50',
      fifoPnlRealized: '-15',
      notes: '',
      dateTime: '20260722;143000'
    }
  ];

  const legsByTradeId = {};

  legsByTradeId[tradeId] =
    legs;

  /*
   * REPLAY EVENT 1:
   * The first two historical executions represent
   * the earlier partial exit.
   */
  const firstExitEvent =
    executions.slice(0, 2);

  const firstExitUpdates =
    TOS_EXIT_SYNCHRONIZER
      .buildLegExitPreview_(
        [masterTrade],
        legsByTradeId,
        firstExitEvent
      );

  delayedImportAssertEqual_(
    2,
    firstExitUpdates.length,
    'first replay exit update count'
  );

  delayedImportApplyExitUpdates_(
    legs,
    firstExitUpdates
  );

  const partialFinalization =
    TOS_TRADE_FINALIZER
      .summarizeTrade_(
        legs
      );

  delayedImportAssertEqual_(
    false,
    partialFinalization.readyToClose,
    'partial replay readyToClose'
  );

  delayedImportAssertEqual_(
    'PARTIAL_EXIT',
    partialFinalization.workflowStatus,
    'partial replay workflow status'
  );

  delayedImportAssertEqual_(
    2,
    legs.filter(function (leg) {
      return leg.legStatus === 'OPEN';
    }).length,
    'partial replay open leg count'
  );

  delayedImportAssertEqual_(
    2,
    legs.filter(function (leg) {
      return leg.legStatus === 'CLOSED';
    }).length,
    'partial replay closed leg count'
  );

  masterTrade.workflowStatus =
    partialFinalization.workflowStatus;

  /*
   * REPLAY EVENT 2:
   * The remaining historical executions complete
   * the trade lifecycle.
   */
  const secondExitEvent =
    executions.slice(2);

  const secondExitUpdates =
    TOS_EXIT_SYNCHRONIZER
      .buildLegExitPreview_(
        [masterTrade],
        legsByTradeId,
        secondExitEvent
      );

  delayedImportAssertEqual_(
    2,
    secondExitUpdates.length,
    'second replay exit update count'
  );

  delayedImportApplyExitUpdates_(
    legs,
    secondExitUpdates
  );

  const finalization =
    TOS_TRADE_FINALIZER
      .summarizeTrade_(
        legs
      );

  delayedImportAssertEqual_(
    true,
    finalization.readyToClose,
    'full replay readyToClose'
  );

  delayedImportAssertEqual_(
    'CLOSED',
    finalization.workflowStatus,
    'full replay workflow status'
  );

  delayedImportAssertEqual_(
    0,
    legs.filter(function (leg) {
      return leg.legStatus === 'OPEN';
    }).length,
    'full replay open leg count'
  );

  delayedImportAssertEqual_(
    4,
    legs.filter(function (leg) {
      return leg.legStatus === 'CLOSED';
    }).length,
    'full replay closed leg count'
  );

  /*
   * Realized PnL:
   * 30 - 10 + 45 - 15 = 50
   *
   * Commission:
   * -1.50 * 4 = -6
   *
   * Final exit time:
   * Latest historical execution.
   */
  delayedImportAssertEqual_(
    50,
    finalization.realizedPnL,
    'full replay realized PnL'
  );

  delayedImportAssertEqual_(
    -6,
    finalization.commission,
    'full replay commission'
  );

  delayedImportAssertEqual_(
    '20260722;143000',
    finalization.exitDateTime,
    'full replay exit date and time'
  );

  Logger.log(
    'Delayed full lifecycle replay regression completed. Passed=1'
  );

  return {
    passed: 1,
    failed: 0
  };
}