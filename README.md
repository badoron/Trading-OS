# Trading OS

Google Apps Script trading workflow for IBKR Flex imports, DDC lifecycle management, residual-position lifecycle, account history, dashboard reporting, and controlled stabilization migrations.

## Current capabilities

- One-click Full Synchronization from the Trading OS menu
- IBKR Flex download with bounded retry handling and safe XML caching
- XML parsing, DDC detection, Import Review, and approval processing
- DDC trade lifecycle and exit synchronization
- Residual LONG position detection, persistence, refresh, and automatic closure
- Account history synchronization
- Dashboard and HOME refresh
- Release preflight validation
- End-to-end regression suite

## Current release

`v3.1.0-rc.2`

This release candidate has been validated end-to-end against a live IBKR Flex Statement. The validated flow is:

```text
Download XML
→ Parse XML
→ Detect DDC groups
→ Process Import Review approvals
→ Run trade lifecycle pipeline
→ Synchronize residual positions
→ Refresh Dashboard
→ Refresh HOME
```

Start with:

1. `START_HERE.md`
2. `UPGRADE.md`
3. `RELEASE_NOTES.md`
4. `RELEASE_CHECKLIST.md`

## Full Synchronization

From the spreadsheet menu, run:

```text
Trading OS → 🔄 Full Synchronization
```

The workflow stops safely if IBKR cannot generate the statement. Error `1001` is retried five times with bounded delays, and the existing cached XML is not overwritten after a failed download.

A successful run displays a summary containing XML download, parser status, active DDC groups, pending imports, open trades, updated open legs, residuals closed, Dashboard status, HOME status, and a Run ID.

## Apps Script deployment

The clasp root is `src`.

```bash
clasp login
clasp push
```

Never commit IBKR credentials. Configure Script Properties through:

```javascript
setupIBKRFlexConfig('YOUR_REAL_TOKEN', 'YOUR_NUMERIC_QUERY_ID');
```

## Required validation

Run in Apps Script against a copied spreadsheet:

```javascript
testFullTradingOSRegression();
runTradingOSReleasePreflight();
```

Then run Full Synchronization and reconcile `MASTER_TRADES`, `TRADE_LEGS`, `RESIDUAL_POSITIONS`, `DASHBOARD`, and `HOME` before production release.
