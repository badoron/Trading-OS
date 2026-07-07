# Trading OS Architecture

## Components

- Google Sheets
  - Dashboard
  - Trade Database
  - Analytics
  - Scanner Results

- Google Apps Script
  - UI
  - Automation
  - Sync Engine
  - Logger
  - Health Check

- GitHub
  - Source Code
  - Documentation
  - QA
  - Releases

- IBKR
  - Account
  - Positions
  - Orders
  - Trades

## Design Principles

1. Google Sheets stores data.
2. Apps Script contains business logic.
3. GitHub is the single source of truth for code.
4. No manual editing of calculated fields.
5. Every release passes QA before deployment.
