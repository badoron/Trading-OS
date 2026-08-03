/**
 * Trading OS - Residual Position Manager Tests
 *
 * Pure tests for:
 * - Stable Residual ID generation
 * - Residual row mapping
 * - Duplicate prevention
 *
 * No Google Sheets access.
 */

function testResidualPositionManagerUnitTests() {
  testResidualPositionManagerBuildsStableId_();
  testResidualPositionManagerBuildsRow_();
  testResidualPositionManagerSkipsDuplicate_();
  testResidualPositionManagerBuildsOpenPositionMap_();
  testResidualPositionManagerSynchronizesOpenAndClosed_();

  return true;
}

function testResidualPositionManagerBuildsStableId_() {
  const residualId =
    TOS_RESIDUAL_POSITION_MANAGER
      .buildResidualId_(
        'TRD-100',
        'LEG-2',
        '123456'
      );

  residualManagerAssertEqual_(
    'RES|TRD-100|LEG-2|123456',
    residualId,
    'stable residual ID'
  );
}

function testResidualPositionManagerBuildsRow_() {
  const detectedAt =
    '2026-07-28T08:00:00Z';

  const row =
    TOS_RESIDUAL_POSITION_MANAGER
      .buildRow_(
        'TRD-100',
        {
          legId: 'LEG-2',
          brokerContractId: '123456',
          symbol: 'TSLA',
          optionType: 'CALL',
          strike: 500,
          expiration: '20260821',
          quantity: 1,
          costBasis: 2.5,
          marketValue: 310,
          unrealizedPnL: 60
        },
        detectedAt
      );

  residualManagerAssertEqual_(
    18,
    row.length,
    'row column count'
  );

  residualManagerAssertEqual_(
    'RES|TRD-100|LEG-2|123456',
    row[0],
    'ResidualID'
  );

  residualManagerAssertEqual_(
    'TRD-100',
    row[1],
    'TradeID'
  );

  residualManagerAssertEqual_(
    'LEG-2',
    row[2],
    'LegID'
  );

  residualManagerAssertEqual_(
    '123456',
    row[3],
    'BrokerContractID'
  );

  residualManagerAssertEqual_(
    'OPEN',
    row[12],
    'ResidualStatus'
  );

  residualManagerAssertEqual_(
    detectedAt,
    row[13],
    'DetectedAt'
  );

  residualManagerAssertEqual_(
    detectedAt,
    row[14],
    'LastUpdatedAt'
  );
}

function testResidualPositionManagerSkipsDuplicate_() {
  const manager =
    TOS_RESIDUAL_POSITION_MANAGER;

  const originalEnsureSheet =
    manager.ensureSheet_;

  const originalGetExistingIds =
    manager.getExistingResidualIds_;

  const writes = [];

  const fakeSheet = {
    getLastRow: function () {
      return 2;
    },

    getRange: function (
      row,
      column,
      rowCount,
      columnCount
    ) {
      return {
        setValues: function (values) {
          writes.push({
            row: row,
            column: column,
            rowCount: rowCount,
            columnCount: columnCount,
            values: values
          });
        }
      };
    }
  };

  try {
    manager.ensureSheet_ = function () {
      return fakeSheet;
    };

    manager.getExistingResidualIds_ =
      function () {
        return {
          'RES|TRD-100|LEG-2|123456': true
        };
      };

    const result =
      manager.saveResidualLegs_(
        'TRD-100',
        [
          {
            legId: 'LEG-2',
            brokerContractId: '123456',
            symbol: 'TSLA',
            optionType: 'CALL',
            strike: 500,
            expiration: '20260821',
            quantity: 1
          }
        ],
        '2026-07-28T08:00:00Z'
      );

    residualManagerAssertEqual_(
      1,
      result.received,
      'received'
    );

    residualManagerAssertEqual_(
      0,
      result.inserted,
      'inserted'
    );

    residualManagerAssertEqual_(
      1,
      result.skipped,
      'skipped'
    );

    residualManagerAssertEqual_(
      0,
      writes.length,
      'sheet writes'
    );
  } finally {
    manager.ensureSheet_ =
      originalEnsureSheet;

    manager.getExistingResidualIds_ =
      originalGetExistingIds;
  }
}

function residualManagerAssertEqual_(
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

function testResidualPositionManagerBuildsOpenPositionMap_() {
  const map = TOS_RESIDUAL_POSITION_MANAGER
    .buildOpenPositionMap_([
      { conid: '123,456', position: '1' },
      { brokerContractId: 789, position: '-1' }
    ]);

  residualManagerAssertEqual_(
    true,
    Boolean(map['123456']),
    'comma-normalized conid'
  );

  residualManagerAssertEqual_(
    true,
    Boolean(map['789']),
    'broker contract id alias'
  );
}

function testResidualPositionManagerSynchronizesOpenAndClosed_() {
  const manager = TOS_RESIDUAL_POSITION_MANAGER;
  const originalEnsureSheet = manager.ensureSheet_;
  const writes = [];
  const rows = [
    manager.buildRow_(
      'TRD-OPEN',
      {
        legId: 'LEG-OPEN',
        brokerContractId: '111',
        symbol: 'XSP',
        optionType: 'C',
        quantity: 1,
        costBasis: 10,
        marketValue: 5,
        unrealizedPnL: -5
      },
      '2026-07-28T08:00:00Z'
    ),
    manager.buildRow_(
      'TRD-CLOSED',
      {
        legId: 'LEG-CLOSED',
        brokerContractId: '222',
        symbol: 'TSLA',
        optionType: 'C',
        quantity: 1,
        costBasis: 20,
        marketValue: 1,
        unrealizedPnL: -19
      },
      '2026-07-28T08:00:00Z'
    )
  ];

  const fakeSheet = {
    getLastRow: function () {
      return 3;
    },
    getRange: function (row, column, rowCount, columnCount) {
      return {
        getValues: function () {
          return rows.map(function (item) { return item.slice(); });
        },
        setValues: function (values) {
          writes.push({ row: row, values: values });
        }
      };
    }
  };

  try {
    manager.ensureSheet_ = function () {
      return fakeSheet;
    };

    const timestamp = '2026-07-30T12:00:00Z';
    const result = manager.synchronizeWithOpenPositions_(
      [
        {
          conid: '111',
          position: '1',
          costBasisMoney: '10',
          positionValue: '12',
          fifoPnlUnrealized: '2'
        }
      ],
      timestamp
    );

    residualManagerAssertEqual_(2, result.openResiduals, 'open residual count');
    residualManagerAssertEqual_(1, result.refreshed, 'refreshed count');
    residualManagerAssertEqual_(1, result.closed, 'closed count');
    residualManagerAssertEqual_(2, result.writesPerformed, 'write count');

    residualManagerAssertEqual_('OPEN', writes[0].values[0][12], 'present residual remains open');
    residualManagerAssertEqual_('12', writes[0].values[0][10], 'market value refreshed');
    residualManagerAssertEqual_('CLOSED', writes[1].values[0][12], 'missing residual closes');
    residualManagerAssertEqual_(timestamp, writes[1].values[0][15], 'closed timestamp');
  } finally {
    manager.ensureSheet_ = originalEnsureSheet;
  }
}
