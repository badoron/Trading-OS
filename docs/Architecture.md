# Trading OS Architecture

## Overview

Trading OS is a modular trading platform built on Google Sheets and Google Apps Script.

The system is designed around **strategy detection**, **trade lifecycle management**, and **live synchronization with Interactive Brokers (IBKR)**.

The architecture is strategy-agnostic, allowing new strategies to be added without modifying the existing pipeline.

---

# High Level Architecture

```
                 GitHub
      Source Code + Documentation
                  │
                  ▼
         Google Apps Script
      Business Logic & Automation
                  │
                  ▼
           Google Sheets
      Database + Workflow + UI
                  ▲
                  │
             IBKR Flex API
```

---

# Trading Pipeline

```
IBKR Flex Query
        │
        ▼
IBKR XML Cache
        │
        ▼
IBKR Flex Parser
        │
        ├──────── Executions
        │
        └──────── Open Positions
                     │
                     ▼
              Strategy Engine
                     │
     ┌───────────────┼────────────────────┐
     │               │                    │
     ▼               ▼                    ▼
 DDC Detector   OTV Detector      PMCC Detector
     │               │                    │
     └───────────────┴────────────────────┘
                     │
                     ▼
             IMPORT_REVIEW
                     │
              Manual Approval
                     │
                     ▼
             MASTER_TRADES
                     │
                     ▼
              TRADE_LEGS
                     │
                     ▼
             Trade Monitor
```

---

# Current Components

## Google Sheets

- Dashboard
- IMPORT_REVIEW
- MASTER_TRADES
- TRADE_LEGS
- Analytics
- Scanner
- Configuration

---

## Google Apps Script

### Data Layer

- IBKR Flex Client
- IBKR XML Cache
- IBKR Flex Parser

### Detection Layer

- Strategy Engine
- DDC Detector

### Workflow Layer

- Import Review Writer
- Import Approver

### Monitoring Layer

- Trade Monitor

### Infrastructure

- Logger
- Health Check

---

## GitHub

- Source Code
- Documentation
- Backlog
- QA
- Releases

---

## IBKR

Current integration uses:

- Flex Query
- Open Positions
- Executions

---

# Core Design Principles

## 1. Open Positions are the Source of Truth

Trading OS determines active strategies exclusively from IBKR Open Positions.

Historical executions are **not** used to reconstruct active positions.

Historical executions will later be used only for:

- Entry timestamps
- Exit timestamps
- Realized PnL
- Historical analytics
- Performance reporting

### Delayed Import Recovery

Trading OS is resilient to missed broker imports.

Open Positions remain the source of truth for determining which contracts are currently active.

Historical executions are used to reconstruct completed lifecycle events that were not synchronized earlier, including:

- Partial exits
- Full trade exits
- Realized P/L
- Commissions
- Final exit timestamps

As long as the required executions remain available within the configured IBKR Flex Query lookback window, Trading OS reconstructs the correct trade state from a later import.

This behavior is fully protected by automated regression tests covering delayed imports, missed imports and full lifecycle replay.
---

## 2. Strategy-first Architecture

Every strategy owns its own detector.

Examples:

- DDC
- OTV
- PMCC
- Butterfly
- TimeEdge
- Calendar Spread
- Sherman Tank

Adding a strategy should require only a new detector.

Existing detectors should never require modification.

---

## 3. Strategy Engine

The Strategy Engine is responsible for executing every detector.

```
Open Positions
      │
      ▼
Strategy Engine
      │
      ├── DDC Detector
      ├── OTV Detector
      ├── PMCC Detector
      ├── Butterfly Detector
      ├── TimeEdge Detector
      └── ...
```

Each detector returns a standardized Strategy Candidate object.

This allows every strategy to flow through the exact same workflow.

---

## 4. Manual Approval Workflow

Every detected strategy enters:

```
IMPORT_REVIEW
```

Nothing is written directly into production tables.

The trader always has the final approval before import.

---

## 5. Production Database

### MASTER_TRADES

One row per strategy.

Contains:

- Strategy metadata
- Workflow status
- Entry information
- Exit information
- Performance summary

### TRADE_LEGS

One row per option leg.

Contains:

- Contract information
- Prices
- Greeks (future)
- Live values
- PnL

Future tables:

- TRADE_EVENTS
- ROLLS
- ADJUSTMENTS
- NOTES
- AI_REVIEWS

---

## 6. Live Synchronization

Trade Monitor periodically updates:

- Current Price
- Market Value
- Unrealized PnL
- Greeks (future)
- IV (future)

Only active trades are synchronized.

Closed trades are ignored.

---

## 7. Stable Identifiers

Every strategy receives a deterministic StrategyID.

Every option leg receives a deterministic LegID.

Identifiers never change throughout the strategy lifecycle.

This guarantees:

- Safe synchronization
- Duplicate prevention
- Deterministic updates
- Reliable joins between tables

---

## 8. Separation of Responsibilities

Detection never modifies production tables.

Approval never performs detection.

Monitoring never creates trades.

Each module has a single responsibility.

---

## 9. Extensibility

Every strategy follows the same lifecycle:

```
IBKR
   │
   ▼
Detector
   │
   ▼
IMPORT_REVIEW
   │
Approve
   │
   ▼
MASTER_TRADES
   │
   ▼
TRADE_LEGS
   │
   ▼
Trade Monitor
```

This architecture allows Trading OS to support unlimited strategies while keeping the codebase modular and maintainable.

---

# Current MVP Status

## Completed

- ✅ IBKR Flex Client
- ✅ XML Cache
- ✅ XML Parser
- ✅ Open Position Parser
- ✅ DDC Detector
- ✅ Stable StrategyID generation
- ✅ IMPORT_REVIEW writer
- ✅ Upsert logic
- ✅ Manual approval workflow
- ✅ MASTER_TRADES creation
- ✅ TRADE_LEGS creation
- ✅ Trade Monitor
- ✅ Live synchronization
- ✅ Duplicate protection

---

# Planned Roadmap

## Sprint 2

- Closed trade detection
- Exit synchronization
- Realized PnL
- Workflow state transitions
- Trade status automation

---

## Sprint 3

- Full Strategy Engine
- OTV Detector
- PMCC Detector
- Butterfly Detector
- TimeEdge Detector
- Plugin architecture

---

## Sprint 4

- Dashboard
- Risk Engine
- Position sizing
- Compounding Engine
- AI Reviews
- Analytics
- Performance reports

---

## Long-Term Vision

Trading OS will become a complete trading operating system capable of:

- Detecting strategies automatically
- Managing the full trade lifecycle
- Monitoring live positions
- Calculating performance
- Running analytics
- Performing AI-powered trade reviews
- Supporting any options strategy through a modular plugin architecture