import { GoldRushClient } from "@covalenthq/client-sdk";

const GOLDRUSH_API_KEY = process.env.GOLDRUSH_API_KEY || "";

let client: GoldRushClient | null = null;

export function initGoldRush(): boolean {
  if (!GOLDRUSH_API_KEY) {
    console.log("[GOLDRUSH] No API key configured — enrichment disabled");
    return false;
  }
  client = new GoldRushClient(GOLDRUSH_API_KEY);
  console.log("[GOLDRUSH] Connected — data enrichment enabled");
  return true;
}

export function isGoldRushConnected(): boolean {
  return client !== null;
}

/**
 * Get wallet balances via GoldRush API.
 * Used to cross-verify Helius webhook balance data.
 */
export async function getWalletBalances(walletAddress: string): Promise<{
  nativeBalance: number;
  tokens: Array<{ symbol: string; balance: string; usdValue: number }>;
} | null> {
  if (!client) return null;

  try {
    const resp = await client.BalanceService.getTokenBalancesForWalletAddress(
      "solana-mainnet" as any,
      walletAddress
    );

    if (!resp.data?.items) return null;

    const native = resp.data.items.find(
      (t: any) => t.native_token === true
    );
    const tokens = resp.data.items
      .filter((t: any) => !t.native_token && t.balance && t.balance !== "0")
      .map((t: any) => ({
        symbol: t.contract_ticker_symbol || "UNKNOWN",
        balance: t.balance || "0",
        usdValue: t.quote || 0,
      }));

    return {
      nativeBalance: native ? Number(native.balance || 0) : 0,
      tokens,
    };
  } catch (err) {
    console.error("[GOLDRUSH] Balance fetch failed:", err);
    return null;
  }
}

/**
 * Get recent transactions via GoldRush API.
 * Used to enrich alert context with decoded transaction details.
 */
export async function getRecentTransactions(
  walletAddress: string,
  limit: number = 5
): Promise<Array<{ txHash: string; timestamp: string; type: string }> | null> {
  if (!client) return null;

  try {
    const resp =
      await client.TransactionService.getAllTransactionsForAddress(
        "solana-mainnet" as any,
        walletAddress
      );

    if (!resp.data?.items) return null;

    return resp.data.items.slice(0, limit).map((tx: any) => ({
      txHash: tx.tx_hash || "",
      timestamp: tx.block_signed_at || "",
      type: tx.log_events?.[0]?.decoded?.name || "unknown",
    }));
  } catch (err) {
    console.error("[GOLDRUSH] Transaction fetch failed:", err);
    return null;
  }
}
