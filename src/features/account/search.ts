export type AccountDetailSearch = {
  tab: "activity" | "balances";
  before?: string;
};
export const defaultAccountDetailSearch = { tab: "activity" as const };
export function validateAccountDetailSearch(
  search: Record<string, unknown>,
): AccountDetailSearch {
  const before =
    typeof search.before === "string" &&
    /^1\.11\.[1-9]\d{0,17}$/.test(search.before)
      ? search.before
      : undefined;
  return {
    tab: search.tab === "balances" ? "balances" : "activity",
    ...(before ? { before } : {}),
  };
}
export function olderHistoryCursor(oldestId: string): string | undefined {
  const instance = BigInt(oldestId.split(".")[2]);
  // 1.11.0 is the RPC sentinel for newest, so never use it as an older cursor.
  return instance > 1n ? `1.11.${instance - 1n}` : undefined;
}
