# CHANGELOG

All notable changes to Trading OS are documented in this file.

The format is based on semantic versioning.

---

# Version 4.0.0 (Current)

Release Date: 2026-07-10

## Sprint 1 — MVP Completed

### Added

- IBKR Flex Client
- IBKR XML Cache
- IBKR Flex Parser
- Open Position Parser
- Strategy Engine foundation
- DDC Strategy Detector
- Stable StrategyID generation
- Stable LegID generation
- IMPORT_REVIEW workflow
- Manual Approval process
- MASTER_TRADES import
- TRADE_LEGS import
- Trade Monitor
- Live synchronization from Open Positions
- Duplicate import protection

### Changed

- Architecture redesigned around Strategy Engine.
- Open Positions became the Source of Truth for active trades.
- Historical Executions are no longer used to reconstruct active strategies.
- Documentation completely updated.

### Fixed

- Duplicate strategy imports.
- Stable synchronization between IBKR and Trading OS.
- Deterministic Strategy IDs.
- Deterministic Leg IDs.

---

# Planned - Version 4.1.0

## Sprint 2

### Planned

- Closed Trade Detection
- Exit Synchronization
- Workflow State Automation
- Realized PnL
- Partial Exit Detection
- Residual Position Handling

---

# Planned - Version 4.2.0

## Sprint 3

### Planned

- OTV Detector
- PMCC Detector
- Butterfly Detector
- TimeEdge Detector
- Generic Strategy Engine
- Plugin Architecture

---

# Planned - Version 5.0.0

## Long Term

### Planned

- Scanner Integration
- Dashboard
- Portfolio Analytics
- Risk Engine
- AI Reviews
- Performance Analytics
- Position Simulator
- Multi-Broker Support