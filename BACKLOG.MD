# BACKLOG

Target Version: 4.0.0

This document contains the remaining work for Trading OS. Completed items are recorded in `CHANGELOG.md`.

---

# Stabilization Cycle 9 — Operational hardening

Status: APPROVED / NEXT

## TOS-901 — System Health Check

Status: TODO

Validate required sheets, required headers, Script Properties, runtime functions, and safe preconditions before Full Synchronization begins.

## TOS-902 — Full Synchronization Audit Log

Status: TODO

Persist one summary row per synchronization including Run ID, start/end time, duration, stage results, counts, and final status.

## TOS-903 — End-to-End Regression Coverage

Status: TODO

Add deterministic regression coverage for orchestration success, controlled download failure, pending-review pause, residual refresh, and residual closure.

---

# Sprint 3 — Strategy Expansion

Status: PLANNED AFTER HARDENING

- TOS-301 — OTV Detector
- TOS-302 — PMCC Detector
- TOS-303 — Butterfly Detector
- TOS-304 — TimeEdge Detector
- TOS-305 — Strategy Plugin Registration
- TOS-306 — Generic Strategy Engine

---

# Sprint 4 — Analytics

Status: PLANNED

- TOS-401 — Dashboard expansion
- TOS-402 — Portfolio Analytics
- TOS-403 — Risk Engine
- TOS-404 — Compounding Engine
- TOS-405 — Performance Analytics
- TOS-406 — AI Trade Reviews

---

# Technical Debt

- TD-001 — Repository abstraction for direct sheet access
- TD-002 — Centralized configuration repository
- TD-003 — Continue automated unit-test expansion
- TD-004 — Integration and end-to-end synchronization tests
- TD-005 — Automatic detector/plugin registration

---

# Completed

## Sprint 1 MVP

- IBKR Flex Client and XML cache
- XML and Open Position parsers
- Strategy Engine foundation and DDC Detector
- Stable Strategy IDs and Leg IDs
- IMPORT_REVIEW and manual approval
- MASTER_TRADES and TRADE_LEGS
- Trade Monitor and live synchronization
- Duplicate protection

## Sprint 2 — Trade Lifecycle

- Closed trade detection
- Exit synchronization
- Workflow state engine
- Partial exit detection
- Trade Lifecycle Monitor
- Trade Finalizer
- Delayed Import Recovery and regression coverage
- Residual classification and `COMPLETED_WITH_RESIDUAL`
- Residual persistence to `RESIDUAL_POSITIONS`
- Residual refresh and automatic closure against IBKR Open Positions

## Full Synchronization milestone

- One-click end-to-end workflow
- Five-attempt bounded IBKR retry handling
- Safe cached-XML preservation on error `1001`
- Dashboard and HOME refresh in the same run
- Live production validation completed
