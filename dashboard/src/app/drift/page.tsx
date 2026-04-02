"use client";

import { useState } from "react";

// Drift hack timeline — cross-referenced against multiple sources
// Primary: MEXC analysis, Phemex report, CoinDesk, The Block, DLNews
const TIMELINE_EVENTS = [
  {
    time: "~3 weeks before",
    title: "Phantom token deployed",
    description:
      "Attacker deploys CarbonVote Token ($CVT) on Solana. Injects $500 of liquidity and wash-trades to build a fake but stable oracle price history over several weeks.",
    type: "recon" as const,
    shieldDetects: false,
    shieldAlert: null,
    detectionDelay: null,
    verified: true,
    source: "MEXC analysis",
  },
  {
    time: "Days before",
    title: "Admin keys compromised via durable nonces",
    description:
      "Attacker uses phishing to get admin signers to pre-sign transactions using Solana's durable nonce mechanism. This allows offline pre-signing of transactions that execute later.",
    type: "recon" as const,
    shieldDetects: false,
    shieldAlert: null,
    detectionDelay: null,
    verified: true,
    source: "Phemex: 'sophisticated phishing attack exploiting durable nonce offline pre-signature mechanism'",
  },
  {
    time: "Apr 1 — T+0",
    title: "Admin takeover executed",
    description:
      "Pre-signed transactions execute using compromised admin access. Attacker gains control of protocol admin functions.",
    type: "attack" as const,
    shieldDetects: true,
    shieldAlert:
      "AUTHORITY_CHANGE: Admin privilege transfer detected on Drift protocol. CRITICAL.",
    detectionDelay: "< 10 seconds",
    verified: true,
    source: "Multiple sources confirm admin key compromise",
  },
  {
    time: "Apr 1 — T+1 min",
    title: "Fake token listed + withdrawal limits removed",
    description:
      "Using admin access, attacker lists worthless $CVT on Drift's spot market. Raises withdrawal limits to $500 trillion. Deposits 7.85M $CVT as 'collateral.'",
    type: "attack" as const,
    shieldDetects: true,
    shieldAlert:
      "CONFIG_CHANGE: Withdrawal limits changed to abnormal value ($500T). New unverified asset listed. CRITICAL.",
    detectionDelay: "< 10 seconds",
    verified: true,
    source: "MEXC: 'artificially raised withdrawal limits to an absurd $500 trillion'",
  },
  {
    time: "Apr 1 — T+2 min",
    title: "All vaults systematically drained",
    description:
      "Attacker borrows real assets (USDC, JLP, cbBTC, USDT) against worthless $CVT collateral. TVL drops from $309M to $41M in 12 minutes.",
    type: "attack" as const,
    shieldDetects: true,
    shieldAlert:
      "TVL_DROP: 87% TVL drain across all monitored vaults ($309M to $41M). Multiple CRITICAL alerts.",
    detectionDelay: "< 10 seconds",
    verified: true,
    source: "MEXC: 'TVL collapsed from $309M to $41M in 12 minutes'",
  },
  {
    time: "Apr 1 — T+15 min",
    title: "Funds bridged to Ethereum via CCTP",
    description:
      "Stolen assets swapped via Jupiter, then bridged to Ethereum using Circle's Cross-Chain Transfer Protocol.",
    type: "bridge" as const,
    shieldDetects: false,
    shieldAlert: null,
    detectionDelay: null,
    verified: true,
    source: "Multiple sources confirm CCTP bridge to ETH",
  },
  {
    time: "Apr 1 — ~T+30 min",
    title: "Lookonchain/PeckShield detect anomaly",
    description:
      "On-chain analytics firms tweet about suspicious Drift activity. Manual detection about 30 minutes after attack execution began.",
    type: "detection" as const,
    shieldDetects: false,
    shieldAlert: null,
    detectionDelay: null,
    verified: true,
    source: "CoinDesk, The Block",
  },
  {
    time: "Apr 1 — ~T+60 min",
    title: "Drift team: \"This is not an April Fools joke\"",
    description:
      "Team confirms the exploit. Suspends deposits and withdrawals. Coordinates with security firms, bridges, and exchanges.",
    type: "response" as const,
    shieldDetects: false,
    shieldAlert: null,
    detectionDelay: null,
    verified: true,
    source: "Drift Protocol official statement",
  },
];

const TYPE_COLORS = {
  recon: "border-purple-500 bg-purple-500",
  attack: "border-red-500 bg-red-500",
  bridge: "border-yellow-500 bg-yellow-500",
  detection: "border-blue-500 bg-blue-500",
  response: "border-gray-400 bg-gray-400",
};

const TYPE_LABELS = {
  recon: "Preparation",
  attack: "Attack",
  bridge: "Fund Movement",
  detection: "Manual Detection",
  response: "Team Response",
};

