import { supplyPercentage } from "./percentage";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Route } from "../../routes/explorer.accounts";
import { Link } from "@tanstack/react-router";
import { accountBalancesQuery, accountsQuery, coreAssetQuery } from "./queries";
import {
  defaultAccountSearch,
  pageCount,
  type AccountSearch,
  type AccountSort,
} from "./search";
import { formatAssetAmount } from "../../lib/amounts";
import * as styles from "../explorer-list/list.css";

const number = new Intl.NumberFormat("en-US");
const sortLabels: Record<AccountSort, string> = {
  name: "Name",
  id: "Account ID",
  registrar_name: "Created by",
  last_updated_block: "Last updated block",
};

export function AccountsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [draft, setDraft] = useState(search.q);
  const [jumpPage, setJumpPage] = useState(String(search.page));
  const scrollArea = useRef<HTMLDivElement>(null);
  const accounts = useQuery(accountsQuery(search));
  const rows = accounts.data?.data ?? [];
  const balances = useQuery(
    accountBalancesQuery(rows.map((account) => account.id)),
  );
  const core = useQuery(coreAssetQuery);
  const total = accounts.data?.total;
  const pages = total === undefined ? undefined : pageCount(total, search.size);
  const busy = accounts.isFetching;
  const hasFilter = search.q.length > 0;
  const changed =
    hasFilter ||
    search.field !== "name" ||
    search.match !== "contains" ||
    search.sort !== "name" ||
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
      !accounts.isFetching &&
      !accounts.isError
    ) {
      void navigate({ search: { ...search, page: pages }, replace: true });
    }
  }, [pages, search, navigate, accounts.isFetching, accounts.isError]);

  function update(patch: Partial<AccountSearch>) {
    void navigate({ search: { ...search, ...patch, page: patch.page ?? 1 } });
  }
  function sortBy(field: AccountSort) {
    update({
      sort: field,
      direction:
        search.sort === field && search.direction === "asc" ? "desc" : "asc",
    });
  }
  function reset() {
    setDraft("");
    void navigate({ search: defaultAccountSearch });
  }
  function refresh() {
    void accounts.refetch();
    if (rows.length) void balances.refetch();
    void core.refetch();
  }
  function sortHeading(field: AccountSort) {
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
          title={`Sort all accounts by ${sortLabels[field].toLowerCase()}`}
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
    <section className={styles.page} aria-labelledby="accounts-title">
      <div className={styles.heading}>
        <div>
          <h1 id="accounts-title">Accounts</h1>
          <p>Find accounts and their public on-chain balances.</p>
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
          <span>Search accounts</span>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={100}
            placeholder={
              search.field === "name"
                ? "Account name, e.g. swaplock"
                : search.field === "id"
                  ? "Account ID, e.g. 1.2.100"
                  : search.field === "registrar_name"
                    ? "Registrar name"
                    : "Public memo key"
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
                field: event.target.value as AccountSearch["field"],
                q: draft.trim(),
              })
            }
          >
            <option value="name">Account name</option>
            <option value="id">Account ID</option>
            <option value="registrar_name">Created by</option>
            <option value="memo_key">Memo key</option>
          </select>
        </label>
        <label>
          <span>Match</span>
          <select
            aria-label="Match"
            value={search.match}
            onChange={(event) =>
              update({
                match: event.target.value as AccountSearch["match"],
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
          {accounts.isPending
            ? "Loading accounts…"
            : total === undefined
              ? "Accounts unavailable"
              : `${number.format(total)} ${total === 1 ? "account" : "accounts"}${hasFilter ? ` matching “${search.q}”` : " on Swaplock"}`}
          {busy && accounts.data ? " · Updating…" : ""}
        </p>
        <div className={styles.sortControls}>
          <label>
            <span>Sort by</span>
            <select
              aria-label="Sort by"
              value={search.sort}
              onChange={(event) =>
                update({ sort: event.target.value as AccountSort })
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
      {accounts.isError && (
        <div className={styles.error} role="alert">
          Accounts could not be loaded.{" "}
          {accounts.data
            ? "Showing the last successful result for these filters."
            : "Check your connection and try again."}{" "}
          <button onClick={() => void accounts.refetch()}>
            Retry accounts
          </button>
        </div>
      )}
      {(balances.isError || (balances.data?.failures.length ?? 0) > 0) && (
        <div className={styles.error} role="status">
          Some balances are unavailable.{" "}
          <button onClick={() => void balances.refetch()}>
            Retry balances
          </button>
        </div>
      )}
      {core.isError && (
        <div className={styles.error} role="status">
          Core asset supply is unavailable; percentages cannot be calculated.{" "}
          <button onClick={() => void core.refetch()}>Retry supply</button>
        </div>
      )}
      <div
        className={styles.tableScroll}
        ref={scrollArea}
        tabIndex={0}
        role="region"
        aria-label="Accounts table"
        aria-busy={accounts.isPending}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              {sortHeading("id")}
              {sortHeading("name")}
              {sortHeading("registrar_name")}
              <th scope="col" className={styles.numeric}>
                {core.data?.asset.symbol ?? "Core"} balance
              </th>
              <th
                scope="col"
                className={styles.numeric}
                title="Liquid core-asset balance divided by its current indexed supply"
              >
                Share of supply
              </th>
              {sortHeading("last_updated_block")}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const balance = balances.data?.balances.get(row.id);
              const balanceFailed =
                balances.isError ||
                balances.data?.failures.some(
                  (failure) => failure.id === row.id,
                );
              const missing =
                balanceFailed || !balances.isPending
                  ? "Unavailable"
                  : "Loading…";
              return (
                <tr key={row.id}>
                  <td className={styles.id}>1.2.{row.id}</td>
                  <th scope="row">
                    <Link
                      to="/account/$accountName"
                      params={{ accountName: row.name }}
                      search={{ tab: "activity" }}
                    >
                      {row.name}
                    </Link>
                  </th>
                  <td>
                    <Link
                      to="/account/$accountName"
                      params={{
                        accountName:
                          row.registrar_name || `1.2.${row.registrar}`,
                      }}
                      search={{ tab: "activity" }}
                    >
                      {row.registrar_name || `1.2.${row.registrar}`}
                    </Link>
                  </td>
                  <td className={styles.numeric}>
                    {balance !== undefined && core.data ? (
                      formatAssetAmount(balance, core.data.asset.precision)
                    ) : (
                      <span className={styles.muted}>
                        {core.isError
                          ? "Unavailable"
                          : core.isPending
                            ? "Loading…"
                            : missing}
                      </span>
                    )}
                  </td>
                  <td className={styles.numeric}>
                    {balance !== undefined && core.data ? (
                      supplyPercentage(balance, core.data.supply)
                    ) : (
                      <span className={styles.muted}>
                        {core.isError
                          ? "Unavailable"
                          : core.isPending
                            ? "Loading…"
                            : missing}
                      </span>
                    )}
                  </td>
                  <td className={styles.numeric}>
                    {number.format(row.last_updated_block)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {accounts.isPending && (
          <div className={styles.empty} role="status">
            <h2>Loading accounts</h2>
            <p>Retrieving this page from Swaplock.</p>
          </div>
        )}
        {!accounts.isPending && rows.length === 0 && (
          <div className={styles.empty}>
            <h2>
              {accounts.isError
                ? "Accounts are unavailable"
                : hasFilter
                  ? "No matching accounts"
                  : "No indexed accounts"}
            </h2>
            <p>
              {accounts.isError
                ? "Your search and page settings have been kept."
                : hasFilter
                  ? "Try a shorter name or change the matching rule."
                  : "Accounts will appear here once they have been indexed."}
            </p>
            {hasFilter && !accounts.isError && (
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
                  size: Number(event.target.value) as AccountSearch["size"],
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
        <nav className={styles.pageButtons} aria-label="Account pagination">
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
        Balances show liquid holdings of the core asset. Share of supply uses
        the latest indexed supply; locked funds and other assets are not
        included.
      </p>
    </section>
  );
}
