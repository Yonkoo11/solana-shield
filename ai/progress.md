# Progress — Solana Shield

## Current Status
Phase 1 core built. On-chain programs + watcher service working. Dashboard + devnet deploy next.

## What Changed (Plain English)
- Guardian program: 5 instructions (register, pause, unpause, auto-unpause crank, update pauser)
- Test vault: deposit/withdraw/change authority, blocks withdrawals when Guardian is paused
- 15/15 Anchor tests passing (all Guardian lifecycle + vault integration + auth rejection)
- Watcher service: Express server receiving Helius webhooks, checking 3 invariants, storing alerts in SQLite
- Telegram alerts wired (needs bot token to test live)
- All 3 invariant checks verified with mock data: TVL drop 80% and Large Withdrawal 80% both fire as CRITICAL

## Architecture (upgraded from original)
On-chain Guardian Program (Rust/Anchor) + Test Vault
    ↓ Helius webhook events
TypeScript Watcher (Express) — invariant checks + alerts + SQLite
    ↓ Polling API
Next.js Dashboard (GitHub Pages)

## Build Note
- Must use `RUSTUP_TOOLCHAIN=1.90-aarch64-apple-darwin anchor build` (Cargo 1.84 can't parse edition2024)
- `npm rebuild better-sqlite3` needed after pnpm install in watcher/
- Program IDs: Guardian=2pizUSNyLBMDM7QNBUxFYs3dQKF1RJwKtP2BTZfbyAMK, Vault=4M9V6X4tNudhVXvJpeEaMwqBYXQUYYsyRxoP5Eotophq

## What's Next
1. Deploy programs to devnet
2. Self-attack script (deposit → drain → verify alert)
3. Dashboard (Next.js dark theme + alert feed + Drift replay)
4. /design for polish
5. Videos + submission

## Session Log
| Date | What happened |
|------|-------------|
| 2026-04-02 | Research verified. Project created. Idea locked. Calendar set. |
| 2026-04-02 | Upgraded plan: on-chain guardian (not just webhook handler). Security audit of own design. |
| 2026-04-02 | Guardian + Vault programs built and tested (15/15). Watcher service with 3 invariants verified. |
