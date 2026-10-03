import { transactionId } from "@open-graphene/chain-swaplock-api";
import type { ProcessedTransaction } from "@open-graphene/chain-swaplock-bindings";

export function parseBlockHeight(value: string): number | undefined {
  if (!/^[1-9]\d*$/.test(value)) return undefined;
  const height = Number(value);
  return Number.isSafeInteger(height) && height <= 4294967295
    ? height
    : undefined;
}
export function processedTransactionId(
  transaction: ProcessedTransaction,
): string {
  // Graphene hashes the unsigned transaction, excluding signatures and execution results.
  return transactionId({
    ref_block_num: transaction.ref_block_num,
    ref_block_prefix: transaction.ref_block_prefix,
    expiration: transaction.expiration,
    operations: transaction.operations,
    extensions: transaction.extensions,
  });
}
