# Trading OS Specification

## Purpose
Trading OS is a personal trading management system for tracking, importing, analyzing, and managing options strategies.

## Core Principles
1. Google Sheets stores data and dashboards.
2. Apps Script runs business logic and automation.
3. GitHub is the source of truth for code and documentation.
4. No calculated or synced fields are edited manually.
5. Every import must be reviewed before entering the system.
6. Every removed trade is archived, not deleted.
7. Every release must pass QA and regression checks.

## Trade Lifecycle
IDEA → APPROVED → IMPORT_REVIEW → OPEN → MONITOR → EXIT → REVIEW → ARCHIVED

## Import Workflow
1. IBKR sync detects open positions or trades.
2. System groups legs into possible strategies.
3. User reviews each detected trade.
4. User chooses:
   - Import
   - Ignore
   - Archive
   - Mark as residual leg
5. Approved trades move to MASTER_TRADES.
6. Legs move to TRADE_LEGS.
7. Ignored/residual legs move to IGNORED_POSITIONS.

## Safe Removal
Trades are never manually deleted.
A removed trade moves to TRADE_REMOVAL_QUEUE and then ARCHIVED status.
Dashboard, analytics, and compounding recalculate after removal.

## DDC Rules
- Prefer large liquid stocks above $50.
- Prefer earnings with IV expansion.
- Short strikes as far as possible from current price.
- Do not enter debit.
- Prefer 1.5–2.0 expected move distance or more.
- Wing width normally up to 4 points.
- Max risk target: $400.
- Stop: near short strike plus loss around 2× credit.
- If safe and centered, allow expiration to reduce commissions.

## QA Requirements
Before every release:
- Formula QA
- Sheet structure QA
- Regression QA
- Sync flow QA
- Dashboard QA
- Google Sheets compatibility QA
- Apps Script execution QA
- Business rules QA