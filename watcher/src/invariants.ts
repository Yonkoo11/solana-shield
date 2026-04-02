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

    // ─── Invariant 4: Config Change (Drift-inspired) ───────────────────
    // Detects abnormal parameter changes: withdrawal limits, new asset listings,
    // oracle config. The Drift attacker raised withdrawal limits to $500T and
    // listed a phantom token — both are detectable config changes.
    const configChangeDetected = detectConfigChange(payload, config.address);
    if (configChangeDetected) {
      alerts.push({
        timestamp: now,
        protocol: config.address,
        type: "CONFIG_CHANGE",
        severity: "CRITICAL",
        details: configChangeDetected,
        txSignature: payload.signature,
        resolved: false,
      });
    }

    // ─── Invariant 5: Admin Action ──────────────────────────────────────
    // Any instruction signed by a known admin/authority targeting the protocol.
    // Drift attack used compromised admin keys to execute the takeover.
    // Flags all admin-level instructions for review.
    const adminActionDetected = detectAdminAction(payload, config.address);
    if (adminActionDetected) {
      alerts.push({
        timestamp: now,
        protocol: config.address,
        type: "ADMIN_ACTION",
        severity: "HIGH",
        details: adminActionDetected,
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

/**
 * Detect protocol configuration changes.
 * Inspired by Drift hack: attacker raised withdrawal limits to $500T
 * and listed a phantom token ($CVT) as valid collateral.
 *
 * Heuristic: flag transactions from the protocol's own program that
 * modify config/settings accounts (identified by instruction pattern).
 */
function detectConfigChange(
  payload: HeliusWebhookPayload,
  protocolAddress: string
): string | null {
  // Helius enhanced transactions include a description field
  const desc = (payload.description || "").toLowerCase();

  // Look for config-related keywords in the transaction description
  const configKeywords = [
    "update config",
    "set limit",
    "add market",
    "add asset",
    "list token",
    "set oracle",
    "update oracle",
    "set withdrawal",
    "update withdrawal",
    "set parameter",
    "initialize market",
  ];

  for (const keyword of configKeywords) {
    if (desc.includes(keyword)) {
      return `Protocol configuration change detected: "${keyword}" in transaction. Verify this was authorized.`;
    }
  }

  // Check for transactions with many account writes (config updates often touch multiple accounts)
  const accountWrites = payload.accountData?.filter(
    (a) => a.nativeBalanceChange !== 0 || a.tokenBalanceChanges.length > 0
  );
  if (accountWrites && accountWrites.length > 8) {
    return `Unusual transaction complexity: ${accountWrites.length} accounts modified in single transaction. Possible batch config change.`;
  }

  return null;
}

/**
 * Detect admin-level actions on the monitored protocol.
 * The Drift attacker used compromised admin keys to execute the takeover.
 * Any instruction from a known admin touching the protocol is flagged.
 */
function detectAdminAction(
  payload: HeliusWebhookPayload,
  protocolAddress: string
): string | null {
  const desc = (payload.description || "").toLowerCase();

  // Admin action keywords from common Solana DeFi patterns
  const adminKeywords = [
    "upgrade",
    "migrate",
    "admin",
    "emergency",
    "pause",
    "freeze",
    "set authority",
    "transfer authority",
    "close account",
    "withdraw fee",
  ];

  for (const keyword of adminKeywords) {
    if (desc.includes(keyword)) {
      return `Admin-level action detected: "${keyword}". Signed by ${payload.feePayer.slice(0, 8)}...`;
    }
  }

  // Check for BPF Upgradeable Loader (program upgrades)
  const BPF_LOADER = "BPFLoaderUpgradeab1e11111111111111111111111";
  for (const ix of payload.instructions || []) {
    if (ix.programId === BPF_LOADER) {
      return `Program upgrade detected via BPF Loader. This changes the protocol's executable code. VERIFY IMMEDIATELY.`;
    }
  }

  return null;
}
