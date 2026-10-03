import { queryOptions } from "@tanstack/react-query";
import type { SwaplockClient } from "@open-graphene/chain-swaplock-api";
import { objectId } from "@open-graphene/primitives";
import { nodeUrl } from "../../lib/config";
import { decodeWitness } from "./model";

export function activeWitnessesQuery(client: SwaplockClient) {
  return queryOptions({
    queryKey: ["explorer", nodeUrl, "active-witnesses-rpc"],
    queryFn: async ({ signal }) => {
      signal.throwIfAborted();
      const [global, dynamic, asset] = await Promise.all([
        client.database.getGlobalProperties({}),
        client.database.getDynamicGlobalProperties({}),
        client.database.asset("1.3.0"),
      ]);
      signal.throwIfAborted();
      const objects = await client.database.getObjects({
        ids: global.active_witnesses.map((id) => objectId(id)),
        subscribe: false,
      });
      const witnesses = objects.map((object, index) =>
        decodeWitness(object?.value, global.active_witnesses[index]),
      );
      signal.throwIfAborted();
      const accounts = await client.database.getAccounts({
        account_names_or_ids: witnesses.map((witness) => witness.accountId),
        subscribe: false,
      });
      signal.throwIfAborted();
      const names = new Map(
        accounts
          .filter((account) => account !== null)
          .map((account) => [String(account.id), account.name]),
      );
      return {
        global,
        dynamic,
        asset,
        witnesses: witnesses.map((witness) => ({
          ...witness,
          name: names.get(witness.accountId) ?? witness.accountId,
        })),
      };
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
    retry: 1,
  });
}
