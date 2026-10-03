import { queryOptions } from "@tanstack/react-query";
import { graphene_swaplock_indexer as api } from "@swaplock-query/api-ts-client";
import { createClient } from "@swaplock-query/api-ts-client/generated/client/index";
import {
  AssetObjectCodec,
  AssetDynamicDataObjectCodec,
  parseJson,
} from "@open-graphene/chain-swaplock-bindings";
import { queryApiUrl } from "../../lib/config";
import { serializeStructuredQuery } from "../../lib/structuredQuery";
import { accountListRequest, type AccountSearch } from "./search";

const client = createClient({ baseUrl: queryApiUrl, credentials: "omit" });
const requestSignal = (signal: AbortSignal) =>
  AbortSignal.any([signal, AbortSignal.timeout(12_000)]);

export function accountsQuery(search: AccountSearch) {
  return queryOptions({
    queryKey: ["explorer", queryApiUrl, "accounts", search],
    queryFn: async ({ signal }) => {
      const { data } =
        await api.grapheneSwaplockIndexerSeaQueryGetAccountsQuery({
          client,
          signal: requestSignal(signal),
          throwOnError: true,
          query: accountListRequest(search),
          querySerializer: serializeStructuredQuery,
        });
      return data;
    },
    staleTime: 30_000,
  });
}

export function accountBalancesQuery(ids: readonly number[]) {
  return queryOptions({
    queryKey: ["explorer", queryApiUrl, "account-core-balances", ids],
    enabled: ids.length > 0,
    queryFn: async ({ signal }) => {
      const balances = new Map<number, bigint>();
      const failures: { id: number; message: string }[] = [];
      // This endpoint reads one account at a time. Keep requests bounded to the visible page.
      for (let offset = 0; offset < ids.length; offset += 5) {
        signal.throwIfAborted();
        const batch = ids.slice(offset, offset + 5);
        const results = await Promise.allSettled(
          batch.map(async (id) => {
            const { data } =
              await api.grapheneSwaplockIndexerAccountsGetBalancesQuery({
                client,
                signal: requestSignal(signal),
                throwOnError: true,
                query: { account: `1.2.${id}` },
              });
            const core = data.balances.find(
              (balance) => balance.asset_id === 0,
            );
            // An absent balance in a successful response means zero. Failure means unknown.
            if (!core) return 0n;
            if (!Number.isSafeInteger(core.amount))
              throw new Error(
                "Balance exceeds the API's safe integer precision",
              );
            return BigInt(core.amount);
          }),
        );
        results.forEach((result, index) => {
          if (result.status === "fulfilled")
            balances.set(batch[index], result.value);
          else
            failures.push({
              id: batch[index],
              message:
                result.reason instanceof Error
                  ? result.reason.message
                  : "Balance unavailable",
            });
        });
      }
      signal.throwIfAborted();
      return { balances, failures };
    },
    structuralSharing: false,
    staleTime: 30_000,
  });
}

export const coreAssetQuery = queryOptions({
  queryKey: ["explorer", queryApiUrl, "core-asset-supply"],
  queryFn: async ({ signal }) => {
    const { data } = await api.grapheneSwaplockIndexerObjectsGetCurrentQuery({
      client,
      signal: requestSignal(signal),
      throwOnError: true,
      query: { object_id: "1.3.0" },
    });
    if (!data.object?.state) throw new Error("Core asset is not indexed");
    const asset = AssetObjectCodec.decode(
      parseJson(JSON.stringify(data.object.state)),
    );
    const response = await api.grapheneSwaplockIndexerObjectsGetCurrentQuery({
      client,
      signal: requestSignal(signal),
      throwOnError: true,
      query: { object_id: asset.dynamic_asset_data_id },
    });
    if (!response.data.object?.state)
      throw new Error("Core asset supply is not indexed");
    const dynamic = AssetDynamicDataObjectCodec.decode(
      parseJson(JSON.stringify(response.data.object.state)),
    );
    return { asset, supply: dynamic.current_supply };
  },
  structuralSharing: false,
  staleTime: 30_000,
});
