import type {
  Asset,
  AssetId,
  FullAccount,
} from "@open-graphene/chain-swaplock-bindings";
export type BalanceBuckets = {
  assetId: AssetId;
  available: bigint;
  orders: bigint;
  collateral: bigint;
  vesting: bigint;
};
export function accountBalanceBuckets(
  available: readonly Asset[],
  full: FullAccount,
): BalanceBuckets[] {
  const assets = new Map<AssetId, BalanceBuckets>();
  function row(assetId: AssetId) {
    let balance = assets.get(assetId);
    if (!balance) {
      balance = {
        assetId,
        available: 0n,
        orders: 0n,
        collateral: 0n,
        vesting: 0n,
      };
      assets.set(assetId, balance);
    }
    return balance;
  }
  for (const balance of available)
    row(balance.asset_id).available += balance.amount;
  for (const order of full.limit_orders)
    row(order.sell_price.base.asset_id).orders += order.for_sale;
  for (const order of full.call_orders)
    row(order.call_price.base.asset_id).collateral += order.collateral;
  const vesting = [...full.vesting_balances];
  if (
    full.cashback_balance &&
    !vesting.some((balance) => balance.id === full.cashback_balance?.id)
  )
    vesting.push(full.cashback_balance);
  for (const balance of vesting)
    row(balance.balance.asset_id).vesting += balance.balance.amount;
  return [...assets.values()];
}
export function hasTruncatedBalanceBuckets(more: unknown): boolean {
  if (!more || typeof more !== "object") return false;
  const flags = more as Record<string, unknown>;
  return ["limit_orders", "call_orders", "vesting_balances"].some(
    (key) => flags[key] === true,
  );
}
