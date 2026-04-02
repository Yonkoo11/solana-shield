import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Guardian } from "../target/types/guardian";
import { TestVault } from "../target/types/test_vault";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("solana-shield", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const guardianProgram = anchor.workspace.Guardian as Program<Guardian>;
  const vaultProgram = anchor.workspace.TestVault as Program<TestVault>;

  // Keys
  const protocol = Keypair.generate();
  const authority = provider.wallet;
  const pauser = Keypair.generate();
  const attacker = Keypair.generate();

  let guardianPda: PublicKey;
  let vaultPda: PublicKey;
  let vaultSolPda: PublicKey;

  before(async () => {
    [guardianPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("guardian"), protocol.publicKey.toBuffer()],
      guardianProgram.programId
    );
    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), authority.publicKey.toBuffer()],
      vaultProgram.programId
    );
    [vaultSolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_sol"), authority.publicKey.toBuffer()],
      vaultProgram.programId
    );

    // Airdrop to pauser and attacker
    for (const kp of [pauser, attacker]) {
      const sig = await provider.connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(sig);
    }
  });

  // ─── Guardian Tests ─────────────────────────────────────────────────

  describe("Guardian Program", () => {
    it("registers a protocol", async () => {
      await guardianProgram.methods
        .registerProtocol(new anchor.BN(3600))
        .accountsStrict({
          protocolGuard: guardianPda,
          protocol: protocol.publicKey,
          authority: authority.publicKey,
          pauser: pauser.publicKey,
          payer: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const guard = await guardianProgram.account.protocolGuard.fetch(guardianPda);
      expect(guard.protocol.toString()).to.equal(protocol.publicKey.toString());
      expect(guard.isPaused).to.be.false;
      expect(guard.autoUnpauseDelay.toNumber()).to.equal(3600);
    });

    it("pauses when called by authorized pauser", async () => {
      await guardianProgram.methods
        .pause()
        .accountsStrict({
          protocolGuard: guardianPda,
          pauser: pauser.publicKey,
        })
        .signers([pauser])
        .rpc();

      const guard = await guardianProgram.account.protocolGuard.fetch(guardianPda);
      expect(guard.isPaused).to.be.true;
      expect(guard.pausedAt.toNumber()).to.be.greaterThan(0);
    });

    it("rejects pause from unauthorized user", async () => {
      // Unpause first
      await guardianProgram.methods
        .unpause()
        .accountsStrict({
          protocolGuard: guardianPda,
          authority: authority.publicKey,
        })
        .rpc();

      try {
        await guardianProgram.methods
          .pause()
          .accountsStrict({
            protocolGuard: guardianPda,
            pauser: attacker.publicKey,
          })
          .signers([attacker])
          .rpc();
        expect.fail("Should have rejected unauthorized pauser");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("UnauthorizedPauser");
      }
    });

    it("rejects double-pause", async () => {
      await guardianProgram.methods
        .pause()
        .accountsStrict({
          protocolGuard: guardianPda,
          pauser: pauser.publicKey,
        })
        .signers([pauser])
        .rpc();

      try {
        await guardianProgram.methods
          .pause()
          .accountsStrict({
            protocolGuard: guardianPda,
            pauser: pauser.publicKey,
          })
          .signers([pauser])
          .rpc();
        expect.fail("Should have rejected double-pause");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("AlreadyPaused");
      }
    });

    it("unpauses when called by authority", async () => {
      await guardianProgram.methods
        .unpause()
        .accountsStrict({
          protocolGuard: guardianPda,
          authority: authority.publicKey,
        })
        .rpc();

      const guard = await guardianProgram.account.protocolGuard.fetch(guardianPda);
      expect(guard.isPaused).to.be.false;
    });

    it("rejects unpause from unauthorized user", async () => {
      await guardianProgram.methods
        .pause()
        .accountsStrict({
          protocolGuard: guardianPda,
          pauser: pauser.publicKey,
        })
        .signers([pauser])
        .rpc();

      try {
        await guardianProgram.methods
          .unpause()
          .accountsStrict({
            protocolGuard: guardianPda,
            authority: attacker.publicKey,
          })
          .signers([attacker])
          .rpc();
        expect.fail("Should have rejected unauthorized unpause");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("UnauthorizedAuthority");
      }

      // Clean up
      await guardianProgram.methods
        .unpause()
        .accountsStrict({
          protocolGuard: guardianPda,
          authority: authority.publicKey,
        })
        .rpc();
    });

    it("updates pauser", async () => {
      const newPauser = Keypair.generate();
      await guardianProgram.methods
        .updatePauser(newPauser.publicKey)
        .accountsStrict({
          protocolGuard: guardianPda,
          authority: authority.publicKey,
        })
        .rpc();

      const guard = await guardianProgram.account.protocolGuard.fetch(guardianPda);
      expect(guard.pauser.toString()).to.equal(newPauser.publicKey.toString());

      // Restore
      await guardianProgram.methods
        .updatePauser(pauser.publicKey)
        .accountsStrict({
          protocolGuard: guardianPda,
          authority: authority.publicKey,
        })
        .rpc();
    });

    it("rejects crank when not paused", async () => {
      try {
        await guardianProgram.methods
          .crankAutoUnpause()
          .accountsStrict({
            protocolGuard: guardianPda,
          })
          .rpc();
        expect.fail("Should reject");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("NotPaused");
      }
    });

    it("rejects crank when delay not elapsed", async () => {
      await guardianProgram.methods
        .pause()
        .accountsStrict({
          protocolGuard: guardianPda,
          pauser: pauser.publicKey,
        })
        .signers([pauser])
        .rpc();

      try {
        await guardianProgram.methods
          .crankAutoUnpause()
          .accountsStrict({
            protocolGuard: guardianPda,
          })
          .rpc();
        expect.fail("Should reject — delay not elapsed");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("AutoUnpauseNotReady");
      }

      // Clean up
      await guardianProgram.methods
        .unpause()
        .accountsStrict({
          protocolGuard: guardianPda,
          authority: authority.publicKey,
        })
        .rpc();
    });
  });

  // ─── Test Vault + Guardian Integration ────────────────────────────────

  describe("Test Vault (Guardian Integration)", () => {
    it("initializes vault linked to guardian", async () => {
      await vaultProgram.methods
        .initialize()
        .accountsStrict({
          vault: vaultPda,
          vaultSol: vaultSolPda,
          guardianState: guardianPda,
          authority: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const vault = await vaultProgram.account.vault.fetch(vaultPda);
      expect(vault.authority.toString()).to.equal(authority.publicKey.toString());
      expect(vault.balance.toNumber()).to.equal(0);
    });

    it("deposits SOL", async () => {
      const amount = 10 * LAMPORTS_PER_SOL;
      await vaultProgram.methods
        .deposit(new anchor.BN(amount))
        .accountsStrict({
          vault: vaultPda,
          vaultSol: vaultSolPda,
          depositor: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const vault = await vaultProgram.account.vault.fetch(vaultPda);
      expect(vault.balance.toNumber()).to.equal(amount);
    });

    it("withdraws SOL when NOT paused", async () => {
      const amount = 1 * LAMPORTS_PER_SOL;
      await vaultProgram.methods
        .withdraw(new anchor.BN(amount))
        .accountsStrict({
          vault: vaultPda,
          vaultSol: vaultSolPda,
          guardianState: guardianPda,
          authority: authority.publicKey,
          withdrawer: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const vault = await vaultProgram.account.vault.fetch(vaultPda);
      expect(vault.balance.toNumber()).to.equal(9 * LAMPORTS_PER_SOL);
    });

    it("BLOCKS withdrawal when paused", async () => {
      await guardianProgram.methods
        .pause()
        .accountsStrict({
          protocolGuard: guardianPda,
          pauser: pauser.publicKey,
        })
        .signers([pauser])
        .rpc();

      try {
        await vaultProgram.methods
          .withdraw(new anchor.BN(1 * LAMPORTS_PER_SOL))
          .accountsStrict({
            vault: vaultPda,
            vaultSol: vaultSolPda,
            guardianState: guardianPda,
            authority: authority.publicKey,
            withdrawer: authority.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
        expect.fail("Should block withdrawal when paused");
      } catch (err: any) {
        expect(err.error.errorCode.code).to.equal("ProtocolPaused");
      }
    });

    it("allows withdrawal after unpause", async () => {
      await guardianProgram.methods
        .unpause()
        .accountsStrict({
          protocolGuard: guardianPda,
          authority: authority.publicKey,
        })
        .rpc();

      await vaultProgram.methods
        .withdraw(new anchor.BN(1 * LAMPORTS_PER_SOL))
        .accountsStrict({
          vault: vaultPda,
          vaultSol: vaultSolPda,
          guardianState: guardianPda,
          authority: authority.publicKey,
          withdrawer: authority.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const vault = await vaultProgram.account.vault.fetch(vaultPda);
      expect(vault.balance.toNumber()).to.equal(8 * LAMPORTS_PER_SOL);
    });

    it("changes authority", async () => {
      const newAuth = Keypair.generate();
      await vaultProgram.methods
        .changeAuthority(newAuth.publicKey)
        .accountsStrict({
          vault: vaultPda,
          authority: authority.publicKey,
        })
        .rpc();

      const vault = await vaultProgram.account.vault.fetch(vaultPda);
      expect(vault.authority.toString()).to.equal(newAuth.publicKey.toString());
    });
  });
});
