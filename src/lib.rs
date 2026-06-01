use solana_program::{
    account_info::{AccountInfo, next_account_info},
    entrypoint::{ProgramResult, entrypoint},
    program::invoke_signed,
    program_error::ProgramError,
    pubkey::Pubkey,
};

use solana_system_interface::instruction::create_account;

entrypoint!(process_instruction);

fn process_instruction(
    pubkey: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    let mut iter = accounts.iter();

    let payer_account = next_account_info(&mut iter)?;
    let pda_account = next_account_info(&mut iter)?;
    let _system_program = next_account_info(&mut iter)?;

    let (pda, bump) =
        Pubkey::find_program_address(&[b"client", payer_account.key.as_ref()], &pubkey);

    if pda != *pda_account.key {
        return Err(ProgramError::IncorrectAuthority);
    }

    let ix = create_account(payer_account.key, &pda, 1000_000_000, 4, pubkey);

    let signer_seeds = &[b"client", payer_account.key.as_ref(), &[bump]];

    invoke_signed(&ix, accounts, &[signer_seeds])?;

    Ok(())
}
