/**
 * Trading OS - Trade Monitor
 *
 * Updates existing TRADE_LEGS from IBKR Open Positions.
 *
 * Snapshot architecture:
 * - updateOpenLegsFromIBKR() remains backward compatible.
 * - updateOpenLegsFromSnapshot_(snapshot) contains the real logic.
 * - Snapshot-aware execution does not reload or parse IBKR XML.
 */

const TOS_TRADE_MONITOR = {
  TRADE_LEGS: 'TRADE_LEGS',

  /**
   * Backward-compatible production entry point.
   *
   * Loads the latest normalized broker snapshot and delegates
   * execution to the snapshot-aware method.
   *
   * @return {Object} Update summary.
   */
  updateOpenLegsFromIBKR() {
    const snapshot =
      TOS_BROKER_SNAPSHOT_SERVICE.load();

    return this.updateOpenLegsFromSnapshot_(
      snapshot
    );
  },

  /**
   * Updates TRADE_LEGS using supplied IBKR open positions.
   *
   * This method does not load or parse IBKR XML.
   *
   * @param {Object} snapshot Normalized broker snapshot.
   * @return {Object} Update summary.
   */
  updateOpenLegsFromSnapshot_(snapshot) {
    if (!snapshot) {
      throw new Error(
        'Broker snapshot is required.'
      );
    }

    const ss =
      SpreadsheetApp.getActiveSpreadsheet();

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

    const table =
      this.getTable_(
        sheet,
        [
          'LegID',
          'BrokerContractID'
        ]
      );

    const positions =
      snapshot.openPositions || [];

    const posByConid = {};

    positions.forEach(position => {
      if (
        position &&
        position.conid
      ) {
        posByConid[
          String(position.conid)
        ] = position;
      }
    });

    let updated = 0;
    let missing = 0;

    table.rows.forEach(item => {
      const rowNumber =
        item.rowNumber;

      const row =
        item.row;

      const conid =
        String(
          this.getCell_(
            row,
            table.headers,
            'BrokerContractID'
          ) || ''
        ).trim();

      if (!conid) {
        return;
      }

      const position =
        posByConid[conid];

      if (!position) {
        missing++;
        return;
      }

      this.setCell_(
        sheet,
        rowNumber,
        table.headers,
        'CurrentPrice',
        position.markPrice || ''
      );

      this.setCell_(
        sheet,
        rowNumber,
        table.headers,
        'MarketValue',
        position.positionValue || ''
      );

      this.setCell_(
        sheet,
        rowNumber,
        table.headers,
        'UnrealizedPnL',
        position.fifoPnlUnrealized || ''
      );

      this.setCell_(
        sheet,
        rowNumber,
        table.headers,
        'CurrentIV',
        ''
      );

      this.setCell_(
        sheet,
        rowNumber,
        table.headers,
        'Source',
        'IBKR_OPEN_POSITION'
      );

      updated++;
    });

    Logger.log(
      'Trade monitor update completed. ' +
      'Updated=' +
      updated +
      ', MissingOpenPositions=' +
      missing
    );

    return {
      updated: updated,
      missing: missing
    };
  },

  /**
   * Reads a table from a sheet.
   *
   * @param {Object} sheet Google Sheet.
   * @param {string[]} requiredHeaders Required header names.
   * @return {Object} Table information.
   */
  getTable_(
    sheet,
    requiredHeaders
  ) {
    const headerInfo =
      this.findHeaderRow_(
        sheet,
        requiredHeaders
      );

    const headers =
      headerInfo.headers;

    const headerRow =
      headerInfo.row;

    const lastRow =
      sheet.getLastRow();

    const rows = [];

    if (lastRow > headerRow) {
      const values =
        sheet
          .getRange(
            headerRow + 1,
            1,
            lastRow - headerRow,
            headers.length
          )
          .getValues();

      values.forEach(
        function (
          row,
          index
        ) {
          rows.push({
            rowNumber:
              headerRow +
              1 +
              index,

            row: row
          });
        }
      );
    }

    return {
      headerRow: headerRow,
      headers: headers,
      rows: rows
    };
  },

  /**
   * Finds the table header row.
   *
   * @param {Object} sheet Google Sheet.
   * @param {string[]} requiredHeaders Required headers.
   * @return {Object} Header information.
   */
  findHeaderRow_(
    sheet,
    requiredHeaders
  ) {
    const maxRows =
      Math.min(
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
      const headers =
        sheet
          .getRange(
            rowNumber,
            1,
            1,
            maxCols
          )
          .getValues()[0]
          .map(function (header) {
            return String(
              header
            ).trim();
          });

      const valid =
        requiredHeaders.every(
          function (header) {
            return (
              headers.indexOf(
                header
              ) !== -1
            );
          }
        );

      if (valid) {
        return {
          row: rowNumber,
          headers: headers
        };
      }
    }

    throw new Error(
      'Could not find header row in sheet: ' +
      sheet.getName()
    );
  },

  /**
   * Returns a cell value from an in-memory row.
   *
   * @param {Array} row Row values.
   * @param {string[]} headers Headers.
   * @param {string} name Header name.
   * @return {*} Cell value.
   */
  getCell_(
    row,
    headers,
    name
  ) {
    const index =
      headers.indexOf(
        name
      );

    if (index < 0) {
      return '';
    }

    return row[index];
  },

  /**
   * Writes a value to a named column.
   *
   * Missing optional columns are ignored to preserve
   * compatibility with existing sheet layouts.
   *
   * @param {Object} sheet Google Sheet.
   * @param {number} rowNumber Target row.
   * @param {string[]} headers Headers.
   * @param {string} name Header name.
   * @param {*} value Value to write.
   */
  setCell_(
    sheet,
    rowNumber,
    headers,
    name,
    value
  ) {
    const index =
      headers.indexOf(
        name
      );

    if (index < 0) {
      return;
    }

    sheet
      .getRange(
        rowNumber,
        index + 1
      )
      .setValue(
        value
      );
  }
};

/**
 * Backward-compatible manual test.
 *
 * This function performs real sheet writes.
 */
function testTradeMonitor() {
  return TOS_TRADE_MONITOR
    .updateOpenLegsFromIBKR();
}