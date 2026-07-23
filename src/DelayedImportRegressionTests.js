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