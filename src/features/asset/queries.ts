import { queryOptions } from "@tanstack/react-query";
import type { SwaplockClient } from "@open-graphene/chain-swaplock-api";
import { objectId } from "@open-graphene/primitives";
import { graphene_swaplock_indexer as api } from "@swaplock-query/api-ts-client";
import { createClient } from "@swaplock-query/api-ts-client/generated/client/index";
import { nodeUrl, queryApiUrl } from "../../lib/config";
const queryClient = createClient({ baseUrl: queryApiUrl, credentials: "omit" });
export const holdersPageSize = 25;
export function assetQuery(client: SwaplockClient | undefined, name: string) {
  return queryOptions({
    queryKey: ["asset", nodeUrl, name],
    enabled: !!client,
    staleTime: 30000,
    queryFn: async ({ signal }) => {
      if (!client) throw new Error("Node is not connected");
      const [asset] = await client.database.getAssets({
        asset_symbols_or_ids: [name],
        subscribe: false,
      });
      signal.throwIfAborted();
      return asset ?? null;
    },
  });
}
export function assetSupplyQuery(
  client: SwaplockClient | undefined,
  id: string | undefined,
) {
  return queryOptions({
    queryKey: ["asset-supply", nodeUrl, id],
    enabled: !!client && !!id,
    staleTime: 15000,
    queryFn: async ({ signal }) => {
      if (!client || !id) throw new Error("Asset is not ready");
      const [object] = await client.database.getObjects({
        ids: [objectId(id)],
        subscribe: false,
      });
      signal.throwIfAborted();
      if (object?.kind !== "asset_dynamic_data" || object.value.id !== id)
        throw new Error("Asset supply is unavailable");
      return object.value;
    },
  });
}
export function assetIssuerQuery(
  client: SwaplockClient | undefined,
  id: string | undefined,
) {
  return queryOptions({
    queryKey: ["asset-issuer", nodeUrl, id],
    enabled: !!client && !!id,
    staleTime: 300000,
    queryFn: async ({ signal }) => {
      if (!client || !id) throw new Error("Asset is not ready");
      const [account] = await client.database.getAccounts({
        account_names_or_ids: [id],
        subscribe: false,
      });
      signal.throwIfAborted();
      if (!account) throw new Error("Issuer account is unavailable");
      return account;
    },
  });
}
export function assetHoldersQuery(
  assetId: string | undefined,
  page: number,
  enabled: boolean,
) {
  return queryOptions({
    queryKey: ["asset-holders", queryApiUrl, assetId, page],
    enabled: enabled && !!assetId,
    staleTime: 30000,
    queryFn: async ({ signal }) => {
      if (!assetId) throw new Error("Asset is not ready");
      const { data } = await api.grapheneSwaplockIndexerAssetsGetHoldersQuery({
        client: queryClient,
        throwOnError: true,
        signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
        query: {
          asset: assetId,
          limit: holdersPageSize + 1,
          offset: (page - 1) * holdersPageSize,
        },
      });
      return {
        rows: data.holders.slice(0, holdersPageSize),
        hasNext: data.holders.length > holdersPageSize,
      };
    },
  });
}
