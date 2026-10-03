import { serializeStructuredQuery } from "../../lib/structuredQuery";
import { queryOptions } from "@tanstack/react-query";
import { graphene_swaplock_indexer as api } from "@swaplock-query/api-ts-client";
import { createClient } from "@swaplock-query/api-ts-client/generated/client/index";
import {
  AssetObjectCodec,
  AssetDynamicDataObjectCodec,
  parseJson,
} from "@open-graphene/chain-swaplock-bindings";
import { queryApiUrl } from "../../lib/config";
import { assetListRequest, type AssetSearch } from "./search";

const client = createClient({ baseUrl: queryApiUrl, credentials: "omit" });
const requestSignal = (signal: AbortSignal) =>
  AbortSignal.any([signal, AbortSignal.timeout(12_000)]);

export function assetsQuery(search: AssetSearch) {
  return queryOptions({
    queryKey: ["explorer", queryApiUrl, "assets", search],
    queryFn: async ({ signal }) => {
      const { data } = await api.grapheneSwaplockIndexerSeaQueryGetAssetsQuery({
        client,
        signal: requestSignal(signal),
        throwOnError: true,
        query: assetListRequest(search),
        querySerializer: serializeStructuredQuery,
      });
      return data;
    },
    staleTime: 30_000,
  });
}

async function readAssetMetadata(id: number, signal: AbortSignal) {
  const response = await api.grapheneSwaplockIndexerObjectsGetCurrentQuery({
    client,
    signal: requestSignal(signal),
    throwOnError: true,
    query: { object_id: `1.3.${id}` },
  });
  if (!response.data.object?.state)
    throw new Error("Asset state is not indexed");
  const asset = AssetObjectCodec.decode(
    parseJson(JSON.stringify(response.data.object.state)),
  );
  const supplyResponse =
    await api.grapheneSwaplockIndexerObjectsGetCurrentQuery({
      client,
      signal: requestSignal(signal),
      throwOnError: true,
      query: { object_id: asset.dynamic_asset_data_id },
    });
  const supplyState = supplyResponse.data.object?.state;
  const supply = supplyState
    ? AssetDynamicDataObjectCodec.decode(parseJson(JSON.stringify(supplyState)))
    : null;
  return { asset, supply };
}
export type AssetMetadata = Awaited<ReturnType<typeof readAssetMetadata>>;

export function assetMetadataQuery(ids: readonly number[]) {
  return queryOptions({
    queryKey: ["explorer", queryApiUrl, "asset-metadata", ids],
    enabled: ids.length > 0,
    queryFn: async ({ signal }) => {
      const assets = new Map<number, AssetMetadata>();
      const failures: { id: number; message: string }[] = [];
      // The current contract has no batch object lookup. Bound concurrency and only read this page.
      for (let offset = 0; offset < ids.length; offset += 5) {
        signal.throwIfAborted();
        const batch = ids.slice(offset, offset + 5);
        const results = await Promise.allSettled(
          batch.map((id) => readAssetMetadata(id, signal)),
        );
        results.forEach((result, index) => {
          if (result.status === "fulfilled")
            assets.set(batch[index], result.value);
          else
            failures.push({
              id: batch[index],
              message:
                result.reason instanceof Error
                  ? result.reason.message
                  : "Asset details could not be read",
            });
        });
      }
      signal.throwIfAborted();
      return { assets, failures };
    },
    structuralSharing: false,
    staleTime: 30_000,
  });
}

export function issuersQuery(ids: readonly string[]) {
  return queryOptions({
    queryKey: ["explorer", queryApiUrl, "asset-issuers", ids],
    enabled: ids.length > 0,
    queryFn: async ({ signal }) => {
      const { data } =
        await api.grapheneSwaplockIndexerSeaQueryGetAccountsQuery({
          client,
          signal: requestSignal(signal),
          throwOnError: true,
          query: {
            limit: 200,
            filters: [
              {
                field: "id",
                conditions: [
                  { filterType: "number", op: "inSet", values: [...ids] },
                ],
              },
            ],
          },
          querySerializer: serializeStructuredQuery,
        });
      return new Map(
        data.data.map((account) => [`1.2.${account.id}`, account.name]),
      );
    },
    structuralSharing: false,
    staleTime: 300_000,
  });
}
