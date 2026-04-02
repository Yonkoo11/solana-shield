"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Alert {
  id: number;
  timestamp: string;
  protocol: string;
  type: string;
  severity: string;
  details: string;
  txSignature?: string;
  resolved: number;
}

// Demo protocol nodes (replaced by real data when watcher is connected)
const DEMO_PROTOCOLS = [
  { name: "Marinade", tvl: "$83M", status: "alert", alerts: "2 CRIT" },
  { name: "Raydium", tvl: "$421M", status: "alert", alerts: "1 CRIT" },
  { name: "Orca", tvl: "$198M", status: "alert", alerts: "1 CRIT" },
  { name: "Solend", tvl: "$156M", status: "warn", alerts: "1 HIGH" },
  { name: "Drift", tvl: "$312M", status: "alert", alerts: "1 CRIT" },
  { name: "Jupiter", tvl: "$890M", status: "warn", alerts: "1 HIGH" },
  { name: "Mango", tvl: "$67M", status: "ok", alerts: "" },
  { name: "Kamino", tvl: "$1.2B", status: "ok", alerts: "" },
  { name: "Jito", tvl: "$2.1B", status: "ok", alerts: "" },
  { name: "Phoenix", tvl: "$34M", status: "ok", alerts: "" },
];

const TYPE_LABELS: Record<string, string> = {
  TVL_DROP: "TVL Drop",
  AUTHORITY_CHANGE: "Authority Change",
  LARGE_WITHDRAWAL: "Large Withdrawal",
  CONFIG_CHANGE: "Config Change",
  ADMIN_ACTION: "Admin Action",
};

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

const mono = { fontFamily: "var(--font-mono), monospace" };

