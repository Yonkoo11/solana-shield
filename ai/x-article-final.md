# HOW TO PUBLISH THIS ON X

## Step 1: Set the title
Delete "(Needs title)" and type:
Vigil: an on-chain guardian protocol for Solana. The Drift hack proved why it matters.

## Step 2: Upload cover image
Click the image placeholder at the top. Upload: article-images/1-cover.png

## Step 3: Section headers
For each section header, select the text and change from "Body" to "Heading" using the toolbar dropdown.

## Step 4: Insert images at these exact points
- After "That's Vigil." paragraph, insert: article-images/2-dashboard.png
- After "...walks through the verified attack sequence and shows where each invariant would have fired." insert: article-images/3-drift-replay.png

## Step 5: Hyperlink the URLs
Select each URL in the Links section and use the chain icon to make them clickable.

===ARTICLE TEXT START===

Vigil: an on-chain guardian protocol for Solana. The Drift hack proved why it matters.

99% of Solana protocols have zero runtime monitoring. Audits happen before deployment. Once the code is live, nobody is watching what happens on-chain in real time. If an admin key gets compromised, if withdrawal limits get changed to something absurd, if TVL starts draining, there's no system that catches it and reacts. Teams find out from Lookonchain tweets, 30 minutes after the damage is done.

I've been thinking about this gap for a while. Static audits are necessary but they only check code at a point in time. Runtime is where the actual attacks happen. The question I kept coming back to: what if a protocol could have an always-on watcher that detects exploit patterns and lets the team freeze things in seconds, not hours?

That's Vigil. An on-chain Guardian program paired with an off-chain watcher that monitors protocol accounts in real time. When it detects something wrong, it fires an alert. The team clicks one button and the Guardian program pauses the protocol on-chain. No more withdrawals until the team reviews and unpauses.

[INSERT IMAGE: article-images/2-dashboard.png]

What it monitors

Vigil checks five invariants right now:

1. TVL dropping past a configurable threshold in a single transaction
2. Authority or upgrade key being transferred to an unknown wallet
3. Protocol configuration changes like withdrawal limits being modified
4. Admin-level actions like new asset listings or program upgrades
5. Unusually large withdrawals relative to pool size

The Guardian program is written in Rust/Anchor. It stores per-protocol pause state as PDAs. Integrated protocols just read the Guardian's is_paused flag before executing critical operations. If paused, the transaction reverts.

I deliberately did not build auto-pause. If the invariant engine has a false positive and auto-freezes a lending protocol during high volatility, liquidations stop. Bad debt piles up. The pause itself causes more damage than the attack. V1 detects and alerts. A human decides. Auto-pause is a V2 problem, after the detection logic proves itself in production.

Then Drift happened

On April 1, an attacker drained $285M from Drift Protocol in 12 minutes. TVL went from $309M to $41M.

The attacker had spent weeks preparing. They deployed a fake token called CarbonVote ($CVT), wash-traded it to build a fake price history, then phished admin keys using Solana's durable nonce mechanism. On execution day, they raised withdrawal limits to $500 trillion, deposited worthless $CVT as collateral, and borrowed every real asset out of every vault.

Trail of Bits audited Drift in 2022. ClawSecure audited it in February 2026. Neither caught this vector.

Every one of those attack steps maps to an invariant Vigil already checks. The admin key transfer. The withdrawal limit change to $500 trillion. The phantom token listing. The 87% TVL drain. Each one would have fired a CRITICAL alert within seconds of execution, not 30 minutes later.

I'm not claiming Vigil would have prevented the social engineering that got the admin keys compromised. That happened off-chain and no monitoring tool catches phishing. But the moment those keys were used on-chain to modify the protocol, every action was detectable. Detection gives the team time to respond. Time is the difference between $285M lost and $285M saved.

How other agents use it

Other agents can query Vigil for safety scores before they transact.

A GET request to /api/safety returns a risk score from 0 to 100, the current status (SAFE, WARNING, or CRITICAL), active alerts, and a recommendation (PROCEED, CAUTION, or AVOID).

A trading bot checks this before swapping on a DEX. A yield optimizer checks before depositing into a pool. If the risk score is high, the agent skips that protocol and routes elsewhere. The safety data feeds into their execution logic directly.

I registered Vigil as a Metaplex Core NFT on devnet. It has on-chain identity, discoverable metadata, and a service spec that describes its endpoints. Other agents can look it up in the registry and know what it offers.

What's deployed

All of this is live on Solana devnet.

I ran a self-attack demo: deposited 10 SOL into a test vault, then withdrew 8 SOL in one transaction (80% TVL drain). The watcher detected it, the alert fired, I paused the Guardian, and the next withdrawal attempt failed with "Protocol is paused by Guardian."

You can verify the attack transaction on Solscan (devnet). All program IDs, the agent NFT address, and transaction hashes are in the GitHub README.

15 Anchor tests cover the Guardian lifecycle, vault integration, and authorization checks. Wrong signers get rejected. Double-pause gets rejected. Auto-unpause crank works after the timeout.

How it's built

Two Anchor programs on-chain. The Guardian handles pause/unpause/auto-unpause with per-protocol PDAs. The Test Vault checks the Guardian's state before allowing withdrawals. No CPI needed since Anchor validates the account owner.

Off-chain watcher in TypeScript/Express. Receives Helius webhook events, runs the five invariant checks, stores alerts in SQLite, exposes the REST API. Data enriched by Covalent's GoldRush API for balance verification.

Dashboard is Next.js on GitHub Pages. Shows a protocol grid with status LEDs, real-time alert feed, and a Drift hack timeline replay that walks through the verified attack sequence and shows where each invariant would have fired.

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
