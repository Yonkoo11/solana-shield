import express from "express";
import cors from "cors";
import { initDb, getAlerts, getAlertCount24h } from "./db";
import { handleHeliusWebhook, setMonitoredProtocols, getMonitoredProtocols } from "./webhook";
import { ProtocolConfig } from "./types";

const PORT = parseInt(process.env.PORT || "3001", 10);
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Helius payloads can be large

// ─── Routes ─────────────────────────────────────────────────────────────

// Health check
app.get("/api/status", (_req, res) => {
  const protocols = getMonitoredProtocols();
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    protocols_monitored: protocols.length,
    protocols: protocols.map((p) => ({ name: p.name, address: p.address })),
  });
});

// Get recent alerts (dashboard polls this)
app.get("/api/alerts", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const alerts = getAlerts(limit);
  const count24h = getAlertCount24h();
  res.json({ alerts, count24h });
});

// Helius webhook receiver
app.post("/webhook/helius", handleHeliusWebhook);

// ─── Start ──────────────────────────────────────────────────────────────

function loadProtocolConfigs(): ProtocolConfig[] {
  // Load from env or use demo config
  const configJson = process.env.PROTOCOL_CONFIGS;
  if (configJson) {
    return JSON.parse(configJson);
  }

  // Demo config — monitors a single test vault
  const testVaultAddress = process.env.TEST_VAULT_ADDRESS;
  const guardianPda = process.env.GUARDIAN_PDA;

  if (testVaultAddress && guardianPda) {
    return [
      {
        address: testVaultAddress,
        name: "Test Vault",
        guardianPda,
        thresholds: {
          tvlDropBps: 2000, // 20%
          withdrawalBps: 500, // 5%
        },
      },
    ];
  }

  console.warn("[CONFIG] No protocol configs found. Set TEST_VAULT_ADDRESS + GUARDIAN_PDA or PROTOCOL_CONFIGS.");
  return [];
}

// Initialize
initDb();
const configs = loadProtocolConfigs();
setMonitoredProtocols(configs);

app.listen(PORT, () => {
  console.log(`[SERVER] Solana Shield Watcher running on port ${PORT}`);
  console.log(`[SERVER] Webhook endpoint: POST /webhook/helius`);
  console.log(`[SERVER] Alert API: GET /api/alerts`);
  console.log(`[SERVER] Health: GET /api/status`);
});
