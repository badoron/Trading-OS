Version: 3.0.0
Status: End of Sprint 1
Owner: Doron Ben Ari

1. Project Vision

Trading OS is a professional personal trading operating system built specifically for options trading.

The goal is not to create another trading journal.

The system manages the entire trading lifecycle:

Idea
→ Scanner
→ Playbook Validation
→ Import from IBKR
→ Import Review
→ Trade Lifecycle
→ Risk Management
→ Analytics
→ AI Coach

Platform:

Google Sheets (UI + Data)
Google Apps Script (Business Logic)
GitHub (Source Code)
VS Code + clasp (Development)
Interactive Brokers (Source of Truth)
2. Current Architecture
IBKR
    │
    ▼
Broker Adapter      (Planned)
    │
    ▼
Import Detector     (Planned)
    │
    ▼
Strategy Classifier (Planned)
    │
    ▼
Playbook Evaluator  (Planned)
    │
    ▼
Recommendation Engine (Planned)
    │
    ▼
IMPORT_REVIEW Sheet
    │
User Decision
    │
    ▼
MASTER_TRADES
    │
    ▼
Dashboard / Analytics / AI
3. Completed (Sprint 1)

Infrastructure

GitHub repository
VS Code
Git configured
clasp configured
Apps Script linked
Push/Pull working

Apps Script

Logger
Health Framework
Constants
Sheets Layer
State Engine
Playbook
Import Review Inbox

UI

Trading OS menu
Health Check
Import Review sheet

Quality

Health Check passes successfully.
No Apps Script errors.
Git workflow established.

Documentation

START_HERE.md
PROJECT_BRAIN.md
SESSION_STATE.md
DECISIONS.md
BACKLOG.md
4. Core Design Decisions
IBKR is the Source of Truth

Broker data is authoritative for:

Executions
Positions
Commissions
Net P/L
Cash
Margin

Internal calculations are estimates only.

Trade != Position

One Trade may contain many broker positions.

A broker position belongs to only one Trade.

Import Review

Nothing enters MASTER_TRADES automatically.

Every detected trade must first appear in IMPORT_REVIEW.

The user chooses:

Import
Ignore
Residual
Ask Later
Playbook

Playbook never blocks trades.

It only provides recommendations.

User always has final authority.

Overrides

Manual override is fully supported.

Playbook recommendations are advisory.

Never Delete Trades

Trades become:

Archived
Residual
Ignored
Closed
Expired

Nothing is physically deleted.

Commissions

Default:

$1.50 per leg

Configurable.

Analytics should always prefer broker-reported commissions and net P/L.

Wing Width

Default Playbook recommendation:

4

However:

The user requested this must remain configurable per trade.

Playbook may warn but must never block import.

5. Trading Philosophy

Primary strategies:

DDC
Butterfly
OTV
TimeEdge

Future:

Calendar
Diagonal
Covered Call

Risk is configurable.

Current default risk unit:

$400

6. Import Workflow

Future workflow:

IBKR

↓

Broker Adapter

↓

Normalize Objects

↓

Position Grouper

↓

Strategy Classifier

↓

Playbook Evaluation

↓

Commission Estimate

↓

Recommendation

↓

IMPORT_REVIEW

↓

User Decision

↓

MASTER_TRADES
7. Important Functional Requirements
Partial Close

Must be fully supported.

Trade remains open.

Remaining legs continue.

Residual Legs

Residual positions should not distort strategy analytics.

User decides whether to import.

Full Close

The system should update:

Status
Final Net P/L
Broker commissions
Close date

Automatically.

Future Sync

Goal:

User presses one button:

Sync IBKR

The system should:

Read IBKR
Detect changes
Detect partial closes
Detect new trades
Detect expired trades
Update dashboard automatically
8. Folder Structure

Current:

src/

Logger

Health

State

Playbook

Sheets

Constants

Import

ImportDecision

Code

Future:

src/

core/

engine/

repositories/

ui/

analytics/

Refactoring planned later.

9. Sprint History

Sprint 1

Completed.

Included:

Infrastructure
GitHub
VS Code
Apps Script
Health
Logger
Playbook
Import Review
Documentation
10. Current Sprint

Sprint 2

Status:

READY TO START

11. Sprint 2 Backlog

Priority order:

Broker Adapter
Position Grouper
Strategy Classifier
Playbook Evaluator
Commission Engine
Recommendation Engine
Import Inbox Writer
Decision Engine
Trade Repository
12. Known Technical Debt
Source folder should be split into modules.
Replace hardcoded column indexes with mapping.
Introduce Repository pattern.
Business logic should not access sheets directly.
Prefer objects instead of row arrays.
13. Development Workflow

Standard workflow:

Edit

↓

clasp push

↓

Test

↓

Health Check

↓

git status

↓

git add

↓

git commit

↓

git push
14. Release Rules

Before every release:

Health Check passes.
No Apps Script errors.
Git status clean.
Commit performed.
Push completed.
SESSION_STATE updated if needed.
BACKLOG updated if needed.
DECISIONS updated if architecture changed.
15. How to Resume This Project

Any future ChatGPT session should:

Read:
START_HERE.md
PROJECT_BRAIN.md
SESSION_STATE.md
DECISIONS.md
BACKLOG.md
PROJECT_HANDOVER.md
Verify current sprint.
Continue from the first unfinished backlog item.

Current first unfinished item:

TOS-001 – Broker Adapter

Do not redesign the architecture unless explicitly requested.
