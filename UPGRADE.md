# Upgrade to Trading OS v3.1.0-rc.2

## 1. Back up

1. Create a copy of the production Google Sheet.
2. Commit the current repository state or create a pre-upgrade Git tag.
3. Confirm that the copy contains `MASTER_TRADES`, `TRADE_LEGS`, `RESIDUAL_POSITIONS`, `IMPORT_REVIEW`, `DASHBOARD`, and `HOME`.

## 2. Update source

From the repository root:

```bash
clasp login
clasp push
```

The project uses `src` as its clasp root directory.

## 3. Configure IBKR Flex safely

```javascript
setupIBKRFlexConfig('YOUR_REAL_TOKEN', 'YOUR_NUMERIC_QUERY_ID');
```

Do not commit tokens or query credentials to Git.

## 4. Validate

Run:

```javascript
testResidualPositionManagerUnitTests();
testFullTradingOSRegression();
runTradingOSReleasePreflight();
```

All must complete without errors.

## 5. Full Synchronization smoke test

From the spreadsheet menu run:

```text
Trading OS → 🔄 Full Synchronization
```

Confirm that the summary reaches Dashboard and HOME. If IBKR returns error `1001`, retry later; the cached XML must remain unchanged.

## 6. Manual reconciliation

Review:

- `MASTER_TRADES` open and closed counts
- `TRADE_LEGS` open-leg values
- `RESIDUAL_POSITIONS` OPEN/CLOSED statuses and `ClosedAt`
- Dashboard totals
- HOME totals

## 7. Production rollout

After validation on the copied spreadsheet, repeat `clasp push`, regression, preflight, Full Synchronization, and reconciliation on production.
