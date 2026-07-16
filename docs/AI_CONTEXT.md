# Trading OS — AI CONTEXT

Version: 4.0.0

---

# Purpose

This document is the primary entry point for any AI session working on Trading OS.

Every new AI session should read this document before making any code changes.

The goal is to understand:

- Current architecture
- Business rules
- Current implementation
- Design philosophy
- Current sprint
- Next development task

without redesigning the system.

---

# Project Overview

Trading OS is a professional personal Trading Operating System.

It is NOT a trading journal.

It manages the complete lifecycle of option strategies.

Current platform:

- Google Sheets
- Google Apps Script
- VS Code
- GitHub
- Interactive Brokers Flex API

IBKR is always the Source of Truth.

---

# Development Philosophy

The project evolves incrementally.

Never redesign working modules.

Prefer extending existing code.

Prefer small commits.

Documentation must always match implementation.

GitHub is the source of truth for both code and documentation.

---

# Current Architecture

IBKR Flex API

↓

XML Cache

↓

IBKR Parser

↓

Strategy Detection

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

Lifecycle Monitor

↓

Analytics

↓

Dashboard

---

# Current Implemented Modules

Completed

✓ IBKR Flex Connection

✓ XML Cache

✓ XML Parser

✓ Strategy Detection (DDC)

✓ Import Review

✓ Approval Workflow

✓ MASTER_TRADES creation

✓ TRADE_LEGS creation

✓ Live Trade Monitor

✓ Lifecycle Monitor

✓ Duplicate Protection

✓ Deterministic Strategy IDs

✓ Deterministic Leg IDs

---

# Current Supported Strategy

DDC

Important:

DDC is NOT tied to XSP.

DDC may be opened on ANY underlying.

Examples:

XSP

SPX

DAL

AAPL

TSLA

etc.

Strategy detection is based on structure.

Never on underlying symbol.

---

# Current Trade Lifecycle

Trades move through:

OPEN

↓

PARTIAL_EXIT

↓

CLOSED_PENDING_EXIT_SYNC

↓

CLOSED

Important:

A trade is NOT closed while ANY original leg still exists.

Even if only one long option remains.

Residual long options remain attached to the original trade.

Future profits from remaining legs belong to the original trade.

---

# PnL Philosophy

Every strategy keeps accumulating PnL until the final leg disappears.

During trade:

RealizedPnL

+

UnrealizedPnL

=

Current Trade PnL

When the last leg disappears:

Trade becomes CLOSED

Final PnL

=

Total RealizedPnL

Expiration at zero simply realizes remaining value.

---

# Current Lifecycle Rules

OPEN

All original legs still exist.

PARTIAL_EXIT

One or more legs disappeared.

At least one original leg still exists.

CLOSED_PENDING_EXIT_SYNC

No original legs remain.

Need final execution synchronization.

CLOSED

Final broker reconciliation completed.

---

# Trade Detection Philosophy

Open Positions determine:

Active trades

Trade status

Remaining legs

Executions determine:

Realized PnL

Exit prices

Broker commissions

Assignments

Expiration

Never calculate realized PnL from Open Positions.

Always use Executions.

---

# Current IBKR Integration

Current data sources:

Open Positions

Trades (Executions)

Current Flex Query:

14 Calendar Days

Reason:

Exit synchronization requires historical executions after partial exits and expirations.

Large XML files are stored in multiple sheet chunks.

Never assume XML fits inside one spreadsheet cell.

---

# Current Tables

IMPORT_REVIEW

Incoming detected strategies.

MASTER_TRADES

One row per strategy.

TRADE_LEGS

One row per option leg.

---

# Design Rules

IBKR is Source of Truth.

Manual Approval required.

Never duplicate trades.

Never duplicate legs.

Never hardcode strategy logic outside strategy modules.

Every strategy owns its own detector.

Future strategies plug into the same workflow.

---

# Current Sprint

Trade Lifecycle

Current focus:

Exit Synchronization

Realized PnL

Partial Exit support

Expiration handling

Broker reconciliation

---

# Next Planned Features

Exit Sync Engine

Execution Matcher

Realized PnL Engine

Commission Sync

Assignment handling

Expiration handling

Strategy Plugin Architecture

Analytics

Dashboard

AI Review

---

# Coding Standards

Never redesign architecture unless requested.

Prefer incremental changes.

Keep documentation synchronized.

Avoid duplicated code.

Avoid hardcoded column indexes.

Use deterministic IDs.

Use repositories where appropriate.

Use Logger extensively.

Always preserve backward compatibility when possible.

---

# Development Workflow

VS Code

↓

git status

↓

Code

↓

clasp push

↓

Apps Script tests

↓

Health Check

↓

Git Commit

↓

Git Push

↓

Documentation update

---

# Current Status

Project Status:

MVP Complete

Trade lifecycle implementation in progress.

Current task:

Implement Exit Synchronization and Realized PnL using IBKR Executions.

---

# How to Resume

Every AI session should:

1. Read this document.

2. Verify SESSION_STATE.

3. Verify BACKLOG.

4. Continue from the first unfinished task.

Do not redesign completed modules.

Continue from the current implementation.