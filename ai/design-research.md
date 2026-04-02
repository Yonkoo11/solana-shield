# Design Research Brief — Security Monitoring Dashboard

## Product Category
Real-time blockchain security monitoring + on-chain response

## Comparables Studied
1. Datadog Security Monitoring
2. Wiz.io Cloud Security
3. CrowdStrike Falcon
4. Guardrail.ai (DeFi)
5. Linear (non-security, best-in-class dark UI)

## Product Metaphor (from design-lessons.md)
**RADAR / THREAT MAP** — not "dark SaaS dashboard"
- Scanning sweeps, concentric zones, threat indicators that pulse
- Status LEDs that communicate health at a glance
- Think air traffic control, not generic admin panel

## Color Meaning (not just aesthetics)
- **Red (#ff3b3b → #ff6b6b):** Active threat. Appears ONLY on critical alerts and paused states.
- **Amber (#ffb020 → #ffd080):** Warning. Funds at risk. High-severity alerts.
- **Emerald (#00cc88 → #00ffaa):** System healthy. Connected. Unpaused.
- **Cool gray (#8892a0):** Neutral data. Timestamps, labels, secondary text.
- **Background:** NOT pure black. Use #08090d → #0e1117 (deep navy-black with warmth).

Each color has 4 depth variants: deep/muted (backgrounds), core (primary), bright (highlights), glow (ambient rgba 10-15%).

## Common Patterns (table stakes)
- Dark mode as default with deep gray (not black) base
- Severity color hierarchy: red > amber > blue > gray
- Real-time update indicators (pulse on new data, timestamp)
- Monospace for addresses, hashes, transaction data
- Card-based information grouping

## Differentiation Opportunities
1. **Attack chain visualization** — show the Drift timeline as connected nodes, not a flat list
2. **Threat-specific card shapes** — different alert types look different, not uniform rectangles
3. **Scanning/sweeping ambient animation** — subtle radar sweep or pulse that shows "system is alive and watching"
4. **Controlled saturation** — use LCH color space for uniform perceived brightness across accents
5. **Texture** — grain overlay, accent-tinted shadows, micro-gradients on surfaces (anti-AI-slop)

## Stolen Elements (adapt, not copy)
- From **Linear:** LCH color space, 3-variable theming (base, accent, contrast), calm professional feel
- From **CrowdStrike:** Threat graph visualization, attack chain progression view
- From **Datadog:** Multi-panel with independent refresh cadences, clear data density hierarchy

## Anti-Patterns (must avoid)
- Identical KPI cards in a row (current dashboard does this)
- Same card layout for every alert type
- Flat accent colors without depth variants
- No texture (flat color blocks = AI slop)
- Generic rounded-xl everything
- Emerald used for everything highlighted (no meaning)

## Design Constraints
- Static export to GitHub Pages (no server-side rendering)
- Polls watcher API every 5 seconds (not WebSocket)
- Must work disconnected (show meaningful empty state)
- Must look good in demo videos (no tiny text)
- Minimum font size: 13px (WCAG + video readability)
