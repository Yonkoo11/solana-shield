/**
 * Register Vigil as a Metaplex Core agent on devnet.
 *
 * Creates a Core NFT representing the Vigil security agent with metadata
 * pointing to the A2A safety endpoint and alert feed.
 *
 * Usage: ANCHOR_WALLET=~/.config/solana/id.json npx tsx scripts/register-agent.ts
 */

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  createV1,
  mplCore,
  fetchAssetV1,
} from "@metaplex-foundation/mpl-core";
import {
  generateSigner,
  keypairIdentity,
  publicKey,
} from "@metaplex-foundation/umi";
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";

const METADATA_URI =
  "https://yonkoo11.github.io/solana-shield/agent.json";

async function main() {
  // Load wallet
  const walletPath =
    process.env.ANCHOR_WALLET || path.join(process.env.HOME!, ".config/solana/id.json");
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf8"));
  const web3Keypair = Keypair.fromSecretKey(Uint8Array.from(walletData));

  // Create UMI instance
  const umi = createUmi("https://api.devnet.solana.com")
    .use(mplCore())
    .use(keypairIdentity(fromWeb3JsKeypair(web3Keypair)));

  console.log("Wallet:", web3Keypair.publicKey.toBase58());

  // Generate a signer for the agent NFT
  const agentSigner = generateSigner(umi);

  console.log("Minting Vigil Agent NFT...");
  console.log("Agent address:", agentSigner.publicKey);

  // Create Core NFT representing the agent
  await createV1(umi, {
    asset: agentSigner,
    name: "Vigil Security Agent",
    uri: METADATA_URI,
  }).sendAndConfirm(umi);

  console.log("Agent NFT minted!");

  // Verify
  const asset = await fetchAssetV1(umi, agentSigner.publicKey);
  console.log("\n=== AGENT REGISTERED ===");
  console.log("Name:", asset.name);
  console.log("URI:", asset.uri);
  console.log("Address:", agentSigner.publicKey);
  console.log("Owner:", asset.owner);
  console.log(
    `\nView on Solscan: https://solscan.io/token/${agentSigner.publicKey}?cluster=devnet`
  );

  // Save agent address for reference
  const agentInfo = {
    address: agentSigner.publicKey.toString(),
    name: "Vigil Security Agent",
    metadataUri: METADATA_URI,
    network: "devnet",
    mintedAt: new Date().toISOString(),
  };
  const outPath = path.join(__dirname, "..", "ai", "agent-registration.json");
  fs.writeFileSync(outPath, JSON.stringify(agentInfo, null, 2));
  console.log(`\nSaved agent info to ${outPath}`);
}

main().catch(console.error);
