import assert from "node:assert/strict";
import test from "node:test";
import {
  validateAccountDetailSearch,
  olderHistoryCursor,
} from "../src/features/account/search.ts";
import {
  operationLabel,
  operationSummary,
  operationJson,
} from "../src/features/account/activity.ts";
import {
  accountBalanceBuckets,
  hasTruncatedBalanceBuckets,
} from "../src/features/account/balances.ts";

test("account URL accepts only supported tabs and non-sentinel history cursors", () => {
  assert.deepEqual(
    validateAccountDetailSearch({ tab: "oops", before: "1.2.123" }),
    { tab: "activity" },
  );
  assert.deepEqual(
    validateAccountDetailSearch({ tab: "balances", before: "1.11.50" }),
    { tab: "balances", before: "1.11.50" },
  );
  assert.deepEqual(validateAccountDetailSearch({ before: "1.11.0" }), {
    tab: "activity",
  });
  assert.equal(olderHistoryCursor("1.11.50"), "1.11.49");
  assert.equal(olderHistoryCursor("1.11.1"), undefined);
  assert.equal(olderHistoryCursor("1.11.0"), undefined);
});
test("activity describes transfers and names unknown operations without losing exact amounts", () => {
  const operation = [
    0,
    {
      from: "1.2.4",
      to: "1.2.5",
      amount: { amount: 9007199254740993n, asset_id: "1.3.0" },
    },
  ];
  assert.equal(operationLabel(0), "Transfer");
  assert.equal(operationLabel(999), "Operation 999");
  assert.equal(operationSummary(operation), "1.2.4 → 1.2.5");
  assert.match(operationJson(operation), /9007199254740993/);
});
test("balance buckets preserve bigint, selling asset, collateral asset and deduplicate cashback", () => {
  const vesting = { id: "1.13.1", balance: { asset_id: "1.3.0", amount: 25n } };
  const full = {
    limit_orders: [
      { sell_price: { base: { asset_id: "1.3.1" } }, for_sale: 30n },
      { sell_price: { base: { asset_id: "1.3.1" } }, for_sale: 40n },
    ],
    call_orders: [
      { call_price: { base: { asset_id: "1.3.0" } }, collateral: 80n },
    ],
    vesting_balances: [vesting],
    cashback_balance: vesting,
  };
  const rows = accountBalanceBuckets(
    [{ asset_id: "1.3.0", amount: 9007199254740993n }],
    full,
  );
  assert.deepEqual(rows, [
    {
      assetId: "1.3.0",
      available: 9007199254740993n,
      orders: 0n,
      collateral: 80n,
      vesting: 25n,
    },
    {
      assetId: "1.3.1",
      available: 0n,
      orders: 70n,
      collateral: 0n,
      vesting: 0n,
    },
  ]);
  assert.equal(
    hasTruncatedBalanceBuckets({ balances: true, limit_orders: false }),
    false,
  );
  assert.equal(hasTruncatedBalanceBuckets({ call_orders: true }), true);
});
