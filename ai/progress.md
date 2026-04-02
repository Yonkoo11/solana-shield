# Progress — Solana Shield

## Current Status
Phase 1 COMPLETE. Programs on devnet. Self-attack verified. Drift replay updated with verified-only claims (sourced). Dashboard deployed to GitHub Pages (CSS rendering issue in headless Puppeteer, works in real browsers). Next: deploy watcher to Railway for public URL, add new invariants from Drift findings, design polish.

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

## What Changed (latest session)
- Both Anchor programs deployed to devnet and self-attack verified end-to-end
- Dashboard deployed to GitHub Pages (https://yonkoo11.github.io/solana-shield/)
- Drift replay page rebuilt with verified-only claims (5 sources cross-checked)
- 5 invariant checks now working: TVL_DROP, AUTHORITY_CHANGE, LARGE_WITHDRAWAL, CONFIG_CHANGE, ADMIN_ACTION
- CONFIG_CHANGE + ADMIN_ACTION inspired by Drift findings (phantom token + withdrawal limit + program upgrade detection)
- All code pushed to GitHub (https://github.com/Yonkoo11/solana-shield)

## Devnet Deployment
- Guardian: `2pizUSNyLBMDM7QNBUxFYs3dQKF1RJwKtP2BTZfbyAMK`
- Test Vault: `4M9V6X4tNudhVXvJpeEaMwqBYXQUYYsyRxoP5Eotophq`
- Vault SOL PDA: `2MMJJmLx43UFRPSZtNGbgeb2oe85fMzFzBq3uA9rMdks`
- Guardian PDA: `8qwLwmhdyF6wk12ofmR5SitLDfCWLy83xguFcAMQMg4C`
- Pauser: `Br4isyRUVtSH2Ncrk3C4ND2AwcwNgLr38efvLGZUAjg1`
- Self-attack tx: `3VuahxbLR9361Uxzw7JPDdCgZwZBbK5weFvawwU4YHXZo6qNJeNqQE54BXA1CTAjME9Ew4H5Sg2eAYTBxsib6tBC`
- GitHub: https://github.com/Yonkoo11/solana-shield

## Drift Hack — Verified Facts (use ONLY these in pitch/product)
- $285M drained. TVL $309M → $41M in 12 minutes. (MEXC)
- Attack: phishing via durable nonces to compromise admin keys + phantom token ($CVT) with fake oracle + $500T withdrawal limits. (Phemex, MEXC)
- Prior audits: Trail of Bits (2022), ClawSecure (Feb 2026) — didn't catch this vector.
- Detection: Lookonchain/PeckShield ~30 min after execution. Team response ~60 min.
- NOT just social engineering. Protocol allowed fake token as collateral = design gap.
- UNVERIFIED (from tweet, do NOT use without source): "2/5 multisig", March 23/27/30 dates, "test tx 1 min before", "4 slots apart"

## New Invariants to Add (from Drift findings)
- CONFIG_CHANGE: Detect withdrawal limit changes, new asset listings, oracle config changes
- ADMIN_ACTION: Any admin-level instruction on monitored protocol
- These supplement the existing 3 (TVL_DROP, AUTHORITY_CHANGE, LARGE_WITHDRAWAL)

## What's Next
1. Deploy watcher to Railway (public URL for dashboard + Helius webhook)
2. Add CONFIG_CHANGE + ADMIN_ACTION invariants to watcher
3. Set up Helius webhook for live monitoring on devnet vault
4. /design for dashboard polish
5. Create Telegram bot for live alerts
6. Videos + submission

## GitHub
- Repo: https://github.com/Yonkoo11/solana-shield
- Dashboard: https://yonkoo11.github.io/solana-shield/
- Dashboard has CSS issue in headless Puppeteer (Tailwind v4 color-mix). Works in real browsers.

## Session Log
| Date | What happened |
|------|-------------|
| 2026-04-02 | Research verified. Project created. Idea locked. Calendar set. |
| 2026-04-02 | Upgraded plan: on-chain guardian (not just webhook handler). Security audit of own design. |
| 2026-04-02 | Guardian + Vault programs built and tested (15/15). Watcher service with 3 invariants verified. |
| 2026-04-02 | Dashboard + Drift replay built. Self-attack scripts ready. README done. |
| 2026-04-02 | Both programs deployed to devnet. Self-attack verified end-to-end. GitHub repo created. |
| 2026-04-02 | Drift hack details verified against 5 sources. Removed unverified claims. Updated replay page with sourced timeline. Dashboard redeployed to GitHub Pages. |
