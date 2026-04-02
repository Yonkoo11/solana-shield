use anchor_lang::prelude::*;

declare_id!("2pizUSNyLBMDM7QNBUxFYs3dQKF1RJwKtP2BTZfbyAMK");

/// Solana Shield Guardian Protocol
///
/// Per-protocol pause/unpause with auto-unpause safety mechanism.
/// Protocols read `ProtocolGuard.is_paused` via account deserialization
/// (no CPI call needed — Anchor validates account owner).
#[program]
pub mod guardian {
    use super::*;

    /// Register a new protocol for monitoring.
    /// Creates a PDA storing pause state and configuration.
    /// Can only be called once per protocol (PDA init enforces uniqueness).
    pub fn register_protocol(
        ctx: Context<RegisterProtocol>,
        auto_unpause_delay: i64,
    ) -> Result<()> {
        let guard = &mut ctx.accounts.protocol_guard;
        guard.protocol = ctx.accounts.protocol.key();
        guard.authority = ctx.accounts.authority.key();
        guard.pauser = ctx.accounts.pauser.key();
        guard.is_paused = false;
        guard.paused_at = 0;
        guard.auto_unpause_delay = auto_unpause_delay;
        guard.bump = ctx.bumps.protocol_guard;

        emit!(ProtocolRegistered {
            protocol: guard.protocol,
            authority: guard.authority,
            pauser: guard.pauser,
            auto_unpause_delay,
        });

        Ok(())
    }

    /// Pause a monitored protocol.
    /// Only callable by the designated pauser (watcher service or protocol team).
    /// Emits PauseActivated event for off-chain indexing.
    pub fn pause(ctx: Context<Pause>) -> Result<()> {
        let guard = &mut ctx.accounts.protocol_guard;

        require!(!guard.is_paused, GuardianError::AlreadyPaused);

        let clock = Clock::get()?;
        guard.is_paused = true;
        guard.paused_at = clock.unix_timestamp;

        emit!(PauseActivated {
            protocol: guard.protocol,
            pauser: ctx.accounts.pauser.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Unpause a monitored protocol.
    /// Only callable by the protocol authority (team multisig).
    pub fn unpause(ctx: Context<Unpause>) -> Result<()> {
        let guard = &mut ctx.accounts.protocol_guard;

        require!(guard.is_paused, GuardianError::NotPaused);

        guard.is_paused = false;
        guard.paused_at = 0;

        emit!(PauseDeactivated {
            protocol: guard.protocol,
            authority: ctx.accounts.authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    /// Permissionless crank: auto-unpause if timeout has elapsed.
    /// Prevents permanent freeze when authority keys are unavailable.
    /// Only works if auto_unpause_delay > 0 (0 means manual-only).
    pub fn crank_auto_unpause(ctx: Context<CrankAutoUnpause>) -> Result<()> {
        let guard = &mut ctx.accounts.protocol_guard;

        require!(guard.is_paused, GuardianError::NotPaused);
        require!(
            guard.auto_unpause_delay > 0,
            GuardianError::AutoUnpauseDisabled
        );

        let clock = Clock::get()?;
        let elapsed = clock.unix_timestamp - guard.paused_at;
        require!(
            elapsed >= guard.auto_unpause_delay,
            GuardianError::AutoUnpauseNotReady
        );

        guard.is_paused = false;
        guard.paused_at = 0;

        emit!(AutoUnpauseTriggered {
            protocol: guard.protocol,
            elapsed_seconds: elapsed,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Rotate the pauser key.
    /// Only callable by the protocol authority.
    pub fn update_pauser(ctx: Context<UpdatePauser>, new_pauser: Pubkey) -> Result<()> {
        let guard = &mut ctx.accounts.protocol_guard;
        let old_pauser = guard.pauser;
        guard.pauser = new_pauser;

        emit!(PauserUpdated {
            protocol: guard.protocol,
            old_pauser,
            new_pauser,
        });

        Ok(())
    }
}

// ─── Accounts ───────────────────────────────────────────────────────────

#[derive(Accounts)]
pub struct RegisterProtocol<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + ProtocolGuard::INIT_SPACE,
        seeds = [b"guardian", protocol.key().as_ref()],
        bump,
    )]
    pub protocol_guard: Account<'info, ProtocolGuard>,

    /// The protocol/vault being monitored (any account — used as PDA seed).
    /// CHECK: This is an arbitrary account used only as a PDA seed.
    pub protocol: UncheckedAccount<'info>,

    /// The authority who can unpause and manage settings.
    /// CHECK: Stored as pubkey, not validated as signer here (signer on other ixs).
    pub authority: UncheckedAccount<'info>,

    /// The pauser who can trigger emergency pause.
    /// CHECK: Stored as pubkey, not validated as signer here (signer on other ixs).
    pub pauser: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Pause<'info> {
    #[account(
        mut,
        seeds = [b"guardian", protocol_guard.protocol.as_ref()],
        bump = protocol_guard.bump,
        constraint = protocol_guard.pauser == pauser.key() @ GuardianError::UnauthorizedPauser,
    )]
    pub protocol_guard: Account<'info, ProtocolGuard>,

    pub pauser: Signer<'info>,
}

#[derive(Accounts)]
pub struct Unpause<'info> {
    #[account(
        mut,
        seeds = [b"guardian", protocol_guard.protocol.as_ref()],
        bump = protocol_guard.bump,
        constraint = protocol_guard.authority == authority.key() @ GuardianError::UnauthorizedAuthority,
    )]
    pub protocol_guard: Account<'info, ProtocolGuard>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CrankAutoUnpause<'info> {
    #[account(
        mut,
        seeds = [b"guardian", protocol_guard.protocol.as_ref()],
        bump = protocol_guard.bump,
    )]
    pub protocol_guard: Account<'info, ProtocolGuard>,
}

