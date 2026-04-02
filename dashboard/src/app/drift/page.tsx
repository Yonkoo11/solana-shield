"use client";

import { useState } from "react";

// Drift hack timeline — verified data from April 1, 2026
const TIMELINE_EVENTS = [
  {
    time: "~01:00 ET",
    offset: 0,
    title: "Attack begins",
    description:
      "Attacker initiates drain of Drift protocol. 980K SOL moved from Drift vaults.",
    type: "attack" as const,
    shieldDetects: true,
    shieldAlert: "TVL_DROP: 980K SOL drained (>20% TVL). CRITICAL alert fired.",
    detectionDelay: "< 10 seconds",
  },
  {
    time: "~01:05 ET",
    offset: 5,
    title: "SOL converted to JLP tokens",
    description:
      "Attacker swaps stolen SOL into JLP (Jupiter LP) tokens to diversify assets.",
    type: "attack" as const,
    shieldDetects: true,
    shieldAlert:
      "LARGE_WITHDRAWAL: Massive outflow detected from monitored accounts.",
    detectionDelay: "< 10 seconds",
  },
  {
    time: "~01:15 ET",
    offset: 15,
    title: "JLP converted to USDC",
    description: "Attacker liquidates JLP positions into USDC stablecoin.",
    type: "attack" as const,
    shieldDetects: false,
    shieldAlert: null,
    detectionDelay: null,
  },
  {
    time: "~01:20 ET",
    offset: 20,
    title: "USDC bridged to Ethereum",
    description:
      "Attacker bridges USDC from Solana to Ethereum via Wormhole bridge.",
    type: "bridge" as const,
    shieldDetects: false,
    shieldAlert: null,
    detectionDelay: null,
  },
  {
    time: "~01:30 ET",
    offset: 30,
    title: "Lookonchain detects anomaly",
    description:
      "Blockchain analytics firm Lookonchain tweets about suspicious Drift activity. PeckShield confirms.",
    type: "detection" as const,
    shieldDetects: false,
    shieldAlert: null,
    detectionDelay: null,
  },
  {
    time: "~01:45 ET",
    offset: 45,
    title: "19,913 ETH purchased",
    description:
      "Attacker converts bridged USDC to ~19,913 ETH on Ethereum mainnet.",
    type: "attack" as const,
    shieldDetects: false,
    shieldAlert: null,
    detectionDelay: null,
  },
  {
    time: "~02:00+ ET",
    offset: 60,
    title: "Drift team responds",
    description:
      "Drift team begins incident response. Total estimated loss: $200M-$285M (disputed).",
    type: "response" as const,
    shieldDetects: false,
    shieldAlert: null,
    detectionDelay: null,
  },
];

const TYPE_COLORS = {
  attack: "border-red-500 bg-red-500",
  bridge: "border-yellow-500 bg-yellow-500",
  detection: "border-blue-500 bg-blue-500",
  response: "border-purple-500 bg-purple-500",
};

export default function DriftReplayPage() {
  const [activeEvent, setActiveEvent] = useState<number | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Drift Protocol Exploit</h1>
        <p className="text-gray-400 text-sm">
          April 1, 2026 - Timeline reconstruction showing where Solana Shield
          would have detected the attack.
        </p>
        <div className="flex gap-4 mt-4">
          <Stat label="Total Loss" value="$200M-285M" color="text-red-400" />
          <Stat label="Detection (Actual)" value="~30 min" color="text-yellow-400" />
          <Stat label="Detection (Shield)" value="<10 sec" color="text-emerald-400" />
          <Stat label="Response Gap" value="~60 min" color="text-red-400" />
        </div>
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
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: "2%" }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Lookonchain/PeckShield (manual)</span>
              <span className="text-yellow-400">~30 minutes</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 rounded-full"
                style={{ width: "50%" }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Drift team response</span>
              <span className="text-red-400">~60 minutes</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full"
                style={{ width: "100%" }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">
          Attack Timeline
        </h3>

        {/* Vertical line */}
        <div className="absolute left-4 top-12 bottom-0 w-px bg-gray-800" />

        <div className="space-y-6">
          {TIMELINE_EVENTS.map((event, i) => (
            <div
              key={i}
              className="relative pl-12 cursor-pointer"
              onClick={() => setActiveEvent(activeEvent === i ? null : i)}
            >
              {/* Dot on timeline */}
              <div
                className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 ${TYPE_COLORS[event.type]}`}
              />

              <div
                className={`border rounded-xl p-4 transition-all ${
                  activeEvent === i
                    ? "border-gray-600 bg-gray-900"
                    : "border-gray-800/50 hover:border-gray-700"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-mono">
                      {event.time}
                    </p>
                    <p className="font-semibold text-sm mt-0.5">
                      {event.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {event.description}
                    </p>
                  </div>

                  {event.shieldDetects && (
                    <span className="shrink-0 ml-3 text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Shield detects
                    </span>
                  )}
                </div>

                {/* Shield alert detail (shown on click) */}
                {activeEvent === i && event.shieldAlert && (
                  <div className="mt-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <p className="text-xs text-emerald-400 font-mono">
                      {event.shieldAlert}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Detection latency: {event.detectionDelay}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="border border-gray-800 rounded-xl p-4 text-xs text-gray-500">
        <p>
          <strong className="text-gray-400">Note:</strong> The exact cause of the
          Drift exploit is unconfirmed as of this writing. This timeline is
          reconstructed from on-chain data and public reporting by Lookonchain and
          PeckShield. Solana Shield detection estimates are based on webhook
          latency measurements from Helius API (&lt;5 second typical delivery).
        </p>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
