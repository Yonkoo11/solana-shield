# Solana Shield

**On-chain guardian protocol for Solana. Detect exploits. Pause protocols. Protect TVL.**

Solana Shield gives protocol teams a free, open-source security layer: real-time monitoring detects exploit patterns (TVL drops, authority changes, suspicious withdrawals) and an on-chain Guardian program lets teams freeze their protocol in one click.

Built for [Colosseum Frontier Hackathon](https://colosseum.com/) — Infrastructure Track.

## The Problem

On April 1, 2026, Drift Protocol lost $200M+ in a single exploit. The attack completed in minutes. Manual detection by Lookonchain took ~30 minutes. Drift's team response took ~60 minutes. By then, the funds were already bridged to Ethereum.

**Average DeFi exploit completes in under 60 seconds. Average incident response takes 37 minutes.**

Sec3's WatchTower exists but costs $2K-$10K/month and has no public evidence of ever halting an attack. 99% of Solana protocols have zero automated monitoring.

## The Solution

```
Solana Chain Events (Helius Webhook)
    │
    ▼
┌──────────────────────────┐
│   Watcher Service        │  Detects: TVL drops, authority changes,
│   (TypeScript/Express)   │  large withdrawals. Fires alerts in <10s.
└──────────┬───────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
 Telegram     Dashboard         On-Chain Guardian
  Alerts      (Next.js)         (Anchor/Rust)
                                 │
                            pause() / unpause()
                            Per-protocol PDA
                            Auto-unpause safety
```

**Three layers:**
1. **Detection** — Off-chain watcher monitors account changes via Helius webhooks, checks configurable invariants
2. **Alerting** — Telegram alerts fire in <10 seconds with severity, details, and Solscan links
3. **Response** — On-chain Guardian program enables one-click protocol pause. Integrated protocols check `is_paused` before critical operations

## On-Chain Guardian Program

The Guardian is a Solana program that stores per-protocol pause state as PDAs:

- `register_protocol` — Protocol registers with Guardian, sets authority + pauser + auto-unpause delay
- `pause` — Designated pauser (watcher service key or protocol team) triggers emergency pause
- `unpause` — Protocol authority (multisig) restores operations
- `crank_auto_unpause` — Permissionless: auto-unpauses after configurable timeout (prevents permanent freeze)
- `update_pauser` — Authority can rotate the pauser key

**Integration:** Protocols add a single account check to their critical instructions:
```rust
#[account(
    constraint = !guardian_state.is_paused @ VaultError::ProtocolPaused
)]
pub guardian_state: Account<'info, ProtocolGuard>,
```

## Invariant Checks

| Check | Trigger | Severity |
|-------|---------|----------|
| TVL Drop | Balance drops >20% in one transaction | CRITICAL (>50%) / HIGH |
| Large Withdrawal | Single withdrawal >5% of TVL | CRITICAL (>50%) / HIGH |
| Authority Change | Upgrade key or owner transferred | CRITICAL |

Thresholds are configurable per protocol.

## Demo: Self-Attack

We built a test vault on devnet to demonstrate the full flow:

1. Deposit 10 SOL into test vault
2. "Attack": Withdraw 8 SOL (80% TVL drop)
3. Watcher detects in <10 seconds, fires Telegram CRITICAL alert
4. Team clicks "Pause" in dashboard → Guardian freezes vault
5. Attacker tries to withdraw remaining 2 SOL → **BLOCKED**
6. Team reviews and unpauses when safe

## Tech Stack

| Component | Tech | Why |
|-----------|------|-----|
| Guardian Program | Anchor/Rust | On-chain, auditable, immutable after deploy |
| Test Vault | Anchor/Rust | CPI-less integration pattern |
| Watcher | TypeScript/Express | Matches Solana ecosystem |
| Dashboard | Next.js + Tailwind | Static export to GitHub Pages |
| Alerts | Telegram Bot API | Zero-dependency, instant delivery |
| Storage | SQLite | Zero-config, good enough for V1 |
| Detection | Helius Webhooks | Built-in retries, parsed data, free tier |

## Project Structure

```
solana-shield/
├── programs/
│   ├── guardian/        # On-chain Guardian (Rust)
│   └── test-vault/      # Demo vault (Rust)
├── watcher/             # Off-chain monitoring (TypeScript)
├── dashboard/           # Monitoring UI (Next.js)
├── tests/               # Anchor integration tests (15/15 passing)
└── scripts/             # Devnet setup + self-attack demo
```

## Getting Started

```bash
# Build programs
RUSTUP_TOOLCHAIN=1.90-aarch64-apple-darwin anchor build

# Run tests (15/15 passing)
RUSTUP_TOOLCHAIN=1.90-aarch64-apple-darwin anchor test

# Start watcher
cd watcher && pnpm install && npm rebuild better-sqlite3
TEST_VAULT_ADDRESS=<addr> GUARDIAN_PDA=<addr> npx tsx src/server.ts

# Start dashboard
cd dashboard && pnpm install && pnpm dev
```

## Security Design

**V1 is deliberately conservative:**
- Detection + alert + **manual** pause (no auto-pause from off-chain watcher)
- Guardian program is made immutable after deployment (no upgrade authority)
- Auto-unpause timeout prevents permanent freeze
- Pauser key can be rotated without redeploying

**Why no auto-pause in V1:** A false positive that freezes a lending protocol during high volatility can cause more damage than the attack it tried to prevent (liquidations stop → bad debt accumulates). V2 will add automated pause after proving zero false positives.

## Roadmap

- **V1 (Hackathon):** Detection + alert + manual pause. Working demo.
- **V2:** Automated pause with 2-of-3 watcher threshold consensus
- **V3:** Geyser gRPC for sub-second detection, invariant DSL for custom rules
- **V4:** SDK for protocol integration, insurance partnerships

## Drift Hack Case Study

The dashboard includes an interactive Drift hack timeline replay showing:
- Exact sequence of attack events
- Where Solana Shield would have detected each step
- Comparison: <10 second automated detection vs 30+ minute manual detection
- Note: Drift exploit cause is still unconfirmed as of April 2026

## License

MIT
