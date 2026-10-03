import { queryOptions } from "@tanstack/react-query";
import type { SwaplockClient } from "@open-graphene/chain-swaplock-api";
import { objectId } from "@open-graphene/primitives";
import { nodeUrl } from "../../lib/config";
import { decodeCommitteeMember } from "./model";

export function committeeQuery(client: SwaplockClient | undefined) {
  return queryOptions({
    queryKey: ["explorer", nodeUrl, "active-committee"],
    enabled: Boolean(client),
    staleTime: 30_000,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!client) throw new Error("Node is not connected");
      const [global, core] = await Promise.all([
        client.database.getGlobalProperties({}),
        client.database.asset("1.3.0"),
      ]);
      signal.throwIfAborted();
      const ids = global.active_committee_members;
      const objects = ids.length
        ? await client.database.getObjects({
            ids: ids.map((id) => objectId(id)),
            subscribe: false,
          })
        : [];
      signal.throwIfAborted();
      const members = objects.map((object, index) => {
        const member = decodeCommitteeMember(object?.value);
        if (member.id !== ids[index])
          throw new Error("Node returned a different committee member");
        return { ...member, rank: index + 1 };
      });
      const accounts = members.length
        ? await client.database.getAccounts({
            account_names_or_ids: members.map((member) => member.accountId),
            subscribe: false,
          })
        : [];
      signal.throwIfAborted();
      return {
        core,
        members: members.map((member, index) => ({
          ...member,
          name: accounts[index]?.name ?? member.accountId,
        })),
      };
    },
  });
}
