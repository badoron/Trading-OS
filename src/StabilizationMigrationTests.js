/**
 * Trading OS - stabilization migration pure tests.
 * These tests do not write to the live workbook.
 */
function testStabilizationMigrationUnitTests() {
  const legacyHeaders =
    TOS_STABILIZATION_MIGRATION.LEGACY_ACCOUNT_HEADERS;

  const legacyRow = [
    'ACC-SNP-000001',
    '2026-07-06 19:55',
    'ACC-IBKR-01',
    2270.60,
    2362.09,
    7845.15,
    1176.77,
    1093.83,
    848.48,
    1422.11,
    703.13,
    0.31,
    4,
    'IBKR_ACCOUNT_SYNC',
    'seed'
  ];

  const mapped =
    TOS_STABILIZATION_MIGRATION
      .buildLegacyAccountRow_(
        legacyRow,
        legacyHeaders
      );

  assertStabilizationMigrationEqual_(
    'mapped row width',
    13,
    mapped.length
  );

  assertStabilizationMigrationEqual_(
    'timestamp retained',
    '2026-07-06 19:55',
    mapped[0]
  );

  assertStabilizationMigrationEqual_(
    'account retained',
    'ACC-IBKR-01',
    mapped[3]
  );

  assertStabilizationMigrationEqual_(
    'net liquidation retained',
    2270.60,
    mapped[5]
  );

  assertStabilizationMigrationEqual_(
    'cash retained',
    2362.09,
    mapped[6]
  );

  assertStabilizationMigrationEqual_(
    'legacy open count retained',
    4,
    mapped[9]
  );

  assertStabilizationMigrationEqual_(
    'legacy total count retained',
    4,
    mapped[12]
  );

  const rowFirstPopulated =
    ['', '', 25, '', 99];

  TOS_STABILIZATION_MIGRATION
    .consolidateRealizedPnLRow_(
      rowFirstPopulated,
      [2, 4]
    );

  assertStabilizationMigrationEqual_(
    'first RealizedPnL wins',
    25,
    rowFirstPopulated[2]
  );

  const rowDuplicateOnly =
    ['', '', '', '', 63];

  TOS_STABILIZATION_MIGRATION
    .consolidateRealizedPnLRow_(
      rowDuplicateOnly,
      [2, 4]
    );

  assertStabilizationMigrationEqual_(
    'duplicate RealizedPnL recovered',
    63,
    rowDuplicateOnly[2]
  );

  Logger.log(
    'PASS - testStabilizationMigrationUnitTests'
  );

  return true;
}

function assertStabilizationMigrationEqual_(
  label,
  expected,
  actual
) {
  if (expected !== actual) {
    throw new Error(
      label +
      ': expected [' +
      expected +
      '] received [' +
      actual +
      ']'
    );
  }
}
