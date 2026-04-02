use anchor_lang::prelude::*;
use anchor_lang::system_program;
use guardian::program::Guardian as GuardianProgram;
use guardian::ProtocolGuard;

declare_id!("4M9V6X4tNudhVXvJpeEaMwqBYXQUYYsyRxoP5Eotophq");

/// Test Vault — Simple SOL vault for self-attack demo.
/// Integrates with Guardian protocol: withdraw checks is_paused.
#[program]
pub mod test_vault {
    use super::*;

    /// Create a new vault linked to a Guardian PDA.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.guardian_state = ctx.accounts.guardian_state.key();
        vault.balance = 0;
        vault.bump = ctx.bumps.vault;
        Ok(())
    }

    /// Deposit SOL into the vault.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);

        // Transfer SOL from depositor to vault PDA
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.depositor.to_account_info(),
                    to: ctx.accounts.vault_sol.to_account_info(),
                },
            ),
            amount,
        )?;

        let vault = &mut ctx.accounts.vault;
        vault.balance = vault.balance.checked_add(amount).ok_or(VaultError::Overflow)?;

        emit!(VaultDeposit {
            vault: vault.key(),
            depositor: ctx.accounts.depositor.key(),
            amount,
            new_balance: vault.balance,
        });

        Ok(())
    }

    /// Withdraw SOL from the vault.
    /// CRITICAL: Checks Guardian is_paused — rejects if protocol is paused.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, VaultError::ZeroAmount);

        // Guardian check: reject if paused
        require!(
            !ctx.accounts.guardian_state.is_paused,
            VaultError::ProtocolPaused
        );

        let vault = &mut ctx.accounts.vault;
        require!(vault.balance >= amount, VaultError::InsufficientBalance);

        vault.balance = vault.balance.checked_sub(amount).ok_or(VaultError::Overflow)?;

        // Transfer SOL from vault PDA to withdrawer via system program CPI
        let authority_key = vault.authority;
        let bump = ctx.bumps.vault_sol;
        let seeds: &[&[u8]] = &[b"vault_sol", authority_key.as_ref(), &[bump]];
        let signer_seeds = &[seeds];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.vault_sol.to_account_info(),
                    to: ctx.accounts.withdrawer.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        emit!(VaultWithdraw {
            vault: vault.key(),
            withdrawer: ctx.accounts.withdrawer.key(),
            amount,
            new_balance: vault.balance,
        });

        Ok(())
    }

    /// Transfer vault authority (for self-attack demo: authority change detection).
    pub fn change_authority(ctx: Context<ChangeAuthority>, new_authority: Pubkey) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let old_authority = vault.authority;
        vault.authority = new_authority;

        emit!(AuthorityChanged {
            vault: vault.key(),
            old_authority,
            new_authority,
        });

        Ok(())
    }
}

// ─── Accounts ───────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault", authority.key().as_ref()],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    /// PDA that holds the SOL (separate from vault state account).
    /// CHECK: Created as a system account PDA to hold SOL.
    #[account(
        mut,
        seeds = [b"vault_sol", authority.key().as_ref()],
        bump,
    )]
    pub vault_sol: SystemAccount<'info>,

    /// Guardian PDA for this vault — must already be registered.
    #[account(
        owner = guardian::ID @ VaultError::InvalidGuardian,
    )]
    pub guardian_state: Account<'info, ProtocolGuard>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,

    /// CHECK: PDA that holds SOL.
    #[account(
        mut,
        seeds = [b"vault_sol", vault.authority.as_ref()],
        bump,
    )]
    pub vault_sol: SystemAccount<'info>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        constraint = vault.authority == authority.key() @ VaultError::UnauthorizedWithdraw,
    )]
    pub vault: Account<'info, Vault>,

    /// CHECK: PDA that holds SOL.
    #[account(
        mut,
        seeds = [b"vault_sol", vault.authority.as_ref()],
        bump,
    )]
    pub vault_sol: SystemAccount<'info>,

    /// Guardian state — checked for is_paused.
    #[account(
        owner = guardian::ID @ VaultError::InvalidGuardian,
        constraint = vault.guardian_state == guardian_state.key() @ VaultError::GuardianMismatch,
    )]
    pub guardian_state: Account<'info, ProtocolGuard>,

    pub authority: Signer<'info>,

    /// CHECK: Receives withdrawn SOL.
    #[account(mut)]
    pub withdrawer: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ChangeAuthority<'info> {
    #[account(
        mut,
        constraint = vault.authority == authority.key() @ VaultError::UnauthorizedWithdraw,
    )]
    pub vault: Account<'info, Vault>,

    pub authority: Signer<'info>,
}

// ─── State ──────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct Vault {
    /// Current vault authority.
    pub authority: Pubkey,
    /// SOL balance tracked in-program (explicit for invariant checking).
    pub balance: u64,
    /// The Guardian PDA that controls pause state for this vault.
    pub guardian_state: Pubkey,
    /// PDA bump seed.
    pub bump: u8,
}

// ─── Errors ─────────────────────────────────────────────────────────────

#[error_code]
pub enum VaultError {
    #[msg("Protocol is paused by Guardian — withdrawals blocked")]
    ProtocolPaused,
    #[msg("Insufficient vault balance")]
    InsufficientBalance,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Only the vault authority can perform this action")]
    UnauthorizedWithdraw,
    #[msg("Guardian state account has wrong owner")]
    InvalidGuardian,
    #[msg("Guardian state does not match vault configuration")]
    GuardianMismatch,
}

// ─── Events ─────────────────────────────────────────────────────────────

#[event]
pub struct VaultDeposit {
    pub vault: Pubkey,
    pub depositor: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
}

#[event]
pub struct VaultWithdraw {
    pub vault: Pubkey,
    pub withdrawer: Pubkey,
    pub amount: u64,
    pub new_balance: u64,
}

#[event]
pub struct AuthorityChanged {
    pub vault: Pubkey,
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
}
