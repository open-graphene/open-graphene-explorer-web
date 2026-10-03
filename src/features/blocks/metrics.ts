import type { graphene_swaplock_indexer } from "@swaplock-query/api-ts-client";

export type Block = graphene_swaplock_indexer.GrapheneSwaplockIndexerBlock;

export function timestampMilliseconds(timestamp: string): number {
  // Graphene RPC timestamps omit the UTC suffix; indexer timestamps include it.
  const utcTimestamp = /(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp)
    ? timestamp
    : `${timestamp}Z`;
  return Date.parse(utcTimestamp);
}

export function blockMetrics(blocks: readonly Block[]) {
  const sorted = [...blocks].sort((a, b) => b.block_num - a.block_num);
  const consecutive: Block[] = [];
  // Do not calculate throughput across a gap in the indexed block window.
  for (const block of sorted) {
    const previous = consecutive.at(-1);
    if (previous && previous.block_num - block.block_num !== 1) break;
    if (!Number.isFinite(timestampMilliseconds(block.timestamp))) break;
    consecutive.push(block);
  }
  const chronological = [...consecutive].reverse();
  const intervals = chronological.slice(1).map((block, index) => ({
    block: block.block_num,
    value:
      (timestampMilliseconds(block.timestamp) -
        timestampMilliseconds(chronological[index].timestamp)) /
      1000,
  }));
  const elapsed = intervals.reduce((sum, interval) => sum + interval.value, 0);
  const validIntervals =
    intervals.length > 0 && intervals.every((interval) => interval.value > 0);
  const transactionCount = consecutive.reduce(
    (sum, block) => sum + block.tx_count,
    0,
  );
  return {
    intervals: validIntervals ? intervals : [],
    transactions: chronological.map((block) => ({
      block: block.block_num,
      value: block.tx_count,
    })),
    transactionsPerSecond: validIntervals ? transactionCount / elapsed : null,
    transactionsPerBlock: consecutive.length
      ? transactionCount / consecutive.length
      : null,
    // Match the reference's estimate, not the chain's irreversible block height.
    confirmationSeconds: validIntervals ? elapsed / intervals.length / 2 : null,
    hasGap: consecutive.length !== sorted.length,
  };
}

export function blockAge(timestamp: string, now: number): string {
  const elapsed = Math.max(
    0,
    Math.floor((now - timestampMilliseconds(timestamp)) / 1000),
  );
  if (!Number.isFinite(elapsed)) return "Unavailable";
  if (elapsed < 1) return "Just now";
  if (elapsed < 60) return `${elapsed}s ago`;
  return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s ago`;
}

export function formatWholeSupply(
  raw: bigint,
  precision: number,
  symbol: string,
): string {
  const scale = 10n ** BigInt(precision);
  const rounded = (raw + scale / 2n) / scale;
  return `${new Intl.NumberFormat("en-US").format(rounded)} ${symbol}`;
}
