import { Request, Response } from "express";
import { HeliusWebhookPayload, ProtocolConfig } from "./types";
import { checkInvariants } from "./invariants";
import { processAlert } from "./alerts";

// Protocol configs — loaded from env or hardcoded for demo
let monitoredProtocols: ProtocolConfig[] = [];

export function setMonitoredProtocols(configs: ProtocolConfig[]): void {
  monitoredProtocols = configs;
  console.log(
    `[WEBHOOK] Monitoring ${configs.length} protocol(s): ${configs.map((c) => c.name).join(", ")}`
  );
}

export function getMonitoredProtocols(): ProtocolConfig[] {
  return monitoredProtocols;
}

/**
 * Handle incoming Helius webhook POST.
 * Helius sends an array of enhanced transactions.
 */
export async function handleHeliusWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // Helius sends an array of transactions
    const transactions: HeliusWebhookPayload[] = Array.isArray(req.body)
      ? req.body
      : [req.body];

    let totalAlerts = 0;

    for (const tx of transactions) {
      if (!tx.signature || !tx.accountData) {
        continue; // Skip malformed payloads
      }

      const alerts = checkInvariants(tx, monitoredProtocols);

      for (const alert of alerts) {
        await processAlert(alert);
        totalAlerts++;
      }
    }

    res.status(200).json({
      status: "ok",
      transactions_processed: transactions.length,
      alerts_fired: totalAlerts,
    });
  } catch (err) {
    console.error("[WEBHOOK] Error processing payload:", err);
    res.status(200).json({ status: "ok", error: "processing_error" });
    // Return 200 even on error to prevent Helius from retrying excessively
  }
}