export default function DriftReplayPage() {
  const [activeEvent, setActiveEvent] = useState<number | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Drift Protocol Exploit</h1>
        <p className="text-gray-400 text-sm">
          April 1, 2026 — Admin key compromise via durable nonce phishing +
          phantom token oracle manipulation. $285M drained in 12 minutes.
        </p>
        <div className="flex gap-4 mt-4 flex-wrap">
          <Stat label="Total Loss" value="$285M" color="text-red-400" />
          <Stat label="Attack Vector" value="Phishing + Oracle" color="text-purple-400" />
          <Stat label="Detection (Actual)" value="~30 min" color="text-yellow-400" />
          <Stat label="Detection (Shield)" value="<10 sec" color="text-emerald-400" />
          <Stat label="Drain Duration" value="12 min" color="text-red-400" />
        </div>
      </div>

      {/* Key insight */}
      <div className="border border-emerald-500/20 rounded-xl p-6 bg-emerald-500/5">
        <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2">
          Where Shield Would Have Caught It
        </h3>
        <p className="text-sm text-gray-300">
          Three on-chain signals fire within seconds of the attack starting: the{" "}
          <strong className="text-white">admin privilege transfer</strong>, the{" "}
          <strong className="text-white">withdrawal limit change to $500 trillion</strong>, and
          the <strong className="text-white">87% TVL drain</strong>. Any one of these is a CRITICAL
          alert. Together, they give a protocol team{" "}
          <strong className="text-emerald-400">minutes of warning</strong> before the damage is
          complete — vs the 30+ minutes it took for manual detection.
        </p>
      </div>

      {/* Comparison bar */}
      <div className="border border-gray-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Detection Timeline Comparison
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Solana Shield (automated)</span>
              <span className="text-emerald-400">&lt;10 seconds</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: "2%" }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Lookonchain/PeckShield (manual)</span>
              <span className="text-yellow-400">~30 minutes</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500 rounded-full" style={{ width: "50%" }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Drift team response</span>
              <span className="text-red-400">~60 minutes</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        {Object.entries(TYPE_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${TYPE_COLORS[key as keyof typeof TYPE_COLORS]}`} />
            {label}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Shield detects
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">
          Attack Timeline
        </h3>
        <div className="absolute left-4 top-12 bottom-0 w-px bg-gray-800" />
        <div className="space-y-4">
          {TIMELINE_EVENTS.map((event, i) => (
            <div
              key={i}
              className="relative pl-12 cursor-pointer"
              onClick={() => setActiveEvent(activeEvent === i ? null : i)}
            >
              <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 ${TYPE_COLORS[event.type]}`} />
              <div className={`border rounded-xl p-4 transition-all ${activeEvent === i ? "border-gray-600 bg-gray-900" : "border-gray-800/50 hover:border-gray-700"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-gray-500 font-mono">{event.time}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        event.type === "attack" ? "bg-red-500/20 text-red-400" :
                        event.type === "recon" ? "bg-purple-500/20 text-purple-400" :
                        "bg-gray-700 text-gray-400"
                      }`}>
                        {TYPE_LABELS[event.type]}
                      </span>
                    </div>
                    <p className="font-semibold text-sm mt-1">{event.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{event.description}</p>
                  </div>
                  {event.shieldDetects && (
                    <span className="shrink-0 ml-3 text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Shield detects
                    </span>
                  )}
                </div>
                {activeEvent === i && event.shieldAlert && (
                  <div className="mt-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-xs text-emerald-400 font-mono">{event.shieldAlert}</p>
                    <p className="text-xs text-gray-500 mt-1">Detection latency: {event.detectionDelay}</p>
                  </div>
                )}
                {activeEvent === i && event.source && (
                  <p className="text-xs text-gray-600 mt-2 italic">Source: {event.source}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Root cause */}
      <div className="border border-gray-800 rounded-xl p-6 space-y-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Root Cause Analysis
        </h3>
        <p className="text-sm text-gray-300">
          The attack combined <strong className="text-white">social engineering</strong> (phishing admin
          signers via durable nonces) with <strong className="text-white">protocol exploitation</strong> (phantom
          token with fabricated oracle history used as collateral). This was not
          purely a &quot;human error&quot; — the protocol allowed a new, thinly-traded token
          to be listed and used as collateral for borrowing real assets.
        </p>
        <p className="text-sm text-gray-300">
          Solana Shield cannot prevent phishing. But it detects every on-chain
          consequence within seconds: the admin privilege transfer, the abnormal
          withdrawal limit change, and the vault drains. With Guardian&apos;s on-chain
          pause, the team could freeze the protocol before the drain completes.
        </p>
        <p className="text-sm text-gray-300">
          Prior audits by Trail of Bits (2022) and ClawSecure (February 2026)
          did not catch this vector. Runtime monitoring catches what static
          audits miss.
        </p>
      </div>

      {/* Source */}
      <div className="border border-gray-800 rounded-xl p-4 text-xs text-gray-500 space-y-1">
        <p><strong className="text-gray-400">Sources:</strong></p>
        <p>MEXC Analysis: &quot;Drift Protocol Hack: How $285M Was Drained From Solana DEX&quot;</p>
        <p>Phemex: &quot;Durable Nonce Exploit Targets Drift&apos;s Admin Privileges&quot;</p>
        <p>CoinDesk, The Block, DLNews: Initial reporting and Drift team statements</p>
        <p className="text-gray-600 mt-2">
          Note: Some details (exact multisig config, precise pre-attack dates)
          remain unconfirmed pending Drift&apos;s full post-mortem. Timeline is
          reconstructed from on-chain data and published reporting.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
