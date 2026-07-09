# BACKLOG

Version: 4.0.0

This document contains all remaining work for Trading OS.

Completed items are removed from the active backlog and documented in CHANGELOG.md.

---

# Sprint 2 — Trade Lifecycle

Status: NEXT

## High Priority

### TOS-201

Closed Trade Detection

Status

TODO

Description

Detect when an imported strategy no longer exists in IBKR Open Positions.

Expected Result

- WorkflowStatus = CLOSED
- ExitDate populated
- Monitoring stops
- Trade remains in history

---

### TOS-202

Exit Synchronization

Status

TODO

Description

Synchronize closed trades using IBKR executions.

Expected Result

- Exit Price
- Exit Date
- Broker Commission
- Realized PnL

---

### TOS-203

Workflow State Engine

Status

TODO

Description

Automatic transitions between

DETECTED

↓

APPROVED

↓

IMPORTED

↓

OPEN

↓

PARTIAL_EXIT

↓

CLOSED

↓

ARCHIVED

---

### TOS-204

Partial Exit Detection

Status

TODO

Description

Support DDC partial exits.

Business Rule

Closing the short legs marks the strategy as completed.

Remaining long legs are ignored after completion.

---

### TOS-205

Residual Position Handling

Status

TODO

Description

Detect remaining contracts after strategy completion.

Allow:

- Ignore
- Archive
- Convert to Residual

---

# Sprint 3 — Strategy Expansion

Status: PLANNED

### TOS-301

OTV Detector

---

### TOS-302

PMCC Detector

---

### TOS-303

Butterfly Detector

---

### TOS-304

TimeEdge Detector

---

### TOS-305

Strategy Plugin Registration

---

### TOS-306

Generic Strategy Engine

---

# Sprint 4 — Analytics

Status: PLANNED

### TOS-401

Dashboard

---

### TOS-402

Portfolio Analytics

---

### TOS-403

Risk Engine

---

### TOS-404

Compounding Engine

---

### TOS-405

Performance Analytics

---

### TOS-406

AI Trade Reviews

---

# Technical Debt

## TD-001

Repository Layer

Replace direct sheet access with repositories.

---

## TD-002

Configuration Repository

Move all configurable values into configuration services.

---

## TD-003

Unit Tests

Create automated unit tests.

---

## TD-004

Integration Tests

End-to-end synchronization tests.

---

## TD-005

Plugin Registration

Automatic detector registration.

---

# Completed (Moved to CHANGELOG)

Sprint 1 MVP

- IBKR Flex Client
- XML Cache
- XML Parser
- Open Position Parser
- Strategy Engine Foundation
- DDC Detector
- Stable Strategy IDs
- Stable Leg IDs
- IMPORT_REVIEW
- Manual Approval
- MASTER_TRADES
- TRADE_LEGS
- Trade Monitor
- Live Synchronization
- Duplicate Protection