#[derive(Accounts)]
pub struct UpdatePauser<'info> {
    #[account(
        mut,
        seeds = [b"guardian", protocol_guard.protocol.as_ref()],
        bump = protocol_guard.bump,
        constraint = protocol_guard.authority == authority.key() @ GuardianError::UnauthorizedAuthority,
    )]
    pub protocol_guard: Account<'info, ProtocolGuard>,

    pub authority: Signer<'info>,
}

// ─── State ──────────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct ProtocolGuard {
    /// The protocol/vault account being monitored.
    pub protocol: Pubkey,
    /// Who can unpause and manage settings (protocol team multisig).
    pub authority: Pubkey,
    /// Who can trigger emergency pause (watcher service key or protocol team).
    pub pauser: Pubkey,
    /// Whether the protocol is currently paused.
    pub is_paused: bool,
    /// Unix timestamp when paused (0 if not paused).
    pub paused_at: i64,
    /// Seconds until auto-unpause (0 = manual-only, prevents permanent freeze).
    pub auto_unpause_delay: i64,
    /// PDA bump seed.
    pub bump: u8,
}

// ─── Errors ─────────────────────────────────────────────────────────────

#[error_code]
pub enum GuardianError {
    #[msg("Protocol is already paused")]
    AlreadyPaused,
    #[msg("Protocol is not paused")]
    NotPaused,
    #[msg("Only the designated pauser can pause")]
    UnauthorizedPauser,
    #[msg("Only the protocol authority can perform this action")]
    UnauthorizedAuthority,
    #[msg("Auto-unpause is disabled (delay is 0)")]
    AutoUnpauseDisabled,
    #[msg("Auto-unpause delay has not elapsed yet")]
    AutoUnpauseNotReady,
}

// ─── Events ─────────────────────────────────────────────────────────────

#[event]
pub struct ProtocolRegistered {
    pub protocol: Pubkey,
    pub authority: Pubkey,
    pub pauser: Pubkey,
    pub auto_unpause_delay: i64,
}

#[event]
pub struct PauseActivated {
    pub protocol: Pubkey,
    pub pauser: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PauseDeactivated {
    pub protocol: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AutoUnpauseTriggered {
    pub protocol: Pubkey,
    pub elapsed_seconds: i64,
    pub timestamp: i64,
}

#[event]
pub struct PauserUpdated {
    pub protocol: Pubkey,
    pub old_pauser: Pubkey,
    pub new_pauser: Pubkey,
}
