# Trading OS - Product Backlog

Last Updated: 2026-07-07

---

# Current Version

3.0.0

---

# Current Sprint

Sprint 2 – Smart Import Engine

Status:
READY TO START

---

# Sprint 2

## TOS-001 — Broker Adapter
Priority: Critical

Status: Planned

Goal:
Normalize IBKR data into Trading OS objects.

Acceptance Criteria:
- Read broker positions
- Read executions
- Parse option contracts
- Parse stock positions
- Normalize dates
- Normalize quantities
- Normalize commissions

---

## TOS-002 — Position Grouper

Priority: Critical

Status: Planned

Goal:
Group broker positions into logical trades.

Examples:

DDC

Butterfly

Iron Condor

Residual

---

## TOS-003 — Strategy Classifier

Priority: Critical

Status: Planned

Goal:
Detect trading strategy automatically.

Supported:

DDC

Butterfly

OTV

Residual

Future:

Calendar

Diagonal

Covered Call

---

## TOS-004 — Playbook Evaluator

Priority: High

Status: Planned

Goal:

Calculate Playbook Score.

Check:

Risk

Wing Width

Expected Move

Credit

Liquidity

Probability

---

## TOS-005 — Commission Engine

Priority: High

Status: Planned

Goal:

Estimate commissions.

Compare estimate vs broker.

Default:

$1.50 per leg

Configurable.

---

## TOS-006 — Recommendation Engine

Priority: High

Status: Planned

Recommendations:

IMPORT

IGNORE

RESIDUAL

ASK_LATER

---

## TOS-007 — Import Inbox

Priority: High

Status: Planned

Goal:

Populate IMPORT_REVIEW.

---

## TOS-008 — Decision Engine

Priority: High

Status: Planned

Goal:

User approves:

Import

Ignore

Residual

Ask Later

---

## TOS-009 — Trade Repository

Priority: Critical

Status: Planned

Goal:

Create / Update MASTER_TRADES.

Support:

Open

Partial Close

Closed

Expired

Residual

Archived

---

# Future Backlog

## Dashboard Live

## Analytics Engine

## Compounding Engine

## Scanner

## AI Coach

## Portfolio Analytics

## Mobile Dashboard

## Multi Broker Support