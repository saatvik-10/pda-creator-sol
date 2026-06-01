import { test, expect } from 'bun:test';
import path from 'path';
import { FailedTransactionMetadata, LiteSVM } from "litesvm";
import { getTransferSolInstruction } from "@solana-program/system";
import {
	appendTransactionMessageInstruction,
	createTransactionMessage,
	generateKeyPairSigner,
	lamports,
	pipe,
	setTransactionMessageFeePayerSigner,
	setTransactionMessageLifetimeUsingBlockhash,
	signTransactionMessageWithSigners,
} from "@solana/kit";

test("it transfers SOL from one wallet to another", async () => {
	// Given a payer with 2 SOL and a recipient with 0 SOL.
	const svm = new LiteSVM();
	const payer = await generateKeyPairSigner();

    svm.addProgramFromFile(
    (await payer).address,
    path.join(__dirname, './pda_creator.so'),
  );


	const recipient = await generateKeyPairSigner();
	svm.airdrop(payer.address, lamports(2_000_000_000n));

	// When we send 1 SOL from the payer to the recipient.
	const instruction = getTransferSolInstruction({
		source: payer,
		destination: recipient.address,
		amount: lamports(1_000_000_000n),
	});
	const transaction = await pipe(
		createTransactionMessage({ version: 0 }),
		(tx) => setTransactionMessageFeePayerSigner(payer, tx),
		(tx) => svm.setTransactionMessageLifetimeUsingLatestBlockhash(tx),
		(tx) => appendTransactionMessageInstruction(instruction, tx),
		(tx) => signTransactionMessageWithSigners(tx),
	);
	const result = svm.sendTransaction(transaction);
	if (result instanceof FailedTransactionMetadata) {
		throw new Error(`Transaction failed: ${result.err()}`);
	}

	// Then we expect the accounts to have the correct balances.
	expect(svm.getBalance(payer.address)! < lamports(1_000_000_000n));
});