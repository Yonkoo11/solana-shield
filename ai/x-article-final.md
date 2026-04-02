# HOW TO PUBLISH THIS ON X

## Step 1: Set the title
Delete "(Needs title)" and type:
I built a security agent for Solana after watching Drift lose $285M

## Step 2: Upload cover image
Click the image placeholder at the top. Upload: article-images/1-cover.png

## Step 3: Remove all # and ## symbols
X Articles don't use markdown. Remove every # symbol. The section headers (What it actually does, How other agents use it, etc.) should be selected and changed to "Heading" using the dropdown that currently says "Body" in the toolbar.

## Step 4: Copy the article text below (everything between the === lines)
Remove the #/## symbols as you paste. Use the "Heading" dropdown for section titles.

## Step 5: Insert images at these exact points
- After "So I built Vigil." insert: article-images/2-dashboard.png
- After "...where Vigil's checks would have fired." insert: article-images/3-drift-replay.png

## Step 6: Hyperlink the URLs
Select each URL text and use the link button (chain icon) to make them clickable:
- "verify the attack transaction on Solscan" links to: https://solscan.io/tx/3VuahxbLR9361Uxzw7JPDdCgZwZBbK5weFvawwU4YHXZo6qNJeNqQE54BXA1CTAjME9Ew4H5Sg2eAYTBxsib6tBC?cluster=devnet
- GitHub link
- Dashboard link
- Drift Replay link
- Agent Metadata link

===ARTICLE TEXT START===

I built a security agent for Solana after watching Drift lose $285M

The Drift hack on April 1 made me angry. Not because of the money. Because it was preventable.

An attacker spent weeks setting up the hit. They deployed a fake token called CarbonVote ($CVT), wash-traded it to build a fake price history, then phished admin keys using Solana's durable nonce mechanism. On execution day, they raised withdrawal limits to $500 trillion, deposited worthless $CVT as collateral, and borrowed every real asset out of every vault. USDC, JLP, cbBTC, USDT. Everything.

$309M in TVL went to $41M in 12 minutes.

Lookonchain noticed 30 minutes after it started. The Drift team responded after about an hour. The funds were already on Ethereum by then.

Here's what gets me: Trail of Bits audited Drift in 2022. ClawSecure audited it again in February 2026. Two respected firms. Both gave it passing grades. And neither caught this vector. Because this wasn't a code bug you find by reading source files. This was a runtime attack that exploited how the protocol was administered.

Audits check code. Nobody was checking what happened on-chain in real time.

So I built Vigil.

[INSERT IMAGE: article-images/2-dashboard.png]

What it actually does

Vigil watches Solana protocol accounts for patterns that indicate an exploit in progress. Right now it checks five things:

1. TVL dropping past a threshold in a single transaction (Drift lost 87% of TVL)
2. Authority or upgrade key being transferred to an unknown wallet (Drift's admin keys were compromised)
3. Protocol configuration changes like withdrawal limits being modified (Drift's limits were set to $500 trillion)
4. Admin-level actions like new asset listings or program upgrades (Drift had a phantom token listed as valid collateral)
5. Unusually large withdrawals relative to pool size

When any of these triggers, an alert goes to Telegram within seconds. The protocol team sees it in the dashboard and can pause the protocol with one click. That pause happens on-chain through a Guardian program I wrote in Rust/Anchor. The Guardian stores per-protocol pause state as PDAs. Integrated protocols check is_paused before executing critical operations like withdrawals.

I deliberately did not build auto-pause. If the invariant engine has a false positive and auto-freezes a lending protocol during high volatility, liquidations stop. Bad debt piles up. The pause itself causes more damage than the attack. V1 detects and alerts. A human decides. Auto-pause is a V2 problem, after the detection logic proves it has zero false positives in production.

How other agents use it

The piece I'm most interested in: other agents can query Vigil for safety scores before they transact.

A GET request to /api/safety returns a risk score from 0 to 100, the current status (SAFE, WARNING, or CRITICAL), a list of active alerts, and a recommendation (PROCEED, CAUTION, or AVOID).

A trading bot checks this before swapping on a DEX. A yield optimizer checks before depositing into a pool. If the risk score is high, the agent skips that protocol and routes elsewhere.

This is what turns Vigil from a monitoring dashboard into something other agents can actually depend on. The safety data feeds directly into their execution logic.

I registered Vigil as a Metaplex Core NFT on devnet. It has on-chain identity, discoverable metadata, and a service spec that describes its endpoints. Other agents can look it up in the registry and know what it offers.

What's deployed

All of this is live on Solana devnet. Not mockups.

I ran a self-attack demo: deposited 10 SOL into a test vault, then withdrew 8 SOL in one transaction (80% TVL drain). The watcher detected it, the alert fired, I paused the Guardian, and the next withdrawal attempt failed with "Protocol is paused by Guardian."

You can verify the attack transaction on Solscan (devnet). All program IDs, the agent NFT address, and transaction hashes are in the GitHub README.

15 Anchor tests cover the Guardian lifecycle, vault integration, and authorization checks. Wrong signers get rejected. Double-pause gets rejected. Auto-unpause crank works after the timeout.

How it's built

Two Anchor programs on-chain. The Guardian handles pause/unpause/auto-unpause with per-protocol PDAs. The Test Vault checks the Guardian's state before allowing withdrawals. No CPI needed since Anchor validates the account owner.

Off-chain watcher in TypeScript/Express. Receives Helius webhook events, runs the five invariant checks, stores alerts in SQLite, exposes the REST API. Data enriched by Covalent's GoldRush API for balance verification.

Dashboard is Next.js on GitHub Pages. Shows a protocol grid with status LEDs, real-time alert feed, and a Drift hack timeline replay that walks through the verified attack sequence.

[INSERT IMAGE: article-images/3-drift-replay.png]

What I'm honest about

The detection speed claim (seconds, not minutes) is based on Helius webhook delivery time, documented at under 5 seconds. I have not yet tested this end-to-end with a live webhook on devnet. The mock data tests show the invariant engine processes in milliseconds, but real webhook latency has not been measured. I'll update after live testing.

The invariant checks are pattern-matching heuristics, not ML. They catch known attack patterns. A completely novel exploit using a vector I haven't modeled would get through. Known limitation, not a hidden one.

Links

GitHub: https://github.com/Yonkoo11/solana-shield
Dashboard: https://yonkoo11.github.io/solana-shield/
Drift Replay: https://yonkoo11.github.io/solana-shield/drift
Agent Metadata: https://yonkoo11.github.io/solana-shield/agent.json

===ARTICLE TEXT END===
