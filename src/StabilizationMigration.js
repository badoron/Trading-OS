/**
 * Trading OS v3.0 stabilization migration.
 *
 * Run once after deploying the stabilization release and before the
 * first runTradingOSApplication() execution.
 *
 * The migration is intentionally idempotent:
 * - ACCOUNT_HISTORY is changed only when the legacy schema is detected.
 * - duplicate TRADE_LEGS RealizedPnL columns are consolidated once.
 * - a backup copy is created before each destructive schema change.
 */
const TOS_STABILIZATION_MIGRATION = {
  ACCOUNT_HISTORY: 'ACCOUNT_HISTORY',
  TRADE_LEGS: 'TRADE_LEGS',

  LEGACY_ACCOUNT_HEADERS: [
    'SnapshotID',
    'Timestamp',
    'AccountID',
    'NetLiquidation',
    'Cash',
    'BuyingPower',
    'AvailableFunds',
    'InitialMargin',
    'MaintenanceMargin',
    'ExcessLiquidity',
    'GrossPositionValue',
    'Leverage',
    'OpenTrades',
    'Source',
    'Notes'
  ],

  run() {
    const ss =
      SpreadsheetApp.getActiveSpreadsheet();

    const accountHistory =
      this.migrateAccountHistory_(ss);

    const tradeLegs =
      this.migrateTradeLegsRealizedPnL_(ss);

    const result = {
      success: true,
      accountHistory: accountHistory,
      tradeLegs: tradeLegs
    };

    Logger.log(
      'Stabilization migration completed. ' +
      JSON.stringify(result)
    );

    return result;
  },

  migrateAccountHistory_(ss) {
    const sheet =
      ss.getSheetByName(
        this.ACCOUNT_HISTORY
      );

    if (!sheet) {
      throw new Error(
        'Missing sheet: ' +
        this.ACCOUNT_HISTORY
      );
    }

    const expected =
      TOS_ACCOUNT_HISTORY_WRITER
        .getHeaders_();

    const expectedInfo =
      this.findHeaderRow_(
        sheet,
        expected
      );

    if (expectedInfo) {
      return {
        migrated: false,
        reason: 'Already current.',
        headerRow: expectedInfo.row
      };
    }

    const legacyInfo =
      this.findHeaderRow_(
        sheet,
        this.LEGACY_ACCOUNT_HEADERS
      );

    if (!legacyInfo) {
      throw new Error(
        'ACCOUNT_HISTORY schema is neither the supported legacy ' +
        'schema nor the current schema. Migration stopped.'
      );
    }

    const backupName =
      this.createBackup_(
        ss,
        sheet,
        'ACCOUNT_HISTORY_LEGACY_BACKUP'
      );

    const lastRow =
      sheet.getLastRow();

    const legacyRows =
      lastRow > legacyInfo.row
        ? sheet
            .getRange(
              legacyInfo.row + 1,
              1,
              lastRow - legacyInfo.row,
              legacyInfo.headers.length
            )
            .getValues()
        : [];

    const mappedRows = legacyRows
      .filter(row => {
        return row.some(value => {
          return this.text_(value) !== '';
        });
      })
      .map(row => {
        return this.buildLegacyAccountRow_(
          row,
          legacyInfo.headers
        );
      });

    const clearRows = Math.max(
      1,
      lastRow - legacyInfo.row + 1
    );

    const clearCols = Math.max(
      sheet.getLastColumn(),
      expected.length
    );

    sheet
      .getRange(
        legacyInfo.row,
        1,
        clearRows,
        clearCols
      )
      .clearContent();

    sheet
      .getRange(
        legacyInfo.row,
        1,
        1,
        expected.length
      )
      .setValues([expected]);

    if (mappedRows.length > 0) {
      sheet
        .getRange(
          legacyInfo.row + 1,
          1,
          mappedRows.length,
          expected.length
        )
        .setValues(mappedRows);
    }

    return {
      migrated: true,
      backupSheet: backupName,
      headerRow: legacyInfo.row,
      migratedRows: mappedRows.length
    };
  },

  migrateTradeLegsRealizedPnL_(ss) {
    const sheet =
      ss.getSheetByName(
        this.TRADE_LEGS
      );

    if (!sheet) {
      throw new Error(
        'Missing sheet: ' +
        this.TRADE_LEGS
      );
    }

    const headerInfo =
      this.findHeaderRowContaining_(
        sheet,
        ['LegID', 'TradeID']
      );

    if (!headerInfo) {
      throw new Error(
        'Could not find TRADE_LEGS header row.'
      );
    }

    const indices = [];

    headerInfo.headers.forEach(
      function (header, index) {
        if (header === 'RealizedPnL') {
          indices.push(index);
        }
      }
    );

    if (indices.length <= 1) {
      return {
        migrated: false,
        reason: 'No duplicate RealizedPnL column.',
        headerRow: headerInfo.row
      };
    }

    const backupName =
      this.createBackup_(
        ss,
        sheet,
        'TRADE_LEGS_SCHEMA_BACKUP'
      );

    const lastRow =
      sheet.getLastRow();

    if (lastRow > headerInfo.row) {
      const values = sheet
        .getRange(
          headerInfo.row + 1,
          1,
          lastRow - headerInfo.row,
          headerInfo.headers.length
        )
        .getValues();

      values.forEach(row => {
        this.consolidateRealizedPnLRow_(
          row,
          indices
        );
      });

      sheet
        .getRange(
          headerInfo.row + 1,
          1,
          values.length,
          headerInfo.headers.length
        )
        .setValues(values);
    }

    indices
      .slice(1)
      .sort(function (left, right) {
        return right - left;
      })
      .forEach(function (index) {
        sheet.deleteColumn(index + 1);
      });

    return {
      migrated: true,
      backupSheet: backupName,
      headerRow: headerInfo.row,
      removedColumns: indices.length - 1
    };
  },

  /**
   * Maps one legacy ACCOUNT_HISTORY row to the current v3 schema.
   * Unknown historical values are intentionally left blank rather than
   * guessed. The legacy OpenTrades value is also used as TotalTrades
   * because the legacy schema did not store other workflow counts.
   */
  buildLegacyAccountRow_(
    row,
    headers
  ) {
    const timestamp =
      this.valueByHeader_(
        row,
        headers,
        'Timestamp'
      );

    const openTrades =
      this.valueByHeader_(
        row,
        headers,
        'OpenTrades'
      );

    return [
      timestamp,
      timestamp,
      '',
      this.valueByHeader_(
        row,
        headers,
        'AccountID'
      ),
      '',
      this.valueByHeader_(
        row,
        headers,
        'NetLiquidation'
      ),
      this.valueByHeader_(
        row,
        headers,
        'Cash'
      ),
      '',
      '',
      openTrades,
      '',
      '',
      openTrades
    ];
  },

  /**
   * Consolidates duplicate RealizedPnL values into the first column.
   * The first non-blank value wins, preserving the current production
   * column and recovering data from the duplicate when needed.
   */
  consolidateRealizedPnLRow_(
    row,
    indices
  ) {
    let consolidated = '';

    (indices || []).some(index => {
      if (this.text_(row[index]) !== '') {
        consolidated = row[index];
        return true;
      }

      return false;
    });

    if (indices && indices.length > 0) {
      row[indices[0]] = consolidated;
    }

    return row;
  },

  createBackup_(
    ss,
    sheet,
    baseName
  ) {
    let name = baseName;
    let suffix = 2;

    while (ss.getSheetByName(name)) {
      name = baseName + '_' + suffix;
      suffix++;
    }

    const copy =
      sheet.copyTo(ss);

    copy.setName(name);

    return name;
  },

  findHeaderRow_(
    sheet,
    expectedHeaders
  ) {
    const maxRows = Math.min(
      sheet.getLastRow(),
      20
    );

    const maxCols =
      sheet.getLastColumn();

    for (
      let rowNumber = 1;
      rowNumber <= maxRows;
      rowNumber++
    ) {
      const headers = sheet
        .getRange(
          rowNumber,
          1,
          1,
          maxCols
        )
        .getValues()[0]
        .map(this.text_);

      const candidate = headers.slice(
        0,
        expectedHeaders.length
      );

      const matches = expectedHeaders.every(
        function (header, index) {
          return candidate[index] === header;
        }
      );

      if (matches) {
        return {
          row: rowNumber,
          headers: candidate
        };
      }
    }

    return null;
  },

  findHeaderRowContaining_(
    sheet,
    requiredHeaders
  ) {
    const maxRows = Math.min(
      sheet.getLastRow(),
      20
    );

    const maxCols =
      sheet.getLastColumn();

    for (
      let rowNumber = 1;
      rowNumber <= maxRows;
      rowNumber++
    ) {
      const headers = sheet
        .getRange(
          rowNumber,
          1,
          1,
          maxCols
        )
        .getValues()[0]
        .map(this.text_);

      const allFound =
        requiredHeaders.every(
          function (header) {
            return headers.indexOf(header) !== -1;
          }
        );

      if (allFound) {
        return {
          row: rowNumber,
          headers: headers
        };
      }
    }

    return null;
  },

  valueByHeader_(
    row,
    headers,
    name
  ) {
    const index =
      headers.indexOf(name);

    return index >= 0
      ? row[index]
      : '';
  },

  text_(value) {
    return String(
      value === null ||
      value === undefined
        ? ''
        : value
    ).trim();
  }
};

function runTradingOSStabilizationMigration() {
  return TOS_STABILIZATION_MIGRATION.run();
}
