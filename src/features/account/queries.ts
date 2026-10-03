import { queryOptions } from "@tanstack/react-query";
import type { SwaplockClient } from "@open-graphene/chain-swaplock-api";
import { OperationHistoryId } from "@open-graphene/chain-swaplock-bindings";
import { accountBalanceBuckets, hasTruncatedBalanceBuckets } from "./balances";
import { nodeUrl } from "../../lib/config";

export const historyPageSize = 25;
// RPC transport owns request timeouts. Check cancellation between dependent calls;
// leaving this page closes its connection through useChainConnection.
export function accountQuery(client: SwaplockClient | undefined, name: string) {
  return queryOptions({
    queryKey: ["account", nodeUrl, name],
    enabled: !!client,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      if (!client) throw new Error("Node is not connected");
      const accounts = await client.database.getAccounts({
        account_names_or_ids: [name],
        subscribe: false,
      });
      signal.throwIfAborted();
      return accounts[0] ?? null;
    },
  });
}
export function balancesQuery(
  client: SwaplockClient | undefined,
  accountId: string | undefined,
) {
  return queryOptions({
    queryKey: ["account-balances", nodeUrl, accountId],
    enabled: !!client && !!accountId,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      if (!client || !accountId) throw new Error("Account is not ready");
      const [available, fullAccounts] = await Promise.all([
        client.database.getAccountBalances({
          account_name_or_id: accountId,
          assets: [],
        }),
        client.database.getFullAccounts({
          names_or_ids: [accountId],
          subscribe: false,
        }),
      ]);
      signal.throwIfAborted();
      const full = fullAccounts[0]?.[1];
      if (!full)
        throw new Error(
          "Account balance details were not returned by the node",
        );
      const buckets = accountBalanceBuckets(available, full);
      const assets = buckets.length
        ? await client.database.getAssets({
            asset_symbols_or_ids: buckets.map((balance) => balance.assetId),
            subscribe: false,
          })
        : [];
      signal.throwIfAborted();
      const rows = buckets
        .map((balance) => ({
          ...balance,
          asset: assets.find((asset) => asset?.id === balance.assetId) ?? null,
        }))
        .sort((a, b) =>
          (a.asset?.symbol ?? a.assetId).localeCompare(
            b.asset?.symbol ?? b.assetId,
          ),
        );
      return {
        rows,
        truncated: hasTruncatedBalanceBuckets(full.more_data_available),
      };
    },
  });
}
export function historyQuery(
  client: SwaplockClient | undefined,
  accountId: string | undefined,
  before?: string,
) {
  return queryOptions({
    queryKey: ["account-history", nodeUrl, accountId, before],
    enabled: !!client && !!accountId,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      if (!client || !accountId) throw new Error("Account is not ready");
      const history = await client.history.getAccountHistory({
        account_name_or_id: accountId,
        stop: OperationHistoryId("1.11.0"),
        start: OperationHistoryId(before ?? "1.11.0"),
        limit: historyPageSize + 1,
      });
      signal.throwIfAborted();
      return {
        operations: history.slice(0, historyPageSize),
        hasOlder: history.length > historyPageSize,
      };
    },
  });
}
