# Trading OS

Personal Trading Operating System for managing options strategies, IBKR synchronization, trade lifecycle, risk management, analytics and AI-assisted trading workflows.

---

# New AI Session

If you are continuing this project in a new AI session, read the following files **in order**:

1. START_HERE.md
2. docs/PROJECT_BRAIN.md
3. docs/SESSION_STATE.md
4. docs/DECISIONS.md
5. docs/PROJECT_HANDOVER.md
6. BACKLOG.md

Then continue from the first unfinished backlog item.

---

# Current Status

## Sprint 1 (MVP) ✅ COMPLETED

Current supported strategy:

- DDC (Double Diagonal Calendar)

Current working pipeline:

```
IBKR Flex Query
        │
        ▼
IBKR XML Cache
        │
        ▼
IBKR Flex Parser
        │
        ▼
Open Positions
        │
        ▼
DDC Detector
        │
        ▼
IMPORT_REVIEW
        │
        ▼
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

# MVP Features

Implemented:

- Download IBKR Flex statements
- Parse Executions
- Parse Open Positions
- Detect active DDC strategies
- Ignore historical closed executions
- Import candidates into IMPORT_REVIEW
- Manual approval workflow
- Create MASTER_TRADES
- Create TRADE_LEGS
- Prevent duplicate imports
- Live update from IBKR Open Positions
- Stable Strategy IDs
- Stable Leg IDs

---

# Architecture

Technology stack:

- Google Sheets → Database, workflow and dashboards
- Google Apps Script → Business logic and automation
- GitHub → Source control and documentation
- IBKR Flex Query → Broker integration

---

# Current Design Principles

- Open Positions are the single source of truth for active trades.
- Historical executions are used only for trade entry/exit history.
- Every strategy is detected independently.
- Every new strategy must pass through IMPORT_REVIEW.
- MASTER_TRADES contains one row per strategy.
- TRADE_LEGS contains one row per option leg.
- Live market updates never create duplicate trades.

---

# Next Sprint

Sprint 2

- Detect closed trades
- Update trade status automatically
- Exit PnL
- Exit date
- Stop monitoring closed trades

---

# Future Roadmap

Planned strategy support:

- OTV
- PMCC
- Butterfly
- TimeEdge
- Additional strategy plugins through the Strategy Engine