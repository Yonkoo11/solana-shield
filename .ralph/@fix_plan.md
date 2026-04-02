# Fix Plan - Solana Shield

## Tasks

- [ ] Task 1: Set up FastAPI backend that receives Helius webhook POST requests
  - Acceptance: POST to /webhook returns 200, parsed account data logged to console
  - Files: backend/main.py, backend/requirements.txt

- [ ] Task 2: Implement 3 invariant checks
  - Acceptance: Given a mock account-change payload, correctly flags: (a) TVL drop >20%, (b) authority change, (c) single withdrawal >5% TVL
  - Files: backend/invariants.py, backend/tests/test_invariants.py

- [ ] Task 3: Set up Telegram bot alerting
  - Acceptance: When invariant violated, Telegram message sent to configured chat ID with alert details
  - Files: backend/alerts.py

- [ ] Task 4: Create devnet test vault Anchor program
  - Acceptance: Can deposit SOL, withdraw SOL, change authority. Program deployed to devnet.
  - Files: programs/test-vault/src/lib.rs, programs/test-vault/Anchor.toml

- [ ] Task 5: Wire webhook to devnet test vault and run self-attack
  - Acceptance: Deposit 10 SOL, withdraw 8 SOL (>20% TVL drop), Telegram alert fires within 10 seconds
  - Files: scripts/self-attack.ts

- [ ] Task 6: Build dashboard showing real-time alert feed
  - Acceptance: Dashboard loads, shows list of alerts with timestamp/type/severity/details, auto-refreshes
  - Files: dashboard/app/page.tsx, dashboard/app/layout.tsx

- [ ] Task 7: Add Drift hack timeline replay visualization
  - Acceptance: Dashboard page shows timeline of Drift hack events with "where we would have alerted" markers
  - Files: dashboard/app/drift-replay/page.tsx

- [ ] Task 8: Record pitch video (<3 min)
  - Acceptance: Video uploaded to Loom, covers: team, problem (Drift), demo, vision, business model
  - Files: N/A (video)

- [ ] Task 9: Record technical demo (2-3 min)
  - Acceptance: Video uploaded to Loom, covers: architecture, Solana/Helius integration, code walkthrough
  - Files: N/A (video)

- [ ] Task 10: Submit to Colosseum
  - Acceptance: Submission visible on arena.colosseum.org, judges have access to repo + videos
  - Files: README.md, submission materials

## Completed
(builder fills this in)
