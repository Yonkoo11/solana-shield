// ─── Alert Types ────────────────────────────────────────────────────────

export type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type InvariantType =
  | "TVL_DROP"
  | "AUTHORITY_CHANGE"
  | "LARGE_WITHDRAWAL"
  | "CONFIG_CHANGE"
  | "ADMIN_ACTION";

export interface Alert {
  id?: number;
  timestamp: string; // ISO 8601
  protocol: string; // Account address being monitored
  type: InvariantType;
  severity: AlertSeverity;
  details: string;
  txSignature?: string;
  resolved: boolean;
}

// ─── Protocol Monitoring State ──────────────────────────────────────────

export interface ProtocolConfig {
  address: string; // Protocol/vault account to monitor
  name: string; // Human-readable name
  guardianPda: string; // Guardian PDA for this protocol
  thresholds: {
    tvlDropBps: number; // 2000 = 20%
    withdrawalBps: number; // 500 = 5%
  };
}

export interface ProtocolState {
  address: string;
  lastKnownBalance: number; // lamports
  lastKnownAuthority: string;
  lastUpdated: string; // ISO 8601
}

// ─── Helius Webhook Types ───────────────────────────────────────────────

export interface HeliusWebhookPayload {
  accountData: HeliusAccountData[];
  description: string;
  events: Record<string, unknown>;
  fee: number;
  feePayer: string;
  instructions: HeliusInstruction[];
  nativeTransfers: HeliusNativeTransfer[];
  signature: string;
  slot: number;
  source: string;
  timestamp: number;
  tokenTransfers: HeliusTokenTransfer[];
  transactionError: string | null;
  type: string;
}

export interface HeliusAccountData {
  account: string;
  nativeBalanceChange: number; // lamports change (can be negative)
  tokenBalanceChanges: HeliusTokenBalanceChange[];
}

export interface HeliusTokenBalanceChange {
  mint: string;
  rawTokenAmount: {
    decimals: number;
    tokenAmount: string;
  };
  tokenAccount: string;
  userAccount: string;
}

export interface HeliusInstruction {
  accounts: string[];
  data: string;
  innerInstructions: HeliusInstruction[];
  programId: string;
}

export interface HeliusNativeTransfer {
  amount: number; // lamports
  fromUserAccount: string;
  toUserAccount: string;
}

export interface HeliusTokenTransfer {
  fromTokenAccount: string;
  fromUserAccount: string;
  mint: string;
  toTokenAccount: string;
  toUserAccount: string;
  tokenAmount: number;
  tokenStandard: string;
}
