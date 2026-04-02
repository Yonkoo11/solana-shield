/**
 * Setup script for Solana Shield on devnet.
 *
 * Prerequisites:
 * - Guardian and TestVault programs deployed to devnet
 * - Solana CLI configured with devnet and funded wallet
 *
 * Usage: npx tsx scripts/setup-devnet.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Guardian } from "../target/types/guardian";
import { TestVault } from "../target/types/test_vault";
import fs from "fs";
import path from "path";

async function main() {
  // Connect to devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const guardianProgram = anchor.workspace.Guardian as Program<Guardian>;
  const vaultProgram = anchor.workspace.TestVault as Program<TestVault>;

  const wallet = provider.wallet;
  console.log("Wallet:", wallet.publicKey.toString());
  console.log("Guardian Program:", guardianProgram.programId.toString());
  console.log("Vault Program:", vaultProgram.programId.toString());

  // Generate pauser keypair (the watcher service key)
  const pauserKeypairPath = path.join(__dirname, "..", "keys", "pauser.json");
  let pauser: Keypair;

  if (fs.existsSync(pauserKeypairPath)) {
    const pauserData = JSON.parse(fs.readFileSync(pauserKeypairPath, "utf8"));
    pauser = Keypair.fromSecretKey(Uint8Array.from(pauserData));
    console.log("Loaded existing pauser:", pauser.publicKey.toString());
  } else {
    pauser = Keypair.generate();
    fs.mkdirSync(path.dirname(pauserKeypairPath), { recursive: true });
    fs.writeFileSync(
      pauserKeypairPath,
      JSON.stringify(Array.from(pauser.secretKey))
    );
    console.log("Generated new pauser:", pauser.publicKey.toString());

    // Fund pauser for tx fees
    const sig = await provider.connection.requestAirdrop(
      pauser.publicKey,
      0.1 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);
    console.log("Funded pauser with 0.1 SOL");
  }

  // Use wallet pubkey as the "protocol" (the thing we're monitoring)
  const protocol = wallet.publicKey;

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

  console.log("\nGuardian PDA:", guardianPda.toString());
  console.log("Vault PDA:", vaultPda.toString());
  console.log("Vault SOL PDA:", vaultSolPda.toString());

  // 1. Register protocol with Guardian
  console.log("\n--- Registering protocol with Guardian ---");
  try {
    await guardianProgram.methods
      .registerProtocol(new anchor.BN(3600)) // 1 hour auto-unpause
      .accountsStrict({
        protocolGuard: guardianPda,
        protocol: protocol,
        authority: wallet.publicKey,
        pauser: pauser.publicKey,
        payer: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("Protocol registered.");
  } catch (e: any) {
    if (e.message?.includes("already in use")) {
      console.log("Protocol already registered (skipping).");
    } else {
      throw e;
    }
  }

  // 2. Initialize test vault
  console.log("\n--- Initializing test vault ---");
  try {
    await vaultProgram.methods
      .initialize()
      .accountsStrict({
        vault: vaultPda,
        vaultSol: vaultSolPda,
        guardianState: guardianPda,
        authority: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("Vault initialized.");
  } catch (e: any) {
    if (e.message?.includes("already in use")) {
      console.log("Vault already initialized (skipping).");
    } else {
      throw e;
    }
  }

  // 3. Deposit 10 SOL into vault
  console.log("\n--- Depositing 10 SOL ---");
  const depositAmount = 10 * LAMPORTS_PER_SOL;
  await vaultProgram.methods
    .deposit(new anchor.BN(depositAmount))
    .accountsStrict({
      vault: vaultPda,
      vaultSol: vaultSolPda,
      depositor: wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  const vault = await vaultProgram.account.vault.fetch(vaultPda);
  console.log(`Deposited. Vault balance: ${vault.balance.toNumber() / LAMPORTS_PER_SOL} SOL`);

  // 4. Print config for watcher
  console.log("\n=== WATCHER CONFIG ===");
  console.log(`TEST_VAULT_ADDRESS=${vaultSolPda.toString()}`);
  console.log(`GUARDIAN_PDA=${guardianPda.toString()}`);
  console.log(`\nAdd these to watcher/.env`);
  console.log(`\nHelius webhook should monitor account: ${vaultSolPda.toString()}`);
  console.log(`\nDone! Ready for self-attack demo.`);
}

main().catch(console.error);
