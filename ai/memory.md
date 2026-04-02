# Solana Shield — AI Memory

## Phase 1 Gate (MUST PASS BEFORE ANY OTHER WORK)
Core Action: Helius webhook receives account-change event, backend checks 3 invariants, Telegram alert fires on violation.
Success Test: Self-attack devnet vault, withdraw >20% TVL, alert fires within 10 seconds, dashboard shows it.
Min Tech: FastAPI + Helius webhook + 3 invariants + Telegram bot + basic dashboard
NOT Phase 1: Auto-pause, multi-protocol, cross-chain, design polish, videos
Status: [ ] NOT STARTED

## Hackathon
- **Name:** Colosseum Frontier Hackathon (Solana)
- **Dates:** April 6 - May 11, 2026
- **Track:** Infrastructure (primary), Public Goods (secondary)
- **Deadline:** May 11, 2026
- **Prize:** $2.5K-$25K track + $50K Grand Champion + $250K accelerator
- **Submission:** Working prototype + source + README + pitch video (<3 min) + technical demo (2-3 min)
- **Judging:** Startup intent, working demo, user validation, build in public, business viability

## Chosen Idea
- **Research ID:** #53 (Continuous Security Monitoring)
- **Research file:** ~/Projects/real-problems-and-products.md line ~1857
- **One-liner:** Free/open-source detection-to-alert pipeline for Solana protocols that can't afford $2K+/month Sec3
- **Revenue model:** Open-source core (adoption) → Hosted SaaS $499-2K/month → Insurance partnerships

## Competitive Landscape (verified Apr 2, 2026)
- **Sec3 WatchTower + CircuitBreaker:** Enterprise Solana monitoring. $2K-$10K/month. Customers: Solend, Hedge, Hubble, Helium, Metaplex, Tulip (possibly stale list from 2022-2023). CircuitBreaker docs return 403. No public evidence of CircuitBreaker halting an attack. $10M seed funding.
- **Forta Firewall:** EVM-only. Sub-10ms latency. Dynamic Freeze Module. No Solana.
- **Hypernative:** EVM primarily. Detection, not response.
- **Guardrail:** EVM (Euler, EigenLayer). Invariant monitoring.
- **OZ Defender:** Dying July 2026. EVM.

## Drift Hack Case Study (April 1, 2026) — CONFIRMED
- Amount: $280M (confirmed by Drift post-mortem)
- Cause: CONFIRMED — Social engineering of 2/5 multisig signers via durable nonces
- NOT a code exploit. Programs worked as designed. No compromised seed phrases.
- Timeline: Mar 23 (nonce accounts created) → Mar 27 (council migrated) → Mar 30 (new signer compromised) → Apr 1 (test tx, then 2 pre-signed txs 4 slots apart, all vaults drained)
- Key signal: Attacker ran TEST TRANSACTION 1 minute before real drain. 60-second warning window.
- Detection: Lookonchain/PeckShield ~30 min after execution. No automated monitoring caught anything.
- Attacker path: 15+ tokens drained → Jupiter swaps → CCTP bridge to Ethereum
- Circle criticism: Could freeze 16 legit businesses overnight but couldn't freeze stolen funds fast enough
- Root cause: 2 out of 5 multisig signatures. That was the security for $280M.
- Source: Drift's own post-mortem + detailed community analysis

## Fatal Flaws (acknowledged, not ignored)
1. **False positive risk:** A wrong alert could cause panic. V1 is alert-only (no auto-pause) to mitigate.
2. **Invariant definition is protocol-specific.** Generic invariants (TVL drop, authority change) catch broad attacks but miss protocol-specific exploits.
3. **Sec3 exists.** Our differentiator is: free, open-source, simple setup (<1 hour).

## Technical Decisions
- **Helius webhooks** (not WebSockets): simpler, built-in retries, parsed data. Free tier: 1 webhook, 500K credits.
- **FastAPI backend:** Python, matches vibe-scanner patterns.
- **Telegram alerts:** Low friction, protocol teams already use Telegram.
- **GitHub Pages dashboard:** Free hosting, static export from Next.js.
- **Devnet test vault:** Anchor program for self-attack demo.

## Reusable Code (from existing projects)
- vibe-scanner/scripts/solana_rescue.py:63-80 — Solana JSON-RPC wrapper
- vibe-scanner/scripts/solana_rescue.py:83-88 — Balance checking
- vibe-scanner/scripts/wallet_monitor.py — Full monitoring state machine
- vibe-scanner/scripts/alerter.py — macOS notifications + JSONL logging
- mev-shield/app/hooks/useShieldProgram.ts — Anchor program polling hooks

## Build in Public
- Create @SolanaShield Twitter/X account
- Tweet progress 2-3 times per week
- Share Drift case study analysis
- Tag @colosseum, @heaborioso in progress updates

## Deliverables Checklist (before May 11)
- [ ] Working monitoring backend on live Solana
- [ ] Dashboard with real-time alert feed
- [ ] Devnet test vault for self-attack demo
- [ ] Drift hack timeline replay visualization
- [ ] Pitch video (<3 min, Loom)
- [ ] Technical demo (2-3 min, Loom)
- [ ] Clean GitHub repo with README
- [ ] Talk to 2-3 protocol teams for validation quotes
- [ ] Submit on arena.colosseum.org
- [ ] Grant judges access to everything
