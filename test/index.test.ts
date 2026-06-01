import { test, expect, beforeAll, describe } from 'bun:test';
import { LiteSVM } from 'litesvm';
import {
  AccountRole,
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createTransactionMessage,
  generateKeyPairSigner,
  getAddressEncoder,
  getProgramDerivedAddress,
  lamports,
  pipe,
  setTransactionMessageFeePayer,
  signTransaction,
  type Address,
  type KeyPairSigner,
} from '@solana/kit';

describe('Create pda from client', () => {
  let liveSvm: LiteSVM;
  let programId: Address;
  let pda: Address;
  let bump: number;
  let payer: KeyPairSigner;

  beforeAll(async () => {
    liveSvm = new LiteSVM();
    const programPath = new URL('./pda_creator.so', import.meta.url).pathname;

    programId = (await generateKeyPairSigner()).address;
    payer = await generateKeyPairSigner();

    liveSvm.addProgramFromFile(programId, programPath);
    liveSvm.airdrop(payer.address, lamports(100_000_000_000n));

    const addressEncoder = getAddressEncoder();
    const [derivedAddress, bumpSeed] = await getProgramDerivedAddress({
      programAddress: programId,
      seeds: ['client', addressEncoder.encode(payer.address)],
    });
    pda = derivedAddress;
    bump = Number(bumpSeed);

    const systemProgramId = address('11111111111111111111111111111111');
    const ix = {
      programAddress: programId,
      accounts: [
        { address: payer.address, role: AccountRole.WRITABLE_SIGNER },
        { address: pda, role: AccountRole.WRITABLE },
        { address: systemProgramId, role: AccountRole.READONLY },
      ],
      data: new Uint8Array(),
    } as const;

    const txMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayer(payer.address, m),
      (m) => liveSvm.setTransactionMessageLifetimeUsingLatestBlockhash(m),
      (m) => appendTransactionMessageInstruction(ix, m),
    );

    const tx = compileTransaction(txMessage);
    const signedTx = await signTransaction([payer.keyPair], tx);
    const res = liveSvm.sendTransaction(signedTx);
    console.log({ bump, res });
  });

  test('should create pda', () => {
    const balance = liveSvm.getBalance(pda);
    console.log(balance);
    expect(balance).not.toBeNull();
    expect(balance).toBe(lamports(1_000_000_000n));
  });
});
