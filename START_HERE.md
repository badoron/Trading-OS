# Start Here — Trading OS

Trading OS is Doron's personal trading operating system.

## Where to begin

If continuing this project in a new chat or with a new developer, read these files first:

1. `START_HERE.md`
2. `docs/PROJECT_BRAIN.md`
3. `docs/SESSION_STATE.md`
4. `docs/DECISIONS.md`
5. `ROADMAP.md`
6. `CHANGELOG.md`

## System architecture

- Google Sheets = data, dashboards, workflow screens
- Apps Script = automation and business logic
- GitHub = source of truth for code and documentation
- IBKR = source of truth for account, positions, executions, commissions, and final P/L

## Current project status

Trading OS has completed core infrastructure:
- GitHub repository
- VS Code
- clasp
- Apps Script
- Logger
- Sheets access layer
- Health framework
- State engine
- Playbook rules
- Import Review Inbox

## Most important principles

- IBKR is the source of truth for final P/L and commissions.
- Trade is not the same as Position.
- Every import must be reviewed before entering the system.
- Playbook rules are advisory unless marked critical.
- Manual user decision overrides automation and AI.
- Trades are never deleted; they are archived, ignored, residual, or cancelled.
- Commission is configurable, default $1.50 per leg.
- Broker net P/L is used for compounding and performance.

## Current next sprint

Smart Import Engine v1:
- Broker Adapter
- Import Detector
- Strategy Classifier
- Import Decision Engine
- Commission Estimator
- Risk Estimator
- Import Inbox Writer