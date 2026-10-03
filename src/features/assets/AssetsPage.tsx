import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Route } from "../../routes/explorer.assets";
import { referenceUrl } from "../../lib/config";
import { assetMetadataQuery, assetsQuery, issuersQuery } from "./queries";
import {
  defaultAssetSearch,
  pageCount,
  type AssetSearch,
  type AssetSort,
} from "./search";
import { formatAssetAmount, formatIndexedAmount } from "../../lib/amounts";
import * as styles from "../explorer-list/list.css";

const number = new Intl.NumberFormat("en-US");
const sortLabels: Record<AssetSort, string> = {
  symbol: "Symbol",
  id: "Asset ID",
  precision: "Precision",
  last_updated_block: "Last updated block",
};

export function AssetsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [draft, setDraft] = useState(search.q);
  const [jumpPage, setJumpPage] = useState(String(search.page));
  const scrollArea = useRef<HTMLDivElement>(null);
  const assets = useQuery(assetsQuery(search));
  const rows = assets.data?.data ?? [];
  const metadata = useQuery(assetMetadataQuery(rows.map((asset) => asset.id)));
  const issuerIds = [
    ...new Set(
      [...(metadata.data?.assets.values() ?? [])].map((item) =>
        String(item.asset.issuer),
      ),
    ),
  ].sort();
  const issuers = useQuery(issuersQuery(issuerIds));
  const total = assets.data?.total;
  const pages = total === undefined ? undefined : pageCount(total, search.size);
  const busy = assets.isFetching;
  const hasFilter = search.q.length > 0;
  const changed =
    hasFilter ||
    search.field !== "symbol" ||
    search.match !== "contains" ||
    search.sort !== "symbol" ||
    search.direction !== "asc" ||
    search.size !== 25;

  useEffect(() => setDraft(search.q), [search.q]);
  useEffect(() => {
    setJumpPage(String(search.page));
    scrollArea.current?.scrollTo({ top: 0, left: 0 });
  }, [
    search.page,
    search.size,
    search.q,
    search.field,
    search.match,
    search.sort,
    search.direction,
  ]);
  useEffect(() => {
    if (
      pages !== undefined &&
      search.page > pages &&
      !assets.isFetching &&
      !assets.isError
    ) {
      void navigate({ search: { ...search, page: pages }, replace: true });
    }
  }, [pages, search, navigate, assets.isFetching, assets.isError]);

  function update(patch: Partial<AssetSearch>) {
    void navigate({ search: { ...search, ...patch, page: patch.page ?? 1 } });
  }
  function sortBy(field: AssetSort) {
    update({
      sort: field,
      direction:
        search.sort === field && search.direction === "asc" ? "desc" : "asc",
    });
  }
  function reset() {
    setDraft("");
    void navigate({ search: defaultAssetSearch });
  }
  function refresh() {
    void assets.refetch();
    if (rows.length) void metadata.refetch();
    if (issuerIds.length) void issuers.refetch();
  }
  function sortHeading(field: AssetSort) {
    const active = search.sort === field;
    return (
      <th
        scope="col"
        aria-sort={
          active
            ? search.direction === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        <button
          onClick={() => sortBy(field)}
          title={`Sort all assets by ${sortLabels[field].toLowerCase()}`}
          className={styles.sortButton}
        >
          {sortLabels[field]}{" "}
          <span aria-hidden="true">
            {active ? (search.direction === "asc" ? "↑" : "↓") : "↕"}
          </span>
        </button>
      </th>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="assets-title">
      <div className={styles.heading}>
        <div>
          <h1 id="assets-title">Assets</h1>
          <p>Explore the assets on Swaplock.</p>
        </div>
        <button onClick={refresh} disabled={busy}>
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <form
        className={styles.filters}
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: draft.trim().slice(0, 100) });
        }}
      >
        <label className={styles.searchField}>
          <span>Search assets</span>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={100}
            placeholder={
              search.field === "symbol"
                ? "Symbol, e.g. BTS"
                : "Asset ID, e.g. 1.3.0"
            }
            type="search"
          />
        </label>
        <label>
          <span>Search by</span>
          <select
            aria-label="Search by"
            value={search.field}
            onChange={(event) =>
              update({
                field: event.target.value as AssetSearch["field"],
                q: draft.trim(),
              })
            }
          >
            <option value="symbol">Symbol</option>
            <option value="id">Asset ID</option>
          </select>
        </label>
        <label>
          <span>Match</span>
          <select
            aria-label="Match"
            value={search.match}
            onChange={(event) =>
              update({
                match: event.target.value as AssetSearch["match"],
                q: draft.trim(),
              })
            }
          >
            <option value="contains">Contains</option>
            <option value="startsWith">Starts with</option>
            <option value="equals">Exact match</option>
          </select>
        </label>
        <button type="submit" className={styles.searchButton}>
          Search
        </button>
        {changed && (
          <button type="button" onClick={reset}>
            Reset
          </button>
        )}
      </form>
      <div className={styles.toolbar}>
        <p role="status" aria-live="polite">
          {assets.isPending
            ? "Loading assets…"
            : total === undefined
              ? "Assets unavailable"
              : `${number.format(total)} ${total === 1 ? "asset" : "assets"}${hasFilter ? ` matching “${search.q}”` : " on Swaplock"}`}
          {busy && assets.data ? " · Updating…" : ""}
        </p>
        <div className={styles.sortControls}>
          <label>
            <span>Sort by</span>
            <select
              aria-label="Sort by"
              value={search.sort}
              onChange={(event) =>
                update({ sort: event.target.value as AssetSort })
              }
            >
              {Object.entries(sortLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() =>
              update({ direction: search.direction === "asc" ? "desc" : "asc" })
            }
            aria-label={`Sort ${search.direction === "asc" ? "descending" : "ascending"}`}
          >
            {search.direction === "asc" ? "Ascending ↑" : "Descending ↓"}
          </button>
        </div>
      </div>
      {assets.isError && (
        <div className={styles.error} role="alert">
          Assets could not be loaded.{" "}
          {assets.data
            ? "Showing the last successful result for these filters."
            : "Check your connection and try again."}{" "}
          <button onClick={() => void assets.refetch()}>Retry assets</button>
        </div>
      )}
      {(metadata.isError || (metadata.data?.failures.length ?? 0) > 0) && (
        <div className={styles.error} role="status">
          Some issuer and supply details are unavailable.{" "}
          <button onClick={() => void metadata.refetch()}>Retry details</button>
        </div>
      )}
      {issuers.isError && (
        <div className={styles.error} role="status">
          Issuer names are unavailable; account IDs are shown.{" "}
          <button onClick={() => void issuers.refetch()}>Retry issuers</button>
        </div>
      )}
      <div
        className={styles.tableScroll}
        ref={scrollArea}
        tabIndex={0}
        role="region"
        aria-label="Assets table"
        aria-busy={assets.isPending}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              {sortHeading("symbol")}
              {sortHeading("id")}
              <th scope="col">Issuer</th>
              <th scope="col" className={styles.numeric}>
                Current supply
              </th>
              <th scope="col" className={styles.numeric}>
                Maximum supply
              </th>
              {sortHeading("precision")}
              {sortHeading("last_updated_block")}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const detail = metadata.data?.assets.get(row.id);
              const issuer = detail?.asset.issuer;
              const issuerName = issuer && issuers.data?.get(issuer);
              const failed =
                metadata.isError ||
                metadata.data?.failures.some(
                  (failure) => failure.id === row.id,
                );
              const type =
                row.id === 0
                  ? "Core asset"
                  : detail?.asset.bitasset_data_id
                    ? "Market-issued"
                    : detail
                      ? "User-issued"
                      : undefined;
              return (
                <tr key={row.id}>
                  <th scope="row">
                    <a
                      href={`${referenceUrl}/asset/${encodeURIComponent(row.symbol)}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Open asset in the original portal"
                    >
                      {row.symbol}{" "}
                      <span className={styles.external} aria-hidden="true">
                        ↗
                      </span>
                    </a>
                    {type && <span className={styles.assetType}>{type}</span>}
                  </th>
                  <td className={styles.id}>1.3.{row.id}</td>
                  <td>
                    {issuer ? (
                      <Link
                        to="/account/$accountName"
                        params={{ accountName: issuerName || issuer }}
                        search={{ tab: "activity" }}
                      >
                        {issuerName || issuer}
                      </Link>
                    ) : (
                      <span className={styles.muted}>
                        {failed || !metadata.isPending
                          ? "Unavailable"
                          : "Loading…"}
                      </span>
                    )}
                  </td>
                  <td className={styles.numeric}>
                    {detail?.supply ? (
                      formatAssetAmount(
                        detail.supply.current_supply,
                        row.precision,
                      )
                    ) : (
                      <span className={styles.muted}>
                        {failed || !metadata.isPending
                          ? "Unavailable"
                          : "Loading…"}
                      </span>
                    )}
                  </td>
                  <td className={styles.numeric}>
                    {detail
                      ? formatAssetAmount(
                          detail.asset.options.max_supply,
                          row.precision,
                        )
                      : formatIndexedAmount(row.max_supply, row.precision)}
                  </td>
                  <td className={styles.numeric}>{row.precision}</td>
                  <td className={styles.numeric}>
                    {number.format(row.last_updated_block)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {assets.isPending && (
          <div className={styles.empty} role="status">
            <h2>Loading assets</h2>
            <p>Retrieving this page from Swaplock.</p>
          </div>
        )}
        {!assets.isPending && rows.length === 0 && (
          <div className={styles.empty}>
            <h2>
              {assets.isError
                ? "Assets are unavailable"
                : hasFilter
                  ? "No matching assets"
                  : "No indexed assets"}
            </h2>
            <p>
              {assets.isError
                ? "Your search and page settings have been kept."
                : hasFilter
                  ? "Try a shorter symbol or change the matching rule."
                  : "Assets will appear here once they have been indexed."}
            </p>
            {hasFilter && !assets.isError && (
              <button onClick={reset}>Clear filters</button>
            )}
          </div>
        )}
      </div>
      <footer className={styles.pagination}>
        <div className={styles.pageInfo}>
          <span>
            {total === undefined
              ? "—"
              : total === 0
                ? "0 results"
                : `${number.format((search.page - 1) * search.size + 1)}–${number.format(Math.min(search.page * search.size, total))} of ${number.format(total)}`}
          </span>
          <label>
            <span>Rows per page</span>
            <select
              aria-label="Rows per page"
              value={search.size}
              onChange={(event) =>
                update({
                  size: Number(event.target.value) as AssetSearch["size"],
                })
              }
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>
        <nav className={styles.pageButtons} aria-label="Asset pagination">
          <button
            aria-label="First page"
            onClick={() => update({ page: 1 })}
            disabled={busy || search.page <= 1}
          >
            «
          </button>
          <button
            aria-label="Previous page"
            onClick={() => update({ page: search.page - 1 })}
            disabled={busy || search.page <= 1}
          >
            Previous
          </button>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const page = Number(jumpPage);
              if (
                pages !== undefined &&
                Number.isSafeInteger(page) &&
                page >= 1 &&
                page <= pages
              )
                update({ page });
            }}
          >
            <label>
              <span>Page</span>
              <input
                aria-label="Page number"
                type="number"
                min={1}
                max={pages ?? 1}
                value={jumpPage}
                onChange={(event) => setJumpPage(event.target.value)}
                disabled={pages === undefined || busy}
              />
              <span>of {pages === undefined ? "—" : number.format(pages)}</span>
            </label>
            <button type="submit" disabled={pages === undefined || busy}>
              Go
            </button>
          </form>
          <button
            aria-label="Next page"
            onClick={() => update({ page: search.page + 1 })}
            disabled={busy || pages === undefined || search.page >= pages}
          >
            Next
          </button>
          <button
            aria-label="Last page"
            onClick={() => update({ page: pages ?? 1 })}
            disabled={busy || pages === undefined || search.page >= pages}
          >
            »
          </button>
        </nav>
      </footer>
      <p className={styles.footnote}>
        Asset links open the original portal ↗. Amounts are in asset units;
        supply details may reflect a newer indexed block than the list.
      </p>
    </section>
  );
}
