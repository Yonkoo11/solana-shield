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

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "border-red-500/50 bg-red-500/5",
  HIGH: "border-orange-500/50 bg-orange-500/5",
  MEDIUM: "border-yellow-500/50 bg-yellow-500/5",
  LOW: "border-blue-500/50 bg-blue-500/5",
};

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-blue-500",
};

const TYPE_LABELS: Record<string, string> = {
  TVL_DROP: "TVL Drop",
  AUTHORITY_CHANGE: "Authority Change",
  LARGE_WITHDRAWAL: "Large Withdrawal",
  CONFIG_CHANGE: "Config Change",
  ADMIN_ACTION: "Admin Action",
};

function timeAgo(timestamp: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(timestamp).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function MonitorPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [count24h, setCount24h] = useState(0);
  const [connected, setConnected] = useState(false);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);

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
      setLastPoll(new Date());
    }

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  const criticalCount = alerts.filter((a) => a.severity === "CRITICAL").length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Connection status */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span
          className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`}
        />
        {connected ? "Connected to watcher" : "Disconnected"}
        {lastPoll && (
          <span className="ml-2">
            Last update: {lastPoll.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Protocols Monitored" value="1" subtitle="Test Vault" />
        <KpiCard
          label="Alerts (24h)"
          value={count24h.toString()}
          subtitle={criticalCount > 0 ? `${criticalCount} critical` : "All clear"}
          alert={criticalCount > 0}
        />
        <KpiCard
          label="Guardian Status"
          value={connected ? "Active" : "Offline"}
          subtitle={connected ? "Monitoring" : "Check watcher"}
          alert={!connected}
        />
        <KpiCard
          label="Detection Speed"
          value="<10s"
          subtitle="Webhook latency"
        />
      </div>

      {/* Alert Feed */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Alert Feed
        </h2>

        {alerts.length === 0 ? (
          <div className="border border-gray-800 rounded-xl p-12 text-center">
            <p className="text-gray-500 text-sm">
              {connected
                ? "No alerts yet. Monitoring active."
                : "Connect to watcher to see alerts."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-enter border rounded-xl p-4 ${SEVERITY_COLORS[alert.severity] || "border-gray-800"} ${alert.severity === "CRITICAL" ? "pulse-critical" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${SEVERITY_DOT[alert.severity] || "bg-gray-500"}`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {TYPE_LABELS[alert.type] || alert.type}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            alert.severity === "CRITICAL"
                              ? "bg-red-500/20 text-red-400"
                              : alert.severity === "HIGH"
                                ? "bg-orange-500/20 text-orange-400"
                                : "bg-gray-700 text-gray-400"
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {alert.details}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">
                      {timeAgo(alert.timestamp)}
                    </p>
                    {alert.txSignature && (
                      <a
                        href={`https://solscan.io/tx/${alert.txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-500 hover:text-emerald-400"
                      >
                        View tx
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  subtitle,
  alert = false,
}: {
  label: string;
  value: string;
  subtitle: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`border rounded-xl p-4 ${alert ? "border-red-500/30 bg-red-500/5" : "border-gray-800 bg-gray-900/50"}`}
    >
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 ${alert ? "text-red-400" : "text-white"}`}
      >
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}
