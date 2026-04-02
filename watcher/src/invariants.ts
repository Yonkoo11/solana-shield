import { Alert, HeliusWebhookPayload, ProtocolConfig } from "./types";
import { getProtocolState, upsertProtocolState } from "./db";

/**
 * Check all invariants against a Helius webhook payload.
 * Returns an array of Alert objects for each violation detected.
 */
export function checkInvariants(
  payload: HeliusWebhookPayload,
  configs: ProtocolConfig[]
): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date().toISOString();

  for (const config of configs) {
    const accountData = payload.accountData?.find(
      (a) => a.account === config.address
    );
    if (!accountData) continue;

    const prevState = getProtocolState(config.address);
    const balanceChange = accountData.nativeBalanceChange;

    // ─── Invariant 1: TVL Drop ────────────────────────────────────────
    if (prevState && balanceChange < 0) {
      const dropLamports = Math.abs(balanceChange);
      const dropBps = Math.floor(
        (dropLamports / prevState.lastKnownBalance) * 10000
      );

      if (dropBps >= config.thresholds.tvlDropBps && prevState.lastKnownBalance > 0) {
        const dropPercent = (dropBps / 100).toFixed(1);
        const dropSol = (dropLamports / 1e9).toFixed(2);
        alerts.push({
          timestamp: now,
          protocol: config.address,
          type: "TVL_DROP",
          severity: dropBps >= 5000 ? "CRITICAL" : "HIGH",
          details: `TVL dropped ${dropPercent}% (${dropSol} SOL) in one transaction. Threshold: ${config.thresholds.tvlDropBps / 100}%`,
          txSignature: payload.signature,
          resolved: false,
        });
      }
    }

    // ─── Invariant 2: Large Withdrawal ────────────────────────────────
    if (prevState && balanceChange < 0) {
      const withdrawLamports = Math.abs(balanceChange);
      const withdrawBps = Math.floor(
        (withdrawLamports / prevState.lastKnownBalance) * 10000
      );

      if (
        withdrawBps >= config.thresholds.withdrawalBps &&
        prevState.lastKnownBalance > 0
      ) {
        const withdrawPercent = (withdrawBps / 100).toFixed(1);
        const withdrawSol = (withdrawLamports / 1e9).toFixed(2);
        alerts.push({
          timestamp: now,
          protocol: config.address,
          type: "LARGE_WITHDRAWAL",
          severity: withdrawBps >= 5000 ? "CRITICAL" : "HIGH",
          details: `Single withdrawal of ${withdrawPercent}% (${withdrawSol} SOL). Threshold: ${config.thresholds.withdrawalBps / 100}%`,
          txSignature: payload.signature,
          resolved: false,
        });
      }
    }

    // ─── Invariant 3: Authority Change ────────────────────────────────
    // Detect SetAuthority-like instructions targeting the monitored account.
    // System Program (11111111111111111111111111111111) Assign and
    // Token Program SetAuthority both indicate ownership transfer.
    const authorityChangeDetected = detectAuthorityChange(payload, config.address);
    if (authorityChangeDetected) {
      alerts.push({
        timestamp: now,
        protocol: config.address,
        type: "AUTHORITY_CHANGE",
        severity: "CRITICAL",
        details: `Authority/owner change detected on monitored account. This could indicate a hostile takeover.`,
        txSignature: payload.signature,
        resolved: false,
      });
    }

    // ─── Update stored state ──────────────────────────────────────────
    const newBalance = prevState
      ? prevState.lastKnownBalance + balanceChange
      : Math.max(0, balanceChange);

    upsertProtocolState({
      address: config.address,
      lastKnownBalance: Math.max(0, newBalance),
      lastKnownAuthority: prevState?.lastKnownAuthority || payload.feePayer,
      lastUpdated: now,
    });
  }

  return alerts;
}

/**
 * Detect authority/owner changes by scanning instructions for
 * known authority-transfer patterns.
 */
function detectAuthorityChange(
  payload: HeliusWebhookPayload,
  protocolAddress: string
): boolean {
  // Check if transaction type indicates authority change
  if (
    payload.type === "SET_AUTHORITY" ||
    payload.description?.toLowerCase().includes("authority")
  ) {
    return true;
  }

  // Check instructions for System Program Assign (change owner)
  // or Token Program SetAuthority
  const SYSTEM_PROGRAM = "11111111111111111111111111111111";
  const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

  for (const ix of payload.instructions || []) {
    if (
      (ix.programId === SYSTEM_PROGRAM || ix.programId === TOKEN_PROGRAM) &&
      ix.accounts?.includes(protocolAddress)
    ) {
      // Heuristic: if monitored account is involved in a system/token program
      // instruction that could change ownership, flag it.
      // This is intentionally broad — false positives are better than false negatives
      // for a security tool. We'll refine in V2.
      if (ix.data && ix.accounts.length >= 2) {
        return true;
      }
    }
  }

  return false;
}
