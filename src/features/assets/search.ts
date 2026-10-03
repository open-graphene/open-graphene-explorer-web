import type { graphene_swaplock_indexer as api } from "@swaplock-query/api-ts-client";

export const assetSortFields = [
  "symbol",
  "id",
  "precision",
  "last_updated_block",
] as const;
export type AssetSort = (typeof assetSortFields)[number];
export type AssetSearch = {
  q: string;
  field: "symbol" | "id";
  match: "contains" | "startsWith" | "equals";
  sort: AssetSort;
  direction: "asc" | "desc";
  page: number;
  size: 10 | 25 | 50;
};
export const defaultAssetSearch: AssetSearch = {
  q: "",
  field: "symbol",
  match: "contains",
  sort: "symbol",
  direction: "asc",
  page: 1,
  size: 25,
};

export function validateAssetSearch(
  search: Record<string, unknown>,
): AssetSearch {
  const rawSize = Number(search.size);
  const size = rawSize === 10 || rawSize === 50 ? rawSize : 25;
  const rawPage = Number(search.page);
  const page =
    Number.isSafeInteger(rawPage) && rawPage > 0
      ? Math.min(rawPage, 1_000_000)
      : 1;
  return {
    q: typeof search.q === "string" ? search.q.trim().slice(0, 100) : "",
    field: search.field === "id" ? "id" : "symbol",
    match:
      search.match === "equals" || search.match === "startsWith"
        ? search.match
        : "contains",
    sort: assetSortFields.includes(search.sort as AssetSort)
      ? (search.sort as AssetSort)
      : "symbol",
    direction: search.direction === "desc" ? "desc" : "asc",
    page,
    size,
  };
}

export function assetListRequest(
  search: AssetSearch,
): NonNullable<api.GrapheneSwaplockIndexerSeaQueryGetAssetsQueryData["query"]> {
  const filters: api.FilterGroup[] = [];
  if (search.q) {
    // Object-ID fields accept text filters on their full 1.3.x representation.
    const query =
      search.field === "id" && /^\d+$/.test(search.q)
        ? `1.3.${search.q}`
        : search.q;
    filters.push({
      field: search.field,
      conditions: [{ filterType: "text", op: search.match, value: query }],
    });
  }
  const sort: api.SortItem[] = [{ field: search.sort, sort: search.direction }];
  if (search.sort !== "id") sort.push({ field: "id", sort: "asc" });
  return {
    offset: (search.page - 1) * search.size,
    limit: search.size,
    filters,
    sort,
  };
}

export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(total / size));
}
