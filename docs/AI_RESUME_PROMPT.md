I'm continuing my Trading OS project.

Please start by reading the project documentation in this exact order:

1. START_HERE.md
2. README.md
3. docs/PROJECT_BRAIN.md
4. docs/SESSION_STATE.md
5. docs/PROJECT_MASTER.md
6. docs/Architecture.md
7. docs/DDC.md
8. docs/DECISIONS.md
9. docs/PROJECT_HANDOVER.md
10. BACKLOG.md

After reading them:

• Summarize your understanding of the current architecture.
• Tell me the current sprint.
• Tell me the next unfinished backlog item.
• Do not redesign the architecture.
• Continue exactly from the current implementation.

Important current context:

- Trading OS MVP is complete end-to-end.
- DDC detection works.
- Import Review works.
- Approval workflow works.
- MASTER_TRADES and TRADE_LEGS are created correctly.
- Trade Monitor updates live open positions.
- Lifecycle Monitor correctly detects OPEN, PARTIAL_EXIT and CLOSED.
- Closed legs are detected by comparing TRADE_LEGS against current IBKR Open Positions.
- Strategy IDs and Leg IDs are deterministic.
- We intentionally keep trades OPEN until the last leg disappears.
- Partial exits must accumulate realized PnL while unrealized PnL continues for remaining legs.
- Final trade PnL must equal the sum of realized + unrealized during the trade, and realized only after the last leg is closed or expires.
- We recently increased the IBKR Flex Query from 7 to 14 days because exit transactions must remain available.
- IBKR Flex XML storage was updated to support XML larger than 50,000 characters by storing it in chunks.
- The current task is implementing the Exit Sync / Realized PnL engine using IBKR Trades.

Do not restart the project.
Do not rewrite existing modules.
Continue from the current codebase.