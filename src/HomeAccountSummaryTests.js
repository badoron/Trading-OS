/**
 * Trading OS - HOME Account Summary Tests
 */

function testHomeAccountSummaryRows() {

  const rows =
    TOS_HOME_BUILDER.buildAccountRows_({
      netLiquidation: 2361.20,
      totalCashValue: 2449.82,
      optionsValue: -70.18,
      reportDate: '20260715'
    });

  homeAssertEqual_(
    4,
    rows.length,
    'row count'
  );

  homeAssertEqual_(
    'Net Liquidation',
    rows[0][0],
    'label'
  );

  homeAssertEqual_(
    2361.20,
    rows[0][1],
    'value'
  );

  homeAssertEqual_(
    'Cash',
    rows[1][0],
    'cash label'
  );

  homeAssertEqual_(
    2449.82,
    rows[1][1],
    'cash value'
  );

  homeAssertEqual_(
    'Options Value',
    rows[2][0],
    'options label'
  );

  homeAssertEqual_(
    -70.18,
    rows[2][1],
    'options value'
  );

  homeAssertEqual_(
    'Report Date',
    rows[3][0],
    'date label'
  );

  homeAssertEqual_(
    '2026-07-15',
    rows[3][1],
    'date value'
  );

  Logger.log('PASS');
}

function homeAssertEqual_(expected, actual, label) {
  if (expected !== actual) {
    throw new Error(
      label +
      ' expected=' + expected +
      ' actual=' + actual
    );
  }
}