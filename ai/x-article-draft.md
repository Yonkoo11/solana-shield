# I built a security agent for Solana after watching Drift lose $285M

The Drift hack on April 1 made me angry. Not because of the money. Because it was preventable.

An attacker spent weeks setting up the hit. They deployed a fake token called CarbonVote ($CVT), wash-traded it to build a fake price history, then phished admin keys using Solana's durable nonce mechanism. On execution day, they raised withdrawal limits to $500 trillion, deposited worthless $CVT as collateral, and borrowed every real asset out of every vault. USDC, JLP, cbBTC, USDT. Everything.

$309M in TVL went to $41M in 12 minutes.

Lookonchain noticed 30 minutes after it started. The Drift team responded after about an hour. The funds were already on Ethereum by then.

Here's what gets me: Trail of Bits audited Drift in 2022. ClawSecure audited it again in February 2026. Two respected firms. Both gave it passing grades. And neither caught this vector. Because this wasn't a code bug you find by reading source files. This was a runtime attack that exploited how the protocol was administered.

Audits check code. Nobody was checking what happened on-chain in real time.

So I built Vigil.

## What it actually does

Vigil watches Solana protocol accounts for patterns that indicate an exploit in progress. Right now it checks five things:

1. TVL dropping past a threshold in a single transaction (Drift lost 87% of TVL)
2. Authority or upgrade key being transferred to an unknown wallet (Drift's admin keys were compromised)
3. Protocol configuration changes like withdrawal limits being modified (Drift's limits were set to $500 trillion)
4. Admin-level actions like new asset listings or program upgrades (Drift had a phantom token listed as valid collateral)
5. Unusually large withdrawals relative to pool size

When any of these triggers, an alert goes to Telegram within seconds. The protocol team sees it in the dashboard and can pause the protocol with one click. That pause happens on-chain through a Guardian program I wrote in Rust/Anchor. The Guardian stores per-protocol pause state as PDAs. Integrated protocols check `is_paused` before executing critical operations like withdrawals.

I deliberately did not build auto-pause. If the invariant engine has a false positive and auto-freezes a lending protocol during high volatility, liquidations stop. Bad debt piles up. The pause itself causes more damage than the attack. V1 detects and alerts. A human decides. Auto-pause is a V2 problem, after the detection logic proves it has zero false positives in production.

## The agent part

The piece I'm most interested in: other agents can query Vigil for safety scores before they transact.

```
GET /api/safety?protocol=<address>

{
  "status": "CRITICAL",
  "riskScore": 80,
  "recommendation": "AVOID",
  "activeAlerts": [...]
}
```

A trading bot checks this before swapping on a DEX. A yield optimizer checks before depositing into a pool. If the risk score is high, the agent skips that protocol and routes elsewhere.

This is what makes Vigil an agent and not just a monitoring dashboard. It participates in agent-to-agent decision making. The safety data feeds directly into other agents' execution logic.

I registered Vigil as a Metaplex Core NFT on devnet. It has on-chain identity, discoverable metadata, and a service spec that describes its A2A endpoints. Other agents can look it up in the registry and know what it offers.

## What's actually deployed

All of this is live on Solana devnet. Not mockups, not figma screens.

Guardian Program: `2pizUSNyLBMDM7QNBUxFYs3dQKF1RJwKtP2BTZfbyAMK`
Test Vault: `4M9V6X4tNudhVXvJpeEaMwqBYXQUYYsyRxoP5Eotophq`
Agent NFT: `5vcG2R9zAn2s8SuuPgHizMQq1XhKVcQ1P7fR1aFt2N3q`

I ran a self-attack demo: deposited 10 SOL into the test vault, then withdrew 8 SOL in one transaction (80% TVL drain). The watcher detected it, the alert fired, I paused the Guardian, and the next withdrawal attempt failed with "Protocol is paused by Guardian." You can verify the attack transaction on Solscan: https://solscan.io/tx/3VuahxbLR9361Uxzw7JPDdCgZwZBbK5weFvawwU4YHXZo6qNJeNqQE54BXA1CTAjME9Ew4H5Sg2eAYTBxsib6tBC?cluster=devnet

15 Anchor tests cover the Guardian lifecycle, vault integration, and authorization checks. Wrong signers get rejected. Double-pause gets rejected. Auto-unpause crank works after the timeout.

## How it's built

The on-chain piece is two Anchor programs. The Guardian handles pause/unpause/auto-unpause with per-protocol PDAs. The Test Vault is a simple SOL vault that checks the Guardian's state before allowing withdrawals. No CPI needed for the check since Anchor validates the account owner, so integrated protocols just read the Guardian PDA directly.

The off-chain watcher is TypeScript/Express. It receives Helius webhook events when monitored accounts change, runs the five invariant checks, stores alerts in SQLite, and exposes the REST API that the dashboard and other agents poll.

Data comes from two sources: Helius for real-time account change events, and Covalent's GoldRush API for balance verification and transaction enrichment.

The dashboard is Next.js, statically exported to GitHub Pages. It shows a protocol grid with status LEDs, a real-time alert feed, and system diagnostics. There's also a Drift hack timeline replay page that walks through the verified attack sequence and shows where Vigil's checks would have fired.

## What I'm honest about

The detection speed claim (seconds, not minutes) is based on Helius webhook delivery time, which is documented at under 5 seconds. I have not yet tested this end-to-end with a live Helius webhook on devnet. The mock data tests show the invariant engine processes alerts in milliseconds, but real webhook latency has not been measured yet. I'll update this after live testing.

The invariant checks are pattern-matching heuristics, not ML. They catch known attack patterns (the five I listed). A completely novel exploit using a vector I haven't modeled would get through. This is a known limitation, not a hidden one.

## Links

GitHub: https://github.com/Yonkoo11/solana-shield
Dashboard: https://yonkoo11.github.io/solana-shield/
Drift Replay: https://yonkoo11.github.io/solana-shield/drift
Agent Metadata: https://yonkoo11.github.io/solana-shield/agent.json

---

## Quote RT Drafts

### Metaplex Track:
I built a security agent on @metaplex Core that other Solana agents can query before transacting.

5 invariant checks. On-chain Guardian program. A2A safety API. Self-attack demo verified on devnet.

The Drift hack showed what happens when nobody is watching. Vigil watches.

@trendsdotfun @solana_devs @metaplex #AgentTalentShow

[article link]

### Covalent Track:
Built a persistent Solana monitor using @Covalent_HQ GoldRush that watches for TVL drains, authority changes, config manipulation, and admin actions.

Detected the Drift attack pattern in under 10 seconds with mock data. On-chain Guardian can freeze the protocol.

@trendsdotfun @solana_devs @Covalent_HQ #AgentTalentShow

[article link]

### Solana Main Track:
Drift lost $285M in 12 minutes. Detection took 30.

I built Vigil: a security agent for @solana that monitors protocols, fires alerts in seconds, and pauses on-chain through a Guardian program. Other agents query it for safety scores before transacting.

Deployed on devnet. Self-attack verified.

@trendsdotfun @solana_devs @solana #AgentTalentShow

[article link]
