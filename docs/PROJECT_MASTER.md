# Trading OS — Project Master

## Vision
Trading OS is a personal trading operating system for managing options strategies, IBKR sync, trade lifecycle, risk, compounding, analytics, scanner, and AI review.

## Core Architecture
- Google Sheets = data, dashboard, workflow screens
- Apps Script = business logic and automation
- GitHub = source of truth for code and documentation
- IBKR = source of truth for account, positions, executions, commissions, and final P/L

## Key Decisions
1. IBKR is the source of truth for final P/L and commissions.
2. Every detected trade must pass Import Review before entering MASTER_TRADES.
3. Playbook rules are advisory, not hard blocks, unless marked Critical.
4. Overrides are allowed but must be documented.
5. Trades are never deleted; they are archived, ignored, residual, or cancelled.
6. Trade is not the same as IBKR position.
7. Manual user decision always overrides automated detection.
8. Partial closes and residual legs must be supported.
9. Commission per leg is configurable, default $1.50.
10. Compounding uses broker net P/L, not estimated gross P/L.

## Trade Lifecycle
IDEA → DETECTED → NEEDS_REVIEW → IMPORTED → OPEN → PARTIAL_CLOSE → CLOSED / EXPIRED → ARCHIVED

## Import Review Actions
- IMPORT
- IGNORE
- RESIDUAL
- ASK_LATER

## DDC Playbook
- Preferred large liquid stocks above $50
- Earnings with IV expansion
- Short strikes as far as possible from current price
- Do not enter debit
- Preferred expected move distance: 1.5–2.0+
- Preferred wing width: 4
- Wing width can be overridden per trade
- Max risk target: $400
- Stop near short strike plus loss around 2× credit
- If safe and centered, allow expiration to reduce commissions

## Current Modules
- Constants
- Sheets Access Layer
- Logger
- Health Framework
- State Engine
- Playbook
- Import Review Inbox

## Development Workflow
1. Edit code in VS Code
2. clasp push
3. Test in Google Sheets
4. Run Health Check
5. git add .
6. git commit
7. git push

## Regression Coverage

Current automated regression status:

- Total regression suites: 43
- Passing: 43
- Failing: 0

### Delayed Import Coverage

Trading OS regression now validates delayed broker synchronization using realistic user journeys.

Covered scenarios:

- Delayed import with partial trade exit
- Delayed import with full trade exit
- Multiple missed imports followed by a single Flex import
- Full lifecycle replay reconstructed from delayed historical executions

These tests verify that Trading OS correctly reconstructs trade state, leg status, realized P/L, commissions and final trade lifecycle from IBKR historical execution data, provided the required executions remain available in the configured Flex Query lookback window.




## Next Sprint
Smart Import Engine v1:
- ImportDetector
- StrategyClassifier
- ImportDecision
- Playbook Scorer
- Commission Estimator
- Risk Estimator
- Import Inbox Writer