# Vigil: The Security Agent That Could Have Saved Drift's $285M

## What happened to Drift

On April 1, 2026, an attacker drained $285M from Drift Protocol in 12 minutes. TVL went from $309M to $41M. The attacker had been preparing for weeks — deploying a phantom token ($CVT) with a fake oracle price history, then phishing admin keys via durable nonces. When they executed, they raised withdrawal limits to $500 trillion, deposited worthless tokens as collateral, and borrowed every real asset in every vault.

Lookonchain detected it 30 minutes later. Drift's team responded after 60 minutes. By then the funds were on Ethereum.

Trail of Bits audited Drift in 2022. ClawSecure audited it in February 2026. Neither caught this vector. Static audits miss what happens at runtime.

## What is Vigil

Vigil is a security agent for Solana — registered on Metaplex Core, powered by Helius + GoldRush data, with an on-chain Guardian program that can freeze protocols when exploits are detected.

It monitors 5 invariants in real-time:
- **TVL Drop** — balance drains above threshold (Drift: 87% drained)
- **Authority Change** — admin key transfers (Drift: admin takeover)
- **Config Change** — withdrawal limit modifications (Drift: limits set to $500T)
- **Admin Action** — program upgrades, market listings (Drift: phantom token listed)
- **Large Withdrawal** — single transactions exceeding TVL percentage

When an invariant breaks, Vigil fires a Telegram alert in under 10 seconds. The team clicks one button in the dashboard and the on-chain Guardian program freezes the protocol. No more withdrawals until the team reviews and unpauses.

## What makes this an agent, not just a dashboard

Other agents can query Vigil before transacting:

```
GET /api/safety?protocol=<solana_address>

Response:
{
  "status": "CRITICAL",
  "riskScore": 80,
  "recommendation": "AVOID",
  "activeAlerts": [...]
}
```

A trading bot calls this before swapping on Raydium. A yield aggregator checks before depositing into a lending pool. If Vigil says AVOID, the agent routes around the danger. That's agent-to-agent security intelligence.

## Live on Solana devnet

Everything is deployed and verified:

- **Guardian Program:** `2pizUSNyLBMDM7QNBUxFYs3dQKF1RJwKtP2BTZfbyAMK`
- **Test Vault:** `4M9V6X4tNudhVXvJpeEaMwqBYXQUYYsyRxoP5Eotophq`
- **Agent NFT (Metaplex Core):** `5vcG2R9zAn2s8SuuPgHizMQq1XhKVcQ1P7fR1aFt2N3q`
- **Self-attack tx (verified):** [View on Solscan](https://solscan.io/tx/3VuahxbLR9361Uxzw7JPDdCgZwZBbK5weFvawwU4YHXZo6qNJeNqQE54BXA1CTAjME9Ew4H5Sg2eAYTBxsib6tBC?cluster=devnet)

The self-attack demo: deposited 10 SOL, withdrew 8 SOL (80% TVL drain), Guardian paused the vault, further withdrawal BLOCKED.

15/15 Anchor tests passing. Full test coverage for Guardian lifecycle + Vault integration + authorization checks.

## Architecture

```
Helius Webhook (account changes)
    |
    v
Watcher Service (TypeScript)
    | 5 invariant checks
    | GoldRush API enrichment
    |
    +---> Telegram alerts (<10 sec)
    +---> A2A Safety API (/api/safety)
    +---> Dashboard (Next.js)
    |
    v
On-Chain Guardian (Anchor/Rust)
    | pause() / unpause()
    | Per-protocol PDA state
    | Auto-unpause safety timer
```

## Why V1 is alert + manual pause (not auto-pause)

A false positive that freezes a lending protocol during volatility can cause more damage than the attack — liquidations stop, bad debt accumulates. V1 detects and alerts in seconds. A human decides whether to pause. V2 adds automated pause with 2-of-3 watcher threshold consensus after proving zero false positives.

Security tools with bugs are worse than no security tools. We're deliberate about what we ship.

## Tech Stack

- **On-chain:** Anchor/Rust (Guardian + Test Vault programs)
- **Watcher:** TypeScript/Express
- **Data:** Helius webhooks + Covalent GoldRush API
- **Identity:** Metaplex Core NFT (agent registered on-chain)
- **Dashboard:** Next.js (static export, GitHub Pages)
- **Alerts:** Telegram Bot API
- **Storage:** SQLite
- **Tests:** 15/15 passing (Anchor + mocha)

## Links

- **GitHub:** https://github.com/Yonkoo11/solana-shield
- **Dashboard:** https://yonkoo11.github.io/solana-shield/
- **Agent Metadata:** https://yonkoo11.github.io/solana-shield/agent.json
- **Drift Replay:** https://yonkoo11.github.io/solana-shield/drift

---

## Quote RT Drafts

### Metaplex Track:
Vigil is a security agent registered on @metaplex Core that monitors Solana protocols for exploits in real-time. Other agents query it for safety scores before transacting.

On-chain Guardian program. 5 invariant checks. A2A safety API. Drift hack case study.

Built for the agent economy.

@trendsdotfun @solana_devs @metaplex #AgentTalentShow

[X Article link]

### Covalent Track:
Vigil deploys persistent monitors powered by @Covalent_HQ GoldRush that watch for drainer approvals, sudden TVL drops, and config changes on Solana protocols.

Real-time detection. On-chain pause. A2A safety queries.

@trendsdotfun @solana_devs @Covalent_HQ #AgentTalentShow

[X Article link]

### Solana Main Track:
$285M drained from Drift in 12 minutes. Detection took 30.

Vigil is the security agent Solana has been missing. 5 invariant checks. On-chain Guardian pause. A2A safety API. Registered on Metaplex. Powered by Helius + GoldRush.

@trendsdotfun @solana_devs @solana #AgentTalentShow

[X Article link]
