import { Alert } from "./types";
import { insertAlert } from "./db";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const SEVERITY_EMOJI: Record<string, string> = {
  CRITICAL: "\u{1F6A8}", // siren
  HIGH: "\u{26A0}\u{FE0F}", // warning
  MEDIUM: "\u{1F536}", // orange diamond
  LOW: "\u{1F539}", // blue diamond
};

const TYPE_LABEL: Record<string, string> = {
  TVL_DROP: "TVL Drop",
  AUTHORITY_CHANGE: "Authority Change",
  LARGE_WITHDRAWAL: "Large Withdrawal",
};

/**
 * Process an alert: store to DB + send to Telegram.
 */
export async function processAlert(alert: Alert): Promise<void> {
  // Store to database
  const id = insertAlert(alert);
  alert.id = id;

  // Log locally
  console.log(
    `[ALERT] ${alert.severity} | ${alert.type} | ${alert.protocol.slice(0, 8)}... | ${alert.details}`
  );

  // Send to Telegram
  await sendTelegramAlert(alert);
}

/**
 * Send alert to Telegram via Bot API (direct HTTP, no library).
 */
async function sendTelegramAlert(alert: Alert): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("[TELEGRAM] Not configured — alert logged only");
    return;
  }

  const emoji = SEVERITY_EMOJI[alert.severity] || "";
  const typeLabel = TYPE_LABEL[alert.type] || alert.type;
  const shortAddr = `${alert.protocol.slice(0, 4)}...${alert.protocol.slice(-4)}`;

  const text = [
    `${emoji} <b>${alert.severity} ALERT</b>`,
    ``,
    `<b>Type:</b> ${typeLabel}`,
    `<b>Protocol:</b> <code>${shortAddr}</code>`,
    `<b>Details:</b> ${escapeHtml(alert.details)}`,
    ``,
    `<b>Time:</b> ${alert.timestamp}`,
    alert.txSignature
      ? `<b>Tx:</b> <a href="https://solscan.io/tx/${alert.txSignature}">View on Solscan</a>`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[TELEGRAM] Failed (${res.status}): ${body}`);
    }
  } catch (err) {
    console.error(`[TELEGRAM] Send failed:`, err);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
