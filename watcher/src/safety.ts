import { getAlerts } from "./db";
import { getWalletBalances, isGoldRushConnected } from "./goldrush";

export interface SafetyScore {
  protocol: string;
  status: "SAFE" | "WARNING" | "CRITICAL" | "UNKNOWN";
  riskScore: number; // 0 = safe, 100 = critical
  activeAlerts: Array<{
    type: string;
    severity: string;
    details: string;
    timestamp: string;
  }>;
  lastChecked: string;
  guardianPaused: boolean;
  recommendation: "PROCEED" | "CAUTION" | "AVOID";
  dataSources: {
    helius: boolean;
    goldRush: boolean;
  };
}

/**
 * Compute safety score for a protocol.
 * Called by other agents before transacting: GET /api/safety?protocol=X
 *
 * Scoring:
 * - 0-20: SAFE (no recent alerts, balances stable)
 * - 21-50: WARNING (high-severity alerts in last hour)
 * - 51-100: CRITICAL (critical alerts active, possible ongoing exploit)
 */
export async function getSafetyScore(
  protocolAddress: string
): Promise<SafetyScore> {
  const now = new Date().toISOString();

  // Get recent alerts for this protocol
  const allAlerts = getAlerts(100);
  const protocolAlerts = allAlerts.filter(
    (a) => a.protocol === protocolAddress && !a.resolved
  );

  // Score based on alert severity and recency
  let riskScore = 0;
  const oneHourAgo = Date.now() - 3600000;

  for (const alert of protocolAlerts) {
    const alertTime = new Date(alert.timestamp).getTime();
    const isRecent = alertTime > oneHourAgo;
    const recencyMultiplier = isRecent ? 1.0 : 0.3;

    if (alert.severity === "CRITICAL") {
      riskScore += 30 * recencyMultiplier;
    } else if (alert.severity === "HIGH") {
      riskScore += 15 * recencyMultiplier;
    } else if (alert.severity === "MEDIUM") {
      riskScore += 5 * recencyMultiplier;
    }
  }

  // Cap at 100
  riskScore = Math.min(100, Math.round(riskScore));

  // Enrich with GoldRush balance data if available
  let goldRushEnriched = false;
  if (isGoldRushConnected()) {
    const balances = await getWalletBalances(protocolAddress);
    if (balances) {
      goldRushEnriched = true;
      // If balance is 0 and we have recent TVL_DROP alerts, boost risk
      if (
        balances.nativeBalance === 0 &&
        protocolAlerts.some((a) => a.type === "TVL_DROP")
      ) {
        riskScore = Math.min(100, riskScore + 20);
      }
    }
  }

  // Determine status and recommendation
  let status: SafetyScore["status"];
  let recommendation: SafetyScore["recommendation"];

  if (riskScore === 0 && protocolAlerts.length === 0) {
    status = "UNKNOWN"; // No data — can't confirm safety
    recommendation = "CAUTION";
  } else if (riskScore <= 20) {
    status = "SAFE";
    recommendation = "PROCEED";
  } else if (riskScore <= 50) {
    status = "WARNING";
    recommendation = "CAUTION";
  } else {
    status = "CRITICAL";
    recommendation = "AVOID";
  }

  return {
    protocol: protocolAddress,
    status,
    riskScore,
    activeAlerts: protocolAlerts.map((a) => ({
      type: a.type,
      severity: a.severity,
      details: a.details,
      timestamp: a.timestamp,
    })),
    lastChecked: now,
    guardianPaused: false, // TODO: check on-chain Guardian state
    recommendation,
    dataSources: {
      helius: true,
      goldRush: goldRushEnriched,
    },
  };
}
