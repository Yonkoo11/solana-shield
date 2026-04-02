# Vibecoder Mode - Paste this into any project's CLAUDE.md

## Communication Rules
- Never say: branch, commit, merge, PR, push, pull, HEAD, diff, npm, deploy, lint, daemon, env var
- Instead say: version, save point, combine changes, publish, update, latest, changes, install, check code
- Never show raw terminal output. Summarize in one sentence.
- Never show error messages directly. Say what happened and what you're doing to fix it.
- When done, describe what changed by what the user would SEE in the app, not what files changed.

## Behavior Rules
- Auto-save after every completed task (git add specific files + commit). Never ask "should I commit?"
- If you need to create a version, just do it silently.
- If tests fail, fix them without explaining test frameworks.
- After each task: update ai/progress.md with a "What Changed (Plain English)" section.
- Keep all explanations to 1-3 sentences. If the user wants more detail, they'll ask.

---

# Solana Shield — On-Chain Guardian Protocol for Solana

## Phase 1 Gate (MUST PASS BEFORE ANY OTHER WORK)

**Core Action:** On-chain Guardian program pauses a protocol when exploit is detected. Watcher detects via Helius webhook, alerts via Telegram, team clicks pause in dashboard, Guardian freezes the vault.

**Success Test:** Self-attack test vault on devnet. Withdraw 80% TVL. Alert fires <10 seconds. Team pauses via Guardian. Further withdrawals blocked.

**Min Tech:**
- Guardian program (Anchor/Rust) with pause/unpause/auto-unpause
- Test vault that checks Guardian is_paused before withdraw
- TypeScript watcher (Express) receiving Helius webhooks
- 3 invariant checks + Telegram alerts
- Dashboard with alert feed + one-click pause

**NOT Phase 1:**
- Auto-pause from off-chain watcher (V2 — needs threshold consensus)
- Geyser gRPC (V2 — for sub-second detection)
- Multi-protocol support in production
- Invariant DSL / custom rule language

## Build Order (ENFORCED)
1. Guardian + Test Vault programs (Anchor/Rust) ✅ DONE
2. Watcher service (TypeScript/Express + invariants + Telegram) ✅ DONE
3. Dashboard (Next.js + alert feed + Drift replay) ✅ DONE
4. Deploy to devnet + self-attack demo (BLOCKED: airdrop rate limit)
5. /design for dashboard polish
6. Videos + submission

## Build Note
- Use `RUSTUP_TOOLCHAIN=1.90-aarch64-apple-darwin anchor build` (Cargo 1.84 can't parse edition2024)
- Run `npm rebuild better-sqlite3` after pnpm install in watcher/
- Program IDs: Guardian=2pizUSNyLBMDM7QNBUxFYs3dQKF1RJwKtP2BTZfbyAMK, Vault=4M9V6X4tNudhVXvJpeEaMwqBYXQUYYsyRxoP5Eotophq

## Hackathon Context

**Hackathon:** Colosseum Frontier Hackathon (Solana)
**Dates:** April 6 - May 11, 2026
**Track:** Infrastructure (primary), Public Goods Award (secondary)
**Deadline:** May 11, 2026
**Prize:** $2.5K-$25K per track + $50K Grand Champion + $250K accelerator

**Required Tech:** Must build on Solana.

**Judging Criteria:**
- Startup intent (treat as a company, not a project)
- Working demo on devnet
- Pitch video <3 min + Technical demo 2-3 min
- Build in public (Twitter/X)
- User validation (talk to protocol teams)

**Submission Requirements:**
- Working prototype
- Source code + README
- Pitch video (Loom, <3 min): team, problem, Drift case study, demo, vision
- Technical demo (2-3 min): architecture, Solana integration, code walkthrough
- Grant judges access to all materials

## Competitive Landscape

| Competitor | What | Chain | Gap |
|-----------|------|-------|-----|
| Sec3 WatchTower + CircuitBreaker | Bot-based alerts, enterprise pricing ($2K-$10K/mo) | Solana | Stale customer list, CircuitBreaker docs 403, Drift still happened |
| Forta Firewall | AI simulation + Dynamic Freeze, sub-10ms | EVM only | No Solana support |
| Hypernative | Mempool simulation, detection | EVM primarily | Detection only |
| Guardrail | Invariant monitoring | EVM (Euler, EigenLayer) | No Solana |

**Our angle:** Free/open-source monitoring for protocols that can't afford $2K+/month Sec3. Drift lacked even a basic audit. 99% of Solana protocols have zero monitoring.

## Key Narrative: Drift Hack (April 1, 2026)

- $200M-$285M drained (amount disputed, investigation ongoing)
- Cause UNCONFIRMED (could be key compromise, contract bug, or oracle manipulation)
- Drift lacked a Certik audit despite $200M+ TVL
- Detected by Lookonchain/PeckShield ~1:30 ET, but no automated response
- Attacker bridged to Ethereum, bought ETH, still at large

**Do NOT claim Drift validates "key compromise monitoring" specifically.** The cause is unconfirmed. Claim: "regardless of cause, automated monitoring + alerting would have reduced response time from hours to seconds."

## Technical Architecture

```
Helius Webhook (free tier: 1 webhook, 500K credits)
    │ HTTP POST on account change
    ▼
FastAPI Backend
    │ Check 3 invariants
    │ Log to JSONL audit trail
    ▼
┌───┴───┐
│       │
Telegram  Dashboard (Next.js on GitHub Pages)
 Bot     Real-time alerts + history
```

## Research Base
- Full analysis: ~/Projects/real-problems-and-products.md (idea #53, Part 29, line ~1857)
- Quick-Pick: ~/Projects/IDEAS-SUMMARY.md (Security/Audit hackathon section)
- Existing monitoring patterns: ~/Projects/vibe-scanner/scripts/ (wallet_monitor.py, alerter.py, solana_rescue.py)
