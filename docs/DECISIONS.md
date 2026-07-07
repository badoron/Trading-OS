# Trading OS — Architecture Decisions (ADR)

## ADR-001 — IBKR is the Source of Truth

**Status:** Accepted

### Decision
IBKR is the authoritative source for:
- Positions
- Executions
- Commissions
- Final P/L
- Cash
- Margin

### Reason
Broker data is always more accurate than internal calculations.

### Consequences
Analytics use broker net values.
Internal calculations are only estimates.

---

## ADR-002 — Trade != Position

**Status:** Accepted

### Decision
A Trade may contain multiple IBKR positions.

A broker position belongs to only one Trade.

### Reason
Strategies such as DDC, Butterfly and OTV consist of several option legs.

---

## ADR-003 — Manual Review Before Import

**Status:** Accepted

### Decision

Every detected strategy enters Import Review.

Nothing enters MASTER_TRADES automatically.

### Reason

Human approval is mandatory.

---

## ADR-004 — Playbook is Advisory

**Status:** Accepted

### Decision

Playbook never blocks a trade.

It only gives recommendations.

### Reason

The trader makes the final decision.

---

## ADR-005 — Manual Override

**Status:** Accepted

### Decision

User decisions always override AI and automation.

---

## ADR-006 — Never Delete Trades

**Status:** Accepted

Trades become:

- Archived
- Ignored
- Residual
- Expired

Nothing is physically deleted.

---

## ADR-007 — Configurable Commissions

**Status:** Accepted

Default:

$1.50 per leg

User configurable.

Analytics use broker commissions.

---

## ADR-008 — Configurable Playbook Rules

Wing Width

Risk

Expected Move

Minimum Credit

Liquidity

Everything configurable.

---

## ADR-009 — Google Sheets Architecture

Google Sheets provides:

- Data
- Workflow
- Dashboard

Apps Script contains business logic.

GitHub contains source code and documentation.

---

## ADR-010 — Health First

Every release must pass Health Check before deployment.

No exceptions.