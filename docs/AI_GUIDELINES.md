# AI_GUIDELINES.md
If there is any conflict between this document and PROJECT_BRAIN.md, PROJECT_BRAIN.md takes precedence.
This document defines the development rules for every future AI session working on Trading OS.

The goal is to preserve architectural consistency across all future development.

---

# General Rules

The AI should improve the existing architecture.

The AI should NOT redesign the project unless explicitly requested.

Whenever possible:

- Extend existing code.
- Reuse existing modules.
- Keep the architecture modular.
- Avoid unnecessary complexity.

---

# Project Philosophy

Trading OS is a professional Trading Operating System.

It is NOT a trading journal.

The system manages the complete lifecycle of options strategies.

---

# Source of Truth

IBKR is always the broker source of truth.

For active trades:

Open Positions are the Source of Truth.

Historical Executions are NOT used to reconstruct active positions.

Executions are used only for:

- Entry history
- Exit history
- Realized PnL
- Analytics

---

# Strategy Architecture

Every strategy owns its own detector.

Current

- DDC

Future

- OTV
- PMCC
- Butterfly
- TimeEdge
- Calendar
- Sherman Tank

New strategies should be added without modifying existing detectors.

---

# Standard Workflow

Every strategy follows the same workflow.

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

No strategy may bypass IMPORT_REVIEW.

---

# Single Responsibility

Each module should perform one responsibility only.

Examples

DDC Detector

Only detects DDC.

Import Approver

Only imports approved strategies.

Trade Monitor

Only updates active trades.

Closed Trade Detector

Only detects closed trades.

---

# Code Guidelines

Avoid:

- Hardcoded sheet names
- Hardcoded column numbers
- Duplicate logic
- Strategy-specific logic inside generic modules

Prefer:

- Constants
- Repositories
- Configuration
- Objects instead of arrays
- Reusable utility methods

---

# Documentation Rules

Whenever architecture changes:

Update:

- README.md
- Architecture.md
- PROJECT_BRAIN.md
- SESSION_STATE.md
- PROJECT_HANDOVER.md
- CHANGELOG.md

Do not leave documentation behind the implementation.

---

# MVP Rules

Current MVP assumptions

DDC always opens as:

- Four legs
- Two expirations
- One underlying
- Same opening time (within a few seconds)

After the short legs are closed,

the strategy is considered finished,

even if the remaining long legs expire naturally.

---

# Development Priorities

Priority order

1. Stability
2. Correctness
3. Maintainability
4. Performance

Never sacrifice correctness for speed.

---

# Before Writing Code

Always ask:

Can the existing architecture already support this?

If yes,

extend it.

Do not redesign it.

---

# Before Creating New Modules

Ask:

Can this responsibility belong to an existing module?

If yes,

extend the existing module.

If not,

create a new module.

---

# Future Strategy Support

The architecture must support unlimited future strategies.

Adding a strategy should require:

- New detector
- Strategy configuration
- Playbook rules

Nothing else.

---

# Trade Lifecycle

Every strategy should eventually support:

Detected

↓

Approved

↓

Imported

↓

Open

↓

Partial Exit

↓

Closed

↓

Archived

The workflow should be identical for every strategy.

---

# Long-Term Goal

Trading OS should eventually become a complete Trading Operating System capable of:

- Detecting strategies automatically
- Synchronizing with IBKR
- Managing trade lifecycle
- Portfolio analytics
- Risk management
- Performance tracking
- AI-powered trade reviews
- Supporting any options strategy through the Strategy Engine