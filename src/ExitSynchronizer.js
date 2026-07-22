/**
 * Trading OS - Exit Synchronizer
 *
 * Matches IBKR closing executions to imported DDC trade legs.
 *
 * DDC lifecycle rules:
 * - A DDC remains one trade until its final original leg closes.
 * - Closed legs are synchronized incrementally.
 * - The master trade remains PARTIAL_EXIT while any leg remains open.
 * - The trade can become CLOSED only after the final leg closes.
 *
 * Current stage:
 * - Exit matching logic
 * - Trade exit preview
 * - Incremental leg exit preview
 * - No Google Sheets writes yet
 */

const TOS_EXIT_SYNCHRONIZER = {
  MASTER_TRADES: 'MASTER_TRADES',
  TRADE_LEGS: 'TRADE_LEGS',

  /**
   * Creates a read-only trade exit-sync preview from real data.
   *
   * Does not modify Google Sheets.
   *
   * @return {Object} Preview summary.
   */
  previewFromSheets() {
    const data = this.loadDataFromSheets_();

    const preview = this.buildPreview_(
      data.masterTrades,
      data.legsByTradeId,
      data.trades
    );

    const result = {
      pendingTrades: preview.length,
      fullyMatched: 0,
      notFullyMatched: 0,
      preview: preview,
      writesPerformed: 0
    };

    Logger.log('========================================');
    Logger.log('DDC EXIT SYNC PREVIEW');
    Logger.log('========================================');
    Logger.log('IBKR trades available: ' + data.trades.length);
    Logger.log('Trades pending exit sync: ' + preview.length);

    if (preview.length === 0) {
      Logger.log(
        'No DDC trades are currently waiting for exit synchronization.'
      );
    }

    preview.forEach(item => {
      if (item.fullyMatched) {
        result.fullyMatched++;
      } else {
        result.notFullyMatched++;
      }

      Logger.log('----------------------------------------');
      Logger.log('TradeID=' + item.tradeId);
      Logger.log('StrategyID=' + item.strategyId);

      Logger.log(
        'MatchedLegs=' +
        item.matchedLegs +
        '/' +
        item.totalLegs
      );

      Logger.log('FullyMatched=' + item.fullyMatched);
      Logger.log('RealizedPnL=' + item.realizedPnL);
      Logger.log('Commission=' + item.commission);

      Logger.log(
        'ExitDateTime=' +
        (item.exitDateTime || 'NOT_FOUND')
      );

      Logger.log('ReadyForWrite=' + item.fullyMatched);
    });

    Logger.log('========================================');

    Logger.log(
      'Exit preview completed.' +
      ' PendingTrades=' +
      result.pendingTrades +
      ', FullyMatched=' +
      result.fullyMatched +
      ', NotFullyMatched=' +
      result.notFullyMatched +
      ', WritesPerformed=' +
      result.writesPerformed
    );

    return result;
  },

  /**
   * Finds closing executions that belong to one trade leg.
   *
   * SHORT legs close with BUY.
   * LONG legs close with SELL.
   *
   * @param {Object} leg TRADE_LEGS record.
   * @param {Object[]} trades Parsed IBKR trades.
   * @return {Object[]} Matching closing executions.
   */
  findClosingTradesForLeg_(leg, trades) {
    const contractId = this.text_(
      leg && leg.brokerContractId
    );

    const longShort = this.text_(
      leg && leg.longShort
    ).toUpperCase();

    if (!contractId || !longShort) {
      return [];
    }

    const expectedClosingSide =
      longShort === 'SHORT'
        ? 'BUY'
        : longShort === 'LONG'
          ? 'SELL'
          : '';

    if (!expectedClosingSide) {
      return [];
    }

    return (trades || []).filter(trade => {
      const tradeContractId = this.text_(
        trade && trade.conid
      );

      const buySell = this.text_(
        trade && trade.buySell
      ).toUpperCase();

      const openCloseIndicator = this.text_(
        trade && trade.openCloseIndicator
      ).toUpperCase();

      return (
        tradeContractId === contractId &&
        buySell === expectedClosingSide &&
        openCloseIndicator === 'C'
      );
    });
  },

  /**
   * Creates the incremental closing update for one leg.
   *
   * Multiple partial closing executions are aggregated.
   *
   * ExitPrice is a quantity-weighted average.
   * RealizedPnL and Commission are copied from IBKR and summed.
   * Commission is not subtracted again from RealizedPnL.
   *
   * @param {Object} leg TRADE_LEGS record.
   * @param {Object[]} trades Parsed IBKR trades.
   * @return {Object} Leg update result.
   */
  buildLegExitUpdate_(leg, trades) {
    const matchingTrades =
      this.findClosingTradesForLeg_(
        leg,
        trades || []
      );

    if (matchingTrades.length === 0) {
      return {
        matched: false,
        rowNumber: leg && leg.rowNumber,
        tradeId: this.text_(leg && leg.tradeId),
        brokerContractId: this.text_(
          leg && leg.brokerContractId
        )
      };
    }

    let totalAbsoluteQuantity = 0;
    let weightedPriceTotal = 0;
    let realizedPnL = 0;
    let commission = 0;
    let exitDateTime = '';
    let isExpiration = false;

    matchingTrades.forEach(trade => {
      const quantity = Math.abs(
        this.number_(trade.quantity)
      );

      const tradePrice = this.number_(
        trade.tradePrice
      );

      const effectiveQuantity =
        quantity > 0 ? quantity : 1;

      totalAbsoluteQuantity += effectiveQuantity;

      weightedPriceTotal +=
        tradePrice * effectiveQuantity;

      realizedPnL += this.number_(
        trade.fifoPnlRealized
      );

      commission += this.number_(
        trade.ibCommission
      );

      const tradeDateTime = this.text_(
        trade.dateTime
      );

      if (
        tradeDateTime &&
        (
          !exitDateTime ||
          tradeDateTime > exitDateTime
        )
      ) {
        exitDateTime = tradeDateTime;
      }

      const notes = this.text_(
        trade.notes
      ).toUpperCase();

      if (
        notes === 'EP' ||
        notes.indexOf('EP') !== -1
      ) {
        isExpiration = true;
      }
    });

    const exitPrice =
      totalAbsoluteQuantity > 0
        ? weightedPriceTotal /
          totalAbsoluteQuantity
        : 0;

    return {
      matched: true,
      rowNumber: leg && leg.rowNumber,
      tradeId: this.text_(leg && leg.tradeId),

      brokerContractId: this.text_(
        leg && leg.brokerContractId
      ),

      legStatus: 'CLOSED',

      exitPrice:
        this.roundMoney_(exitPrice),

      exitDateTime: exitDateTime,

      realizedPnL:
        this.roundMoney_(realizedPnL),

      commission:
        this.roundMoney_(commission),

      exitType:
        isExpiration
          ? 'EXPIRATION'
          : 'TRADE',

      matchedExecutions:
        matchingTrades.length
    };
  },

  /**
   * Builds a read-only incremental exit preview for closed DDC legs.
   *
   * Includes DDC trades in:
   * - OPEN
   * - PARTIAL_EXIT
   * - CLOSED_PENDING_EXIT_SYNC
   *
   * Legs already marked CLOSED are skipped.
   * Legs without closing executions are excluded.
   *
   * @param {Object[]} masterTrades Normalized MASTER_TRADES rows.
   * @param {Object} legsByTradeId Legs grouped by TradeID.
   * @param {Object[]} trades Parsed IBKR trades.
   * @return {Object[]} Proposed leg updates.
   */
  buildLegExitPreview_(
    masterTrades,
    legsByTradeId,
    trades
  ) {
    const safeMasterTrades = masterTrades || [];
    const safeLegsByTradeId = legsByTradeId || {};
    const safeTrades = trades || [];
    const updates = [];

    safeMasterTrades.forEach(masterTrade => {
      const strategyId = this.text_(
        masterTrade &&
        masterTrade.strategyId
      ).toUpperCase();

      const workflowStatus = this.text_(
        masterTrade &&
        masterTrade.workflowStatus
      ).toUpperCase();

      const eligibleStatus =
        workflowStatus === 'OPEN' ||
        workflowStatus === 'PARTIAL_EXIT' ||
        workflowStatus ===
          'CLOSED_PENDING_EXIT_SYNC';

      if (
        strategyId !== 'DDC' ||
        !eligibleStatus
      ) {
        return;
      }

      const tradeId = this.text_(
        masterTrade && masterTrade.tradeId
      );

      const legs =
        safeLegsByTradeId[tradeId] || [];

      legs.forEach(leg => {
        const legStatus = this.text_(
          leg && leg.legStatus
        ).toUpperCase();

        if (legStatus === 'CLOSED') {
          return;
        }

        const update =
          this.buildLegExitUpdate_(
            leg,
            safeTrades
          );

        if (update.matched) {
          updates.push(update);
        }
      });
    });

    return updates;
  },

  /**
   * Builds a closing summary for an entire trade.
   *
   * A trade is fully matched only when every original leg
   * has at least one closing execution.
   *
   * @param {Object[]} legs Imported trade legs.
   * @param {Object[]} trades Parsed IBKR trades.
   * @return {Object} Closing summary.
   */
  summarizeClosedTrade_(legs, trades) {
    const safeLegs = legs || [];
    const safeTrades = trades || [];

    let matchedLegs = 0;
    let realizedPnL = 0;
    let commission = 0;
    let exitDateTime = '';

    safeLegs.forEach(leg => {
      const update =
        this.buildLegExitUpdate_(
          leg,
          safeTrades
        );

      if (!update.matched) {
        return;
      }

      matchedLegs++;

      realizedPnL += this.number_(
        update.realizedPnL
      );

      commission += this.number_(
        update.commission
      );

      if (
        update.exitDateTime &&
        (
          !exitDateTime ||
          update.exitDateTime > exitDateTime
        )
      ) {
        exitDateTime =
          update.exitDateTime;
      }
    });

    return {
      fullyMatched:
        safeLegs.length > 0 &&
        matchedLegs === safeLegs.length,

      matchedLegs: matchedLegs,
      totalLegs: safeLegs.length,

      realizedPnL:
        this.roundMoney_(realizedPnL),

      commission:
        this.roundMoney_(commission),

      exitDateTime: exitDateTime
    };
  },

  /**
   * Builds a read-only preview for trades waiting for final exit sync.
   *
   * @param {Object[]} masterTrades Normalized MASTER_TRADES rows.
   * @param {Object} legsByTradeId Legs grouped by TradeID.
   * @param {Object[]} trades Parsed IBKR trades.
   * @return {Object[]} Trade previews.
   */
  buildPreview_(
    masterTrades,
    legsByTradeId,
    trades
  ) {
    const safeMasterTrades = masterTrades || [];
    const safeLegsByTradeId = legsByTradeId || {};
    const safeTrades = trades || [];

    return safeMasterTrades
      .filter(masterTrade => {
        const workflowStatus = this.text_(
          masterTrade &&
          masterTrade.workflowStatus
        ).toUpperCase();

        const strategyId = this.text_(
          masterTrade &&
          masterTrade.strategyId
        ).toUpperCase();

        return (
          workflowStatus ===
            'CLOSED_PENDING_EXIT_SYNC' &&
          strategyId === 'DDC'
        );
      })
      .map(masterTrade => {
        const tradeId = this.text_(
          masterTrade && masterTrade.tradeId
        );

        const legs =
          safeLegsByTradeId[tradeId] || [];

        const summary =
          this.summarizeClosedTrade_(
            legs,
            safeTrades
          );

        return {
          tradeId: tradeId,

          strategyId: this.text_(
            masterTrade &&
            masterTrade.strategyId
          ),

          fullyMatched: summary.fullyMatched,
          matchedLegs: summary.matchedLegs,
          totalLegs: summary.totalLegs,
          realizedPnL: summary.realizedPnL,
          commission: summary.commission,
          exitDateTime: summary.exitDateTime
        };
      });
  },

  /**
   * Reads and normalizes MASTER_TRADES, TRADE_LEGS and cached IBKR data.
   *
   * @return {Object} Normalized integration data.
   */
  loadDataFromSheets_(snapshot) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const masterSheet = ss.getSheetByName(
      this.MASTER_TRADES
    );

    const legsSheet = ss.getSheetByName(
      this.TRADE_LEGS
    );

    if (!masterSheet) {
      throw new Error(
        'Missing sheet: ' +
        this.MASTER_TRADES
      );
    }

    if (!legsSheet) {
      throw new Error(
        'Missing sheet: ' +
        this.TRADE_LEGS
      );
    }

if (!snapshot) {
  throw new Error(
    'Broker snapshot is required.'
  );
}

const trades =
  snapshot.trades || [];

    const masterTable = this.getTable_(
      masterSheet,
      [
        'TradeID',
        'StrategyID',
        'WorkflowStatus'
      ]
    );

    const legsTable = this.getTable_(
  legsSheet,
  [
    'TradeID',
    'BrokerContractID',
    'LongShort',
    'Quantity',
    'LegStatus',
    'ExitPrice',
    'ExitDateTime',
    'RealizedPnL',
    'Commission'
  ]
);

    return {
      masterTrades:
        this.normalizeMasterTrades_(
          masterTable
        ),

      legsByTradeId:
        this.normalizeLegsByTradeId_(
          legsTable
        ),

      trades: trades
    };
  },

  normalizeMasterTrades_(table) {
    return table.rows.map(item => {
      return {
        rowNumber: item.rowNumber,

        tradeId: this.text_(
          this.getCell_(
            item.row,
            table.headers,
            'TradeID'
          )
        ),

        strategyId: this.text_(
          this.getCell_(
            item.row,
            table.headers,
            'StrategyID'
          )
        ),

        workflowStatus: this.text_(
          this.getCell_(
            item.row,
            table.headers,
            'WorkflowStatus'
          )
        )
      };
    });
  },

  normalizeLegsByTradeId_(table) {
  const map = {};

  table.rows.forEach(item => {
    const tradeId = this.text_(
      this.getCell_(
        item.row,
        table.headers,
        'TradeID'
      )
    );

    if (!tradeId) {
      return;
    }

    if (!map[tradeId]) {
      map[tradeId] = [];
    }

    map[tradeId].push({
      rowNumber: item.rowNumber,
      tradeId: tradeId,

      brokerContractId: this.getCell_(
        item.row,
        table.headers,
        'BrokerContractID'
      ),

      longShort: this.getCell_(
        item.row,
        table.headers,
        'LongShort'
      ),

      quantity: this.getCell_(
        item.row,
        table.headers,
        'Quantity'
      ),

      legStatus: this.getCell_(
        item.row,
        table.headers,
        'LegStatus'
      ),

      exitPrice: this.getCell_(
        item.row,
        table.headers,
        'ExitPrice'
      ),

      exitDateTime: this.getCell_(
        item.row,
        table.headers,
        'ExitDateTime'
      ),

      realizedPnL: this.getCell_(
        item.row,
        table.headers,
        'RealizedPnL'
      ),

      commission: this.getCell_(
        item.row,
        table.headers,
        'Commission'
      )
    });
  });

  return map;
},

  getTable_(sheet, requiredHeaders) {
    const headerInfo = this.findHeaderRow_(
      sheet,
      requiredHeaders
    );

    const headers = headerInfo.headers;
    const headerRow = headerInfo.row;
    const lastRow = sheet.getLastRow();
    const rows = [];

    if (lastRow > headerRow) {
      const values = sheet
        .getRange(
          headerRow + 1,
          1,
          lastRow - headerRow,
          headers.length
        )
        .getValues();

      values.forEach((row, index) => {
        const isEmpty = row.every(value => {
          return this.text_(value) === '';
        });

        if (!isEmpty) {
          rows.push({
            rowNumber:
              headerRow + 1 + index,
            row: row
          });
        }
      });
    }

    return {
      headerRow: headerRow,
      headers: headers,
      rows: rows
    };
  },

  findHeaderRow_(sheet, requiredHeaders) {
    const maxRows = Math.min(
      sheet.getLastRow(),
      20
    );

    const maxCols = sheet.getLastColumn();

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
        .map(value => this.text_(value));

      const allFound =
        requiredHeaders.every(header => {
          return headers.indexOf(header) !== -1;
        });

      if (allFound) {
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

  getCell_(row, headers, name) {
    const index = headers.indexOf(name);

    if (index < 0) {
      return '';
    }

    return row[index];
  },

  text_(value) {
    return String(
      value === null ||
      value === undefined
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
      (Number(value) + Number.EPSILON) *
      100
    ) / 100;
  }
};

/**
 * Read-only trade-level integration preview.
 */
function testExitSyncPreview() {
  return TOS_EXIT_SYNCHRONIZER
    .previewFromSheets();
}