import { queryOptions } from "@tanstack/react-query";
import { graphene_swaplock_indexer as api } from "@swaplock-query/api-ts-client";
import { createClient } from "@swaplock-query/api-ts-client/generated/client/index";
import { queryApiUrl } from "../../lib/config";

const client = createClient({ baseUrl: queryApiUrl, credentials: "omit" });
const requestSignal = (signal: AbortSignal) =>
  AbortSignal.any([signal, AbortSignal.timeout(12_000)]);

export const recentBlocksQuery = queryOptions({
  queryKey: ["explorer", queryApiUrl, "blocks"],
  queryFn: async ({ signal }) => {
    const { data } = await api.grapheneSwaplockIndexerBlocksGetLatestQuery({
      client,
      signal: requestSignal(signal),
      throwOnError: true,
      query: { limit: 30 },
    });
    return data.blocks;
  },
  refetchInterval: 3000,
});

export const witnessesQuery = queryOptions({
  queryKey: ["explorer", queryApiUrl, "witnesses"],
  queryFn: async ({ signal }) => {
    const { data } = await api.grapheneSwaplockIndexerWitnessesGetListQuery({
      client,
      signal: requestSignal(signal),
      throwOnError: true,
      query: { limit: 1000 },
    });
    return data.witnesses;
  },
  staleTime: 60_000,
  refetchInterval: 60_000,
});

export const recentOperationsQuery = queryOptions({
  queryKey: ["explorer", queryApiUrl, "operations"],
  queryFn: async ({ signal }) => {
    const { data } = await api.grapheneSwaplockIndexerOperationsGetLatestQuery({
      client,
      signal: requestSignal(signal),
      throwOnError: true,
      query: { limit: 16, is_virtual: false },
    });
    return data.operations;
  },
  refetchInterval: 3000,
});

export const operationTypesQuery = queryOptions({
  queryKey: ["explorer", queryApiUrl, "operation-types"],
  queryFn: async ({ signal }) => {
    const { data } = await api.grapheneSwaplockIndexerOperationsGetTypesQuery({
      client,
      signal: requestSignal(signal),
      throwOnError: true,
    });
    return data.types;
  },
  staleTime: Infinity,
});
