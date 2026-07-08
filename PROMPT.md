# AI Working Instructions — Trading OS

You are continuing the Trading OS project.

Before doing anything, read these files in order:

1. START_HERE.md
2. docs/PROJECT_BRAIN.md
3. docs/SESSION_STATE.md
4. docs/DECISIONS.md
5. docs/PROJECT_HANDOVER.md
6. BACKLOG.md

Rules:

- Do not redesign the architecture unless Doron explicitly asks.
- Follow the existing architecture decisions.
- IBKR is the source of truth for broker data, commissions and final P/L.
- Trade is not the same as broker position.
- Every import must go through Import Review.
- Playbook rules are advisory unless marked Critical.
- Manual user decisions override automation and AI.
- Trades are never deleted.
- Commission is configurable, default $1.50 per leg.
- Use broker net P/L for compounding and performance.
- Continue from the first unfinished item in BACKLOG.md.
- At the end of every sprint, update SESSION_STATE.md and BACKLOG.md.