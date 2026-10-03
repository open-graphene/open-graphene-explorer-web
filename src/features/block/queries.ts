import { queryOptions } from "@tanstack/react-query";
import type { SwaplockClient } from "@open-graphene/chain-swaplock-api";
import { objectId } from "@open-graphene/primitives";
import { nodeUrl } from "../../lib/config";
import { decodeWitness } from "../witnesses/model";

export function blockQuery(
  client: SwaplockClient | undefined,
  height: number | undefined,
) {
  return queryOptions({
    queryKey: ["block", nodeUrl, height],
    enabled: !!client && height !== undefined,
    staleTime: 30_000,
    queryFn: async ({ signal }) => {
      if (!client || height === undefined)
        throw new Error("Block is not ready");
      const block = await client.database.getBlock({ block_num: height });
      signal.throwIfAborted();
      return block;
    },
  });
}
export function blockHeadQuery(client: SwaplockClient | undefined) {
  return queryOptions({
    queryKey: ["block-head", nodeUrl],
    enabled: !!client,
    staleTime: 5000,
    refetchInterval: 10000,
    queryFn: async () => {
      if (!client) throw new Error("Node is not connected");
      return client.database.getDynamicGlobalProperties({});
    },
  });
}
export function blockWitnessQuery(
  client: SwaplockClient | undefined,
  witnessId: string | undefined,
) {
  return queryOptions({
    queryKey: ["block-witness", nodeUrl, witnessId],
    enabled: !!client && !!witnessId,
    staleTime: 300000,
    queryFn: async ({ signal }) => {
      if (!client || !witnessId) throw new Error("Witness is not ready");
      const [object] = await client.database.getObjects({
        ids: [objectId(witnessId)],
        subscribe: false,
      });
      signal.throwIfAborted();
      const witness = decodeWitness(object?.value, witnessId);
      const [account] = await client.database.getAccounts({
        account_names_or_ids: [witness.accountId],
        subscribe: false,
      });
      signal.throwIfAborted();
      return {
        accountId: witness.accountId,
        name: account?.name ?? witness.accountId,
      };
    },
  });
}
