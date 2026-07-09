# Trading OS — PROJECT BRAIN

Version: 4.0.0

---

# Vision

Trading OS is a personal professional Trading Operating System designed to manage the complete lifecycle of options trading.

The goal is not to be another trading journal.

The goal is to become the operating system that manages every stage of trading:

```
Idea
↓

Scanner

↓

Playbook Validation

↓

Import from Broker

↓

Trade Lifecycle

↓

Risk Management

↓

Performance Analytics

↓

AI Coaching
```

---

# Owner

Owner:
Doron Ben Ari

Broker:
Interactive Brokers (IBKR)

Platform:
Google Sheets + Google Apps Script

Source Code:
GitHub

Development:
VS Code + clasp

---

# Core Philosophy

Trading OS never guesses.

Whenever possible:

- IBKR is the Source of Truth.
- Open Positions are the Source of Truth for active trades.
- Manual decisions always override automation.
- Playbook is advisory.
- Nothing is deleted.
- Everything is traceable.

---

# Core Principles

## 1. Strategy != Position

A Strategy consists of one or more broker positions.

Every broker position belongs to one strategy only.

Examples:

- DDC = 4 option legs
- OTV = 2 option legs
- PMCC = 2 option legs
- Butterfly = 4 option legs

---

## 2. Open Positions are the Source of Truth

Active trades are detected from IBKR Open Positions.

Historical executions are NOT used to reconstruct active strategies.

Executions are used only for:

- Entry timestamps
- Exit timestamps
- Realized PnL
- Historical analytics
- Trade history

---

## 3. IBKR is the Source of Truth

Final P/L

Executions

Commissions

Assignments

Expiration

Cash

Open Positions

Everything ultimately comes from IBKR.

---

## 4. Manual Review Required

Every detected strategy enters IMPORT_REVIEW.

Nothing enters MASTER_TRADES automatically.

The trader always has final approval.

---

## 5. Playbook

Playbook never blocks trading.

It gives recommendations.

The trader always decides.

---

## 6. Override

Any recommendation can be overridden.

Overrides are intentional and supported.

---

## 7. Never Delete Trades

Trades become:

- Imported
- Open
- Closed
- Expired
- Archived
- Ignored

Nothing disappears.

---

## 8. Configurable System

Everything should be configurable.

Examples:

- Risk Units
- Commission
- Playbook thresholds
- Strategy parameters
- Position sizing
- Scanner thresholds

---

# Architecture

```
IBKR

↓

IBKR Flex Query

↓

XML Cache

↓

XML Parser

↓

Open Positions

↓

Strategy Engine

↓

Strategy Detector

↓

IMPORT_REVIEW

↓

Manual Approval

↓

MASTER_TRADES

↓

TRADE_LEGS

↓

Trade Monitor

↓

Dashboard

↓

Analytics

↓

AI Coach
```

---

# Main Modules

## Infrastructure

- Health
- Logger
- Configuration

---

## IBKR Integration

- IBKR Flex Client
- XML Cache
- XML Parser

---

## Strategy Detection

- Strategy Engine
- DDC Detector

Future:

- OTV Detector
- PMCC Detector
- Butterfly Detector
- TimeEdge Detector

---

## Workflow

- Import Review Writer
- Import Approver

---

## Monitoring

- Trade Monitor

---

## Future Modules

- Scanner
- Risk Engine
- Analytics Engine
- AI Coach
- Portfolio Engine

---

# Trade Lifecycle

```
DETECTED

↓

IMPORT_REVIEW

↓

APPROVED

↓

IMPORTED

↓

OPEN

↓

PARTIAL EXIT

↓

CLOSED

↓

ARCHIVED
```

---

# Import Workflow

```
IBKR

↓

Open Positions

↓

Strategy Engine

↓

Strategy Detector

↓

IMPORT_REVIEW

↓

Manual Approval

↓

MASTER_TRADES

↓

TRADE_LEGS

↓

Trade Monitor
```

---

# Strategy Architecture

Every strategy has its own detector.

Current:

- DDC

Planned:

- OTV
- PMCC
- Butterfly
- TimeEdge
- Calendar Spread
- Sherman Tank

The Strategy Engine executes every detector independently.

Adding a new strategy should require adding only a new detector.

---

# Current Supported Strategies

## Fully Implemented

- DDC

## Planned

- Butterfly
- OTV
- TimeEdge
- PMCC
- Calendar Spread
- Sherman Tank

---

# Stable IDs

Every strategy receives a deterministic StrategyID.

Every option leg receives a deterministic LegID.

These IDs never change.

They guarantee:

- Safe synchronization
- Duplicate prevention
- Reliable updates
- Deterministic imports

---

# Commission Model

Broker commissions are considered the final source.

Default:

$1.50 per leg

Fully configurable.

Analytics always use broker values.

---

# Playbook Philosophy

Playbook provides guidance.

Examples:

- Wing Width
- Expected Move
- Liquidity
- Debit/Credit
- Risk
- Probability

Nothing blocks the trade.

The trader always decides.

---

# Development Workflow

```
VS Code

↓

Edit

↓

clasp push

↓

Apps Script

↓

Health Check

↓

Git Commit

↓

Git Push
```

---

# Quality Rules

Health Check must pass before release.

No breaking changes.

Never hardcode sheet names repeatedly.

Avoid hardcoded column indexes.

Prefer repositories over direct sheet access.

Prefer objects over row arrays.

Every module should have a single responsibility.

Every strategy detector must be independent.

---

# Long-Term Vision

Trading OS should eventually support:

- IBKR Synchronization
- Strategy Detection
- Scanner
- Trade Management
- Performance Analytics
- Risk Analytics
- Portfolio View
- AI Recommendations
- AI Trade Review
- Backtesting
- Position Simulator
- Mobile Dashboard
- Multi-Broker Support

---

# Current Project Status

## Completed

- IBKR Flex Client
- XML Cache
- XML Parser
- Open Position Parser
- Strategy Engine (Foundation)
- DDC Detector
- IMPORT_REVIEW
- Manual Approval Workflow
- MASTER_TRADES
- TRADE_LEGS
- Trade Monitor
- Live Synchronization
- Duplicate Protection
- Logger
- Health Framework
- GitHub Integration
- Apps Script Sync

---

## Current Sprint

MVP Stabilization

---

## Next Tasks

1. Closed Trade Detection
2. Exit Synchronization
3. Workflow State Automation
4. Realized PnL
5. OTV Detector
6. PMCC Detector
7. Butterfly Detector