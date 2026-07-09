# DDC Strategy

## Overview

DDC (Double Diagonal Calendar) is the first fully supported strategy in Trading OS.

The MVP implementation detects active DDC trades directly from IBKR Open Positions and manages their lifecycle through Trading OS.

---

# Current Status

Status: MVP Completed ✅

Supported:

- Detection of active DDC positions
- Manual approval workflow
- Import into MASTER_TRADES
- Import into TRADE_LEGS
- Live synchronization with IBKR Open Positions

---

# Detection Rules

A position is considered a valid DDC only if **all** of the following conditions are true:

- Exactly 4 option legs
- Exactly 2 Long legs
- Exactly 2 Short legs
- Exactly 2 expiration dates
- One short expiration
- One long expiration
- Long expiration is later than short expiration
- All legs belong to the same underlying
- One Call and one Put on each expiration

Example:

Short Expiration

- Short Call
- Short Put

Long Expiration

- Long Call
- Long Put

---

# Detection Source

Trading OS detects DDC strategies from:

IBKR Open Positions

Historical executions are **not** used to determine active strategies.

Open Positions are considered the single source of truth.

---

# Strategy Identification

Each detected strategy receives a deterministic Strategy ID.

Current format:

```
DDC|
Underlying|
ShortExpiration|
LongExpiration|
Long Call|
Long Put|
Short Call|
Short Put
```

Example:

```
DDC|XSP|20260717|20260720|
Long:20260720:C:766|
Long:20260720:P:720|
Short:20260717:C:763|
Short:20260717:P:724
```

This guarantees that the same strategy always receives the same identifier across refreshes.

---

# Cost Basis

Current implementation uses the IBKR Cost Basis.

Trade debit/credit is calculated from the combined Cost Basis of all four legs.

Negative value = Credit

Positive value = Debit

---

# Market Value

Current market value is taken directly from IBKR Open Positions.

It is refreshed by the Trade Monitor.

---

# Trade Lifecycle

Current workflow:

```
IBKR Open Positions
        │
        ▼
DDC Detector
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

# Current MVP Assumptions

The MVP assumes:

- A DDC always opens as a single 4-leg strategy.
- All four legs are opened within a few seconds of each other.
- Detection is based on Open Positions rather than execution history.
- After a strategy has been imported into Trading OS, historical executions are no longer used.
- If the short legs are closed while the long legs remain open until expiration, the strategy is considered finished from the Trading OS perspective.
- Long legs that remain open solely to expire are ignored after the strategy has been completed.

---

# Current Limitations

The MVP currently does not support:

- Partial imports
- Automatic trade closure
- Rolling detection
- Multiple entries into the same strategy
- Multiple DDC positions with identical contracts
- Automatic exit synchronization

---

# Planned Enhancements

Sprint 2

- Detect partial exits
- Detect full trade closure
- Update Workflow Status automatically
- Record Exit Date
- Record Realized PnL
- Stop monitoring closed trades

Sprint 3

- Rolling detection
- Multiple quantities (lots)
- Strategy versioning
- Automatic strategy lifecycle management

---

# Design Principles

The DDC detector must never:

- Write directly into MASTER_TRADES
- Write directly into TRADE_LEGS
- Modify historical trades

Every detected strategy must first pass through:

IMPORT_REVIEW

Only approved strategies may be imported into the production database.

---

# Related Components

Current implementation:

- IBKRFlexClient
- IBKRFlexParser
- OpenPositionDetector
- DDCDetector
- ImportReviewWriter
- ImportApprover
- TradeMonitor

---

# Version

Current Version

DDC Detector v1.0 (MVP)