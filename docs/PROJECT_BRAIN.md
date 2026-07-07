# Trading OS — PROJECT BRAIN

Version: 3.0.0

---

# Vision

Trading OS is a personal professional Trading Operating System designed to manage the complete lifecycle of options trading.

The goal is not to be another trading journal.

The goal is to become the operating system that manages every stage of trading:

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

IBKR is the Source of Truth.

Manual decisions always override automation.

Playbook is advisory.

Nothing is deleted.

Everything is traceable.

---

# Core Principles

1. Trade != Position

A Trade may consist of multiple broker positions.

A broker position may belong to only one Trade.

---

2. IBKR is the Source of Truth

Final P/L

Executions

Commissions

Assignments

Expiration

Cash

Everything comes from IBKR.

---

3. Manual Review Required

Every detected strategy enters Import Review.

Nothing enters MASTER_TRADES automatically.

---

4. Playbook

Playbook never blocks trading.

It gives recommendations.

The trader always decides.

---

5. Override

Any recommendation can be overridden.

Overrides are intentional and supported.

---

6. Never Delete Trades

Trades become:

Archived

Ignored

Residual

Expired

Cancelled

Nothing disappears.

---

7. Configurable System

Risk

Commission

Playbook thresholds

Strategy limits

Everything should be configurable.

---

# Architecture

Google Sheets

↓

Apps Script

↓

Business Logic

↓

Import Engine

↓

Trade Repository

↓

Dashboard

↓

Analytics

↓

AI Coach

---

# Main Modules

Health

Logger

State Engine

Playbook

Import Review

Sheets Layer

Configuration

Broker Adapter (planned)

Import Detector (planned)

Strategy Classifier (planned)

Analytics Engine (planned)

AI Coach (planned)

---

# Trade Lifecycle

IDEA

↓

DETECTED

↓

IMPORT REVIEW

↓

IMPORTED

↓

OPEN

↓

PARTIAL CLOSE

↓

CLOSED

↓

EXPIRED

↓

ARCHIVED

---

# Import Workflow

IBKR

↓

Broker Adapter

↓

Position Grouping

↓

Strategy Classification

↓

Playbook Evaluation

↓

Risk Calculation

↓

Commission Estimation

↓

Recommendation

↓

Import Review

↓

MASTER_TRADES

---

# Current Supported Strategies

DDC

Butterfly

OTV

TimeEdge

Residual

Additional strategies will be added later.

---

# Commission Model

Broker commissions are considered the final source.

Default configuration:

$1.50 per leg

Configurable.

Analytics use broker net values.

---

# Playbook Philosophy

Playbook provides guidance.

Examples:

Wing width

Expected Move

Liquidity

Credit

Risk

Probability

Nothing blocks the trade.

---

# Development Workflow

VS Code

↓

Edit

↓

clasp push

↓

Google Sheets

↓

Health Check

↓

Git Commit

↓

Git Push

---

# Quality Rules

Health Check must pass before release.

No breaking changes.

Never hardcode sheet names repeatedly.

Avoid hardcoded column indexes.

Prefer repositories over direct sheet access.

Prefer objects over row arrays.

---

# Long-Term Vision

Trading OS should eventually support:

IBKR Synchronization

Scanner

Trade Management

Performance Analytics

Risk Analytics

Portfolio View

AI Recommendations

AI Trade Review

Backtesting

Position Simulator

Mobile Dashboard

Multi-Broker Support

---

# Current Project Status

Infrastructure:
Completed

Import Review:
Completed (MVP)

Logger:
Completed

Health Framework:
Completed

State Engine:
Completed

GitHub Integration:
Completed

Apps Script Sync:
Completed

Current Sprint:
Smart Import Engine

Current Next Task:
Broker Adapter