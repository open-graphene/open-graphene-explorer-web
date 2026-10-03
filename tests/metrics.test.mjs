import test from "node:test";
import assert from "node:assert/strict";
import {
  blockMetrics,
  blockAge,
  timestampMilliseconds,
  formatWholeSupply,
} from "../src/features/blocks/metrics.ts";

const block = (height, seconds, transactions = 0) => ({
  block_num: height,
  timestamp: `2026-10-03T12:00:${String(seconds).padStart(2, "0")}Z`,
  tx_count: transactions,
});

test("matches the reference confirmation and throughput calculations for consecutive blocks", () => {
  const metrics = blockMetrics([
    block(3, 6, 2),
    block(1, 0, 1),
    block(2, 3, 3),
  ]);
  assert.equal(metrics.confirmationSeconds, 1.5);
  assert.equal(metrics.transactionsPerSecond, 1);
  assert.equal(metrics.transactionsPerBlock, 2);
  assert.deepEqual(
    metrics.intervals.map((point) => point.value),
    [3, 3],
  );
});
test("never calculates time-based rates without a positive elapsed interval", () => {
  for (const blocks of [[], [block(1, 0)], [block(2, 0), block(1, 0)]]) {
    assert.equal(blockMetrics(blocks).transactionsPerSecond, null);
    assert.equal(blockMetrics(blocks).confirmationSeconds, null);
  }
  assert.equal(blockMetrics([]).transactionsPerBlock, null);
  assert.equal(blockMetrics([block(1, 0)]).transactionsPerBlock, 0);
});
test("stops at a missing block instead of averaging across an indexing gap", () => {
  const metrics = blockMetrics([
    block(5, 15, 2),
    block(4, 12, 1),
    block(2, 6, 100),
  ]);
  assert.equal(metrics.hasGap, true);
  assert.equal(metrics.transactionsPerSecond, 1);
  assert.deepEqual(
    metrics.transactions.map((point) => point.block),
    [4, 5],
  );
});
test("handles UTC timestamps and a node clock slightly ahead of the browser", () => {
  assert.equal(
    timestampMilliseconds("2026-10-03T12:00:00"),
    Date.parse("2026-10-03T12:00:00Z"),
  );
  assert.equal(
    blockAge("2026-10-03T12:00:01", Date.parse("2026-10-03T12:00:00Z")),
    "Just now",
  );
  assert.equal(blockAge("invalid", Date.now()), "Unavailable");
});
test("rounds supply like the reference without converting raw amounts to floating point", () => {
  assert.equal(formatWholeSupply(409318383814n, 5, "BTS"), "4,093,184 BTS");
  assert.equal(formatWholeSupply(0n, 5, "BTS"), "0 BTS");
  assert.equal(
    formatWholeSupply(9007199254740993n, 0, "BTS"),
    "9,007,199,254,740,993 BTS",
  );
});
