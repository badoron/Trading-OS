
## Cycle 5 - Pipeline hardening

- Enforced single-snapshot execution through the entire DDC pipeline, including closed-leg synchronization.
- Added centralized pipeline audit status constants.
- Added stable machine-readable error codes for lock, snapshot-safety and dependency failures.
- Added regression coverage preventing BrokerSnapshot reloads inside the pipeline.
- Added Cycle 5 hardening tests to the regression runner.

# Changelog

All notable changes to Trading OS will be documented in this file.

---

## v3.0.0 (In Development)

### Added
- GitHub repository
- Initial documentation
- Architecture document
- Roadmap
- Google Apps Script project
- Trading OS menu
- Initial Health Check

### Planned
- Logger
- Import Engine
- Safe Trade Removal
- IBKR Client Portal integration
- Scanner Engine
- Dashboard Automation

## Stabilization Cycle 2

- Added an idempotent one-time migration for the legacy `ACCOUNT_HISTORY` schema.
- Added backup creation before destructive sheet changes.
- Added consolidation and removal of duplicate `RealizedPnL` columns in `TRADE_LEGS`.
- Added pure regression tests for legacy row mapping and duplicate-column consolidation.
- Added `runTradingOSStabilizationMigration()` as the explicit migration entry point.

## Stabilization Cycle 3

- Corrected dashboard and HOME realized PnL for partial exits.
- MASTER_TRADES remains authoritative whenever its RealizedPnL field is populated.
- When MASTER_TRADES RealizedPnL is blank, closed TRADE_LEGS RealizedPnL values are used as a fallback.
- Added normalization of leg-level RealizedPnL and regression coverage preventing double counting.

## Cycle 4 - DDC completion with residual positions
- Added a pure residual-position classifier and non-destructive decision preview.
- DDC lifecycle now becomes `COMPLETED_WITH_RESIDUAL` once all original SHORT legs are closed and LONG legs remain open.
- Trades with an open SHORT leg remain `PARTIAL_EXIT`; fully absent trades remain `CLOSED_PENDING_EXIT_SYNC`.
- Trade finalization can complete the strategy while preserving open residual LONG legs.
- Dashboard summary now separates completed-with-residual trades, residual-position count, and residual unrealized PnL.
- Added regression suites for residual classification and DDC completion behavior.

## Cycle 6 - Release candidate hardening
## Cycle 7 - Residual position persistence

- Added automatic persistence of residual LONG positions after DDC lifecycle completion.
- Integrated `TradeLifecycleMonitor` with `ResidualPositionManager`.
- `ResidualPositionClassifier` now remains responsible only for lifecycle classification.
- `ResidualPositionManager` is responsible only for residual persistence.
- Persisted complete residual-leg metadata:
  - Symbol
  - OptionType
  - Strike
  - Expiration
  - Quantity
  - CostBasis
  - MarketValue
  - UnrealizedPnL
  - BrokerContractID
- Added lifecycle unit coverage verifying grouped-leg metadata propagation.
- Verified end-to-end integration from IBKR Open Positions through residual persistence.
- Verified idempotent residual creation (no duplicate residual records on repeated executions).

- Promoted the project version to `v3.1.0-rc.1` and removed conflicting runtime version strings.
- Added a non-destructive release preflight for required functions, Script Properties and core sheets.
- Added release-preflight regression coverage.
- Removed the hard-coded IBKR Flex Query ID from setup code and required explicit configuration arguments.
- Redacted Script Property values from diagnostic logging.
- Added release notes, upgrade instructions and a deployment checklist.
- Added the Release Preflight action to the Trading OS menu.

## Cycle 8 - Residual lifecycle synchronization

- Added synchronization of OPEN residual positions against the latest IBKR OpenPositions snapshot.
- Residuals still present at IBKR refresh Quantity, CostBasis, MarketValue, UnrealizedPnL and LastUpdatedAt.
- Residuals no longer present at IBKR are marked CLOSED with ClosedAt.
- Integrated residual synchronization into TradingOSApplication before Dashboard and HOME refresh.
- Added unit coverage for contract-ID normalization and open/closed residual synchronization.