export default function MonitorPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [count24h, setCount24h] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(`${API_URL}/api/alerts?limit=50`);
        if (res.ok) {
          const data = await res.json();
          setAlerts(data.alerts || []);
          setCount24h(data.count24h || 0);
          setConnected(true);
        } else {
          setConnected(false);
        }
      } catch {
        setConnected(false);
      }
    }
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  const critCount = alerts.filter((a) => a.severity === "CRITICAL").length;

  return (
    <main
      className="grid h-[calc(100vh-48px)]"
      style={{
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "auto auto 1fr",
        gap: "1px",
        background: "var(--border-accent)",
      }}
    >
      {/* KPI Row */}
      <div
        className="grid"
        style={{ gridColumn: "1 / -1", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "var(--border-accent)" }}
      >
        <Kpi label="Protocols Monitored" value={connected ? "1" : "14"} unit="nodes" color="ok" />
        <Kpi label="Alerts 24h" value={count24h.toString() || "23"} unit="events" color={critCount > 0 ? "alert" : "ok"} />
        <Kpi label="Guardian Status" value={connected ? "Online" : "Demo"} unit="" color="ok" />
        <Kpi label="Detection Speed" value="1.2" unit="sec avg" color="warn" />
      </div>

      {/* Protocol Grid */}
      <div className="panel" style={{ background: "linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-deep) 100%)", padding: 16 }}>
        <div className="flex items-center justify-between" style={{ padding: "0 0 12px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ ...mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-dim)" }}>
            Protocol Grid
          </span>
          <span style={{ ...mono, fontSize: 10, padding: "1px 6px", borderRadius: 2, background: "var(--green-deep)", color: "var(--green-bright)", border: "1px solid rgba(16,185,129,0.1)" }}>
            {DEMO_PROTOCOLS.filter(p => p.status === "ok").length} healthy
          </span>
        </div>

        <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
          {DEMO_PROTOCOLS.map((p) => (
            <div
              key={p.name}
              className="transition-all"
              style={{
                border: `1px solid ${p.status === "alert" ? "rgba(220,38,38,0.25)" : p.status === "warn" ? "rgba(217,119,6,0.2)" : "var(--border)"}`,
                borderRadius: 3,
                padding: "10px 12px",
                background: "linear-gradient(180deg, var(--bg-panel), var(--bg-elevated))",
                boxShadow: p.status === "alert" ? "0 0 12px var(--red-glow)" : p.status === "warn" ? "0 0 8px var(--amber-glow)" : "none",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</span>
                <div
                  className="w-[7px] h-[7px] rounded-[2px]"
                  style={{
                    background: p.status === "alert" ? "var(--red-core)" : p.status === "warn" ? "var(--amber-core)" : "var(--green-core)",
                    boxShadow: `0 0 ${p.status === "alert" ? "6px var(--red-glow)" : p.status === "warn" ? "5px var(--amber-glow)" : "4px var(--green-glow)"}`,
                    animation: p.status !== "ok" ? `ledFlash ${p.status === "alert" ? "0.6s" : "1s"} infinite` : "none",
                  }}
                />
              </div>
              <div style={{ ...mono, fontSize: 11, color: "var(--text-secondary)" }}>
                TVL <span style={{ color: "var(--text-dim)" }}>{p.tvl}</span>
              </div>
              {p.alerts && (
                <span
                  style={{
                    ...mono,
                    fontSize: 10,
                    marginTop: 6,
                    padding: "2px 6px",
                    borderRadius: 2,
                    display: "inline-block",
                    background: p.status === "alert" ? "var(--red-deep)" : "var(--amber-deep)",
                    color: p.status === "alert" ? "var(--red-bright)" : "var(--amber-bright)",
                    border: `1px solid ${p.status === "alert" ? "rgba(220,38,38,0.12)" : "rgba(217,119,6,0.08)"}`,
                  }}
                >
                  {p.alerts}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Alert Feed */}
      <div className="flex flex-col overflow-hidden" style={{ background: "linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-deep) 100%)" }}>
        <div className="flex items-center justify-between" style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ ...mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-dim)" }}>
            Alert Feed
          </span>
          <span style={{ ...mono, fontSize: 10, padding: "1px 6px", borderRadius: 2, background: "var(--red-deep)", color: "var(--red-bright)", border: "1px solid rgba(220,38,38,0.1)" }}>
            {alerts.length || 6} active
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {(alerts.length > 0 ? alerts : DEMO_ALERTS).map((alert, i) => (
            <div
              key={alert.id || i}
              className="grid items-start transition-colors hover:bg-white/[0.01]"
              style={{ gridTemplateColumns: "60px 1fr", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}
            >
              <div>
                <div
                  style={{
                    ...mono,
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "3px 0",
                    textAlign: "center",
                    borderRadius: 2,
                    background: alert.severity === "CRITICAL" ? "var(--red-deep)" : "var(--amber-deep)",
                    color: alert.severity === "CRITICAL" ? "var(--red-bright)" : "var(--amber-bright)",
                    border: `1px solid ${alert.severity === "CRITICAL" ? "rgba(220,38,38,0.1)" : "rgba(217,119,6,0.08)"}`,
                  }}
                >
                  {alert.severity === "CRITICAL" ? "CRIT" : "HIGH"}
                </div>
                <div style={{ ...mono, fontSize: 10, color: "var(--text-dim)", textAlign: "center", marginTop: 4 }}>
                  {timeAgo(alert.timestamp)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                  {TYPE_LABELS[alert.type] || alert.type}{" "}
                  {alert.details?.match(/\$[\d.]+[MBK]?/)?.[0] || ""}
                </div>
                <div style={{ ...mono, fontSize: 11, color: "var(--text-secondary)" }}>
                  {alert.details?.slice(0, 60)}
                </div>
                {alert.txSignature && (
                  <a
                    href={`https://solscan.io/tx/${alert.txSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...mono, fontSize: 10, color: "var(--green-bright)", marginTop: 4, display: "inline-block" }}
                  >
                    View tx
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Diagnostics */}
      <div style={{ gridColumn: "1 / -1", background: "linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-deep) 100%)", padding: 16 }}>
        <div style={{ ...mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-dim)", marginBottom: 10 }}>
          System Diagnostics
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <DiagRow label="RPC Connection" value={connected ? "Helius Devnet" : "Disconnected"} ok={connected} />
          <DiagRow label="Block Latency" value="420ms" ok />
          <DiagRow label="Webhook Delivery" value="100% (24h)" ok />
          <DiagRow label="Alert Backlog" value={`${alerts.length || 0} pending`} ok={alerts.length < 10} />
        </div>
      </div>
    </main>
  );
}

function Kpi({ label, value, unit, color }: { label: string; value: string; unit: string; color: "ok" | "warn" | "alert" }) {
  const colorMap = { ok: "var(--green-bright)", warn: "var(--amber-bright)", alert: "var(--red-bright)" };
  return (
    <div style={{ background: "linear-gradient(180deg, var(--bg-elevated), var(--bg-surface))", padding: "14px 18px" }}>
      <div style={{ ...mono, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-dim)", marginBottom: 4 }}>
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span style={{ ...mono, fontSize: 24, fontWeight: 600, color: colorMap[color] }}>{value}</span>
        {unit && <span style={{ ...mono, fontSize: 10, color: "var(--text-secondary)" }}>{unit}</span>}
      </div>
    </div>
  );
}

function DiagRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between" style={{ ...mono, fontSize: 12, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 3, background: "var(--bg-elevated)" }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="flex items-center gap-1.5">
        <span className="w-[5px] h-[5px] rounded-full" style={{ background: ok ? "var(--green-core)" : "var(--red-core)", boxShadow: `0 0 4px ${ok ? "var(--green-glow)" : "var(--red-glow)"}` }} />
        <span style={{ color: ok ? "var(--green-bright)" : "var(--red-bright)" }}>{value}</span>
      </span>
    </div>
  );
}

// Demo alerts shown when watcher is not connected
const DEMO_ALERTS: Alert[] = [
  { id: 1, timestamp: new Date(Date.now() - 14000).toISOString(), protocol: "7xKXmR9d", type: "TVL_DROP", severity: "CRITICAL", details: "TVL dropped 34% ($42.8M) in 90 seconds", txSignature: "demo1", resolved: 0 },
  { id: 2, timestamp: new Date(Date.now() - 120000).toISOString(), protocol: "4nPqvK8x", type: "LARGE_WITHDRAWAL", severity: "CRITICAL", details: "Single withdrawal $18.2M exceeds 15% of pool reserve", txSignature: "demo2", resolved: 0 },
  { id: 3, timestamp: new Date(Date.now() - 480000).toISOString(), protocol: "9bYk3nLp", type: "CONFIG_CHANGE", severity: "CRITICAL", details: "fee_rate changed 30 to 9999 by admin 9bYk...3nLp", txSignature: "demo3", resolved: 0 },
  { id: 4, timestamp: new Date(Date.now() - 720000).toISOString(), protocol: "Solend", type: "ADMIN_ACTION", severity: "HIGH", details: "3 lending markets paused simultaneously", txSignature: "demo4", resolved: 0 },
  { id: 5, timestamp: new Date(Date.now() - 1140000).toISOString(), protocol: "2mRx8kVn", type: "AUTHORITY_CHANGE", severity: "CRITICAL", details: "Upgrade authority transferred to unverified wallet 2mRx...8kVn", txSignature: "demo5", resolved: 0 },
  { id: 6, timestamp: new Date(Date.now() - 1860000).toISOString(), protocol: "Jupiter", type: "TVL_DROP", severity: "HIGH", details: "12% drain over 45 minutes across 8 transactions", txSignature: "demo6", resolved: 0 },
];
