/**
 * Self-Attack Demo Script
 *
 * Simulates an exploit on the test vault:
 * 1. Withdraws 80% of TVL (triggers both TVL_DROP and LARGE_WITHDRAWAL alerts)
 * 2. Waits for watcher to detect and alert
 * 3. Pauses the protocol via Guardian
 * 4. Attempts another withdrawal (should be blocked)
 *
 * Prerequisites:
 * - Programs deployed to devnet (run setup-devnet.ts first)
 * - Watcher running with Helius webhook configured
 *
 * Usage: npx tsx scripts/self-attack.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Guardian } from "../target/types/guardian";
import { TestVault } from "../target/types/test_vault";
import fs from "fs";
import path from "path";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const guardianProgram = anchor.workspace.Guardian as Program<Guardian>;
  const vaultProgram = anchor.workspace.TestVault as Program<TestVault>;

  const wallet = provider.wallet;
  const protocol = wallet.publicKey;

  // Load pauser keypair
  const pauserData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "keys", "pauser.json"), "utf8")
  );
  const pauser = Keypair.fromSecretKey(Uint8Array.from(pauserData));

  // Derive PDAs
  const [guardianPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("guardian"), protocol.toBuffer()],
    guardianProgram.programId
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), wallet.publicKey.toBuffer()],
    vaultProgram.programId
  );
  const [vaultSolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_sol"), wallet.publicKey.toBuffer()],
    vaultProgram.programId
  );

  // Check current vault state
  const vaultBefore = await vaultProgram.account.vault.fetch(vaultPda);
  const balanceBefore = vaultBefore.balance.toNumber() / LAMPORTS_PER_SOL;
  console.log(`\nVault balance: ${balanceBefore} SOL`);
  console.log(`Guardian paused: ${(await guardianProgram.account.protocolGuard.fetch(guardianPda)).isPaused}`);

  // ─── STEP 1: ATTACK — Withdraw 80% of TVL ────────────────────────────
  const attackAmount = Math.floor(vaultBefore.balance.toNumber() * 0.8);
  console.log(`\n[ATTACK] Withdrawing ${attackAmount / LAMPORTS_PER_SOL} SOL (80% of TVL)...`);

  const attackTx = await vaultProgram.methods
    .withdraw(new anchor.BN(attackAmount))
    .accountsStrict({
      vault: vaultPda,
      vaultSol: vaultSolPda,
      guardianState: guardianPda,
      authority: wallet.publicKey,
      withdrawer: wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log(`[ATTACK] Withdrawal tx: ${attackTx}`);
  console.log(`[ATTACK] Solscan: https://solscan.io/tx/${attackTx}?cluster=devnet`);

  const vaultAfterAttack = await vaultProgram.account.vault.fetch(vaultPda);
  console.log(`[ATTACK] Vault balance after: ${vaultAfterAttack.balance.toNumber() / LAMPORTS_PER_SOL} SOL`);

  // ─── STEP 2: WAIT — Give watcher time to detect ──────────────────────
  console.log(`\n[WAIT] Waiting 15 seconds for watcher to detect...`);
  console.log(`[WAIT] Check Telegram for CRITICAL alert.`);
  await sleep(15000);

  // ─── STEP 3: PAUSE — Emergency pause via Guardian ─────────────────────
  console.log(`\n[PAUSE] Activating Guardian pause...`);

  const pauseTx = await guardianProgram.methods
    .pause()
    .accountsStrict({
      protocolGuard: guardianPda,
      pauser: pauser.publicKey,
    })
    .signers([pauser])
    .rpc();

  console.log(`[PAUSE] Pause tx: ${pauseTx}`);
  console.log(`[PAUSE] Guardian state: PAUSED`);

  // ─── STEP 4: VERIFY — Try to withdraw again (should fail) ────────────
  console.log(`\n[VERIFY] Attempting another withdrawal (should be blocked)...`);

  try {
    await vaultProgram.methods
      .withdraw(new anchor.BN(1 * LAMPORTS_PER_SOL))
      .accountsStrict({
        vault: vaultPda,
        vaultSol: vaultSolPda,
        guardianState: guardianPda,
        authority: wallet.publicKey,
        withdrawer: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("[VERIFY] ERROR: Withdrawal succeeded! Guardian is not working.");
  } catch (e: any) {
    if (e.error?.errorCode?.code === "ProtocolPaused") {
      console.log("[VERIFY] Withdrawal BLOCKED. Guardian is protecting the vault.");
    } else {
      console.log("[VERIFY] Withdrawal failed with unexpected error:", e.message);
    }
  }

  // ─── STEP 5: UNPAUSE — Restore normal operations ─────────────────────
  console.log(`\n[UNPAUSE] Restoring normal operations...`);

  await guardianProgram.methods
    .unpause()
    .accountsStrict({
      protocolGuard: guardianPda,
      authority: wallet.publicKey,
    })
    .rpc();

  console.log("[UNPAUSE] Guardian state: ACTIVE (unpaused)");

  const finalState = await guardianProgram.account.protocolGuard.fetch(guardianPda);
  const finalVault = await vaultProgram.account.vault.fetch(vaultPda);

  console.log(`\n=== DEMO COMPLETE ===`);
  console.log(`Vault balance: ${finalVault.balance.toNumber() / LAMPORTS_PER_SOL} SOL (was ${balanceBefore} SOL)`);
  console.log(`Guardian paused: ${finalState.isPaused}`);
  console.log(`Attack prevented: ${balanceBefore - finalVault.balance.toNumber() / LAMPORTS_PER_SOL} SOL lost, but further drain blocked`);
}

main().catch(console.error);
