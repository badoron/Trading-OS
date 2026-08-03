/**
 * Trading OS - Dashboard Partial Exit PnL Tests
 *
 * Regression coverage added in Stabilization Cycle 3.
 */

function testDashboardPartialExitPnLUnitTests() {
  const closedLegs = [
    {
      legStatus: 'CLOSED',
      realizedPnL: 42.5
    },
    {
      legStatus: 'CLOSED',
      realizedPnL: -7.25
    },
    {
      legStatus: 'OPEN',
      realizedPnL: 100
    }
  ];

  const fallback =
    TOS_DASHBOARD_BUILDER
      .calculateTradeRealizedPnL_(
        {
          tradeId: 'TRD-PARTIAL',
          workflowStatus: 'PARTIAL_EXIT',
          realizedPnLRaw: '',
          realizedPnL: 0
        },
        closedLegs
      );

  dashboardPartialExitAssertEqual_(
    35.25,
    fallback,
    'blank master PnL falls back to closed legs'
  );

  const authoritativeMaster =
    TOS_DASHBOARD_BUILDER
      .calculateTradeRealizedPnL_(
        {
          tradeId: 'TRD-CLOSED',
          workflowStatus: 'CLOSED',
          realizedPnLRaw: 50,
          realizedPnL: 50
        },
        closedLegs
      );

  dashboardPartialExitAssertEqual_(
    50,
    authoritativeMaster,
    'populated master PnL prevents double counting'
  );

  const explicitZero =
    TOS_DASHBOARD_BUILDER
      .calculateTradeRealizedPnL_(
        {
          tradeId: 'TRD-ZERO',
          workflowStatus: 'CLOSED',
          realizedPnLRaw: 0,
          realizedPnL: 0
        },
        closedLegs
      );

  dashboardPartialExitAssertEqual_(
    0,
    explicitZero,
    'explicit master zero remains authoritative'
  );

  const trades = [
    {
      tradeId: 'TRD-PARTIAL',
      workflowStatus: 'PARTIAL_EXIT',
      realizedPnLRaw: '',
      realizedPnL: 0
    },
    {
      tradeId: 'TRD-CLOSED',
      workflowStatus: 'CLOSED',
      realizedPnLRaw: 50,
      realizedPnL: 50
    }
  ];

  const summary =
    TOS_DASHBOARD_BUILDER.summarizeTrades_(
      trades,
      {
        'TRD-PARTIAL': closedLegs,
        'TRD-CLOSED': closedLegs
      }
    );

  dashboardPartialExitAssertEqual_(
    85.25,
    summary.realizedPnL,
    'portfolio realized PnL includes partial exits once'
  );

  const strategyRows =
    TOS_DASHBOARD_BUILDER.buildStrategyRows_(
      [
        {
          tradeId: 'TRD-PARTIAL',
          strategyId: 'DDC',
          symbol: 'BAC',
          workflowStatus: 'PARTIAL_EXIT',
          realizedPnLRaw: '',
          realizedPnL: 0
        }
      ],
      {
        'TRD-PARTIAL': closedLegs
      },
      'DDC'
    );

  dashboardPartialExitAssertEqual_(
    35.25,
    strategyRows[0].realizedPnL,
    'strategy row shows partial realized PnL'
  );

  Logger.log(
    'Dashboard partial-exit PnL tests passed.'
  );

  return true;
}

function dashboardPartialExitAssertEqual_(
  expected,
  actual,
  label
) {
  if (expected !== actual) {
    throw new Error(
      label +
      ': expected ' +
      expected +
      ', got ' +
      actual
    );
  }
}
