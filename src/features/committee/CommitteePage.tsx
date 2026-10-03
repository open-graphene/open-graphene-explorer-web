import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Route } from "../../routes/explorer.committee";
import { useChainConnection } from "../../lib/useChainConnection";
import { formatAssetAmount } from "../../lib/amounts";
import { committeeQuery } from "./queries";
import {
  defaultCommitteeSearch,
  safeCommitteeWebsite,
  selectCommitteeMembers,
  type CommitteeSearch,
} from "./model";
import * as styles from "../explorer-list/list.css";

export function CommitteePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [draft, setDraft] = useState(search.q);
  const { connection, reconnect } = useChainConnection();
  const query = useQuery(
    committeeQuery(
      connection.status === "connected" ? connection.client : undefined,
    ),
  );
  const selection = selectCommitteeMembers(query.data?.members ?? [], search);
  useEffect(() => setDraft(search.q), [search.q]);
  useEffect(() => {
    if (query.data && selection.page !== search.page)
      void navigate({
        search: { ...search, page: selection.page },
        replace: true,
      });
  }, [query.data, search, selection.page, navigate]);
  function updateSearch(update: Partial<CommitteeSearch>) {
    void navigate({ search: { ...search, page: 1, ...update } });
  }
  const busy = connection.status === "connecting" || query.isFetching;
  const error = connection.status === "error" ? connection.error : query.error;
  function refresh() {
    if (connection.status === "connected") void query.refetch();
    else reconnect();
  }
  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h1>Committee</h1>
          <p>Active members governing the network parameters.</p>
        </div>
        <button onClick={refresh} disabled={busy}>
          {busy ? "Updating…" : "Refresh"}
        </button>
      </div>
      <form
        className={styles.filters}
        onSubmit={(event) => {
          event.preventDefault();
          updateSearch({ q: draft.trim() });
        }}
      >
        <label className={styles.searchField}>
          Search members
          <input
            aria-label="Search members"
            placeholder="Account name or committee ID"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <button type="submit" className={styles.searchButton}>
          Search
        </button>
        {search.q && (
          <button type="button" onClick={() => updateSearch({ q: "" })}>
            Clear search
          </button>
        )}
      </form>
      <div className={styles.toolbar}>
        <p>
          {query.data
            ? `${selection.total} active ${selection.total === 1 ? "member" : "members"}${search.q ? " matching your search" : ""}`
            : "Loading active committee…"}
        </p>
        <div className={styles.sortControls}>
          <label>
            Sort by
            <select
              aria-label="Sort by"
              value={search.sort}
              onChange={(event) =>
                updateSearch({
                  sort: event.target.value as CommitteeSearch["sort"],
                })
              }
            >
              <option value="rank">Rank</option>
              <option value="name">Name</option>
              <option value="votes">Votes</option>
            </select>
          </label>
          <button
            onClick={() =>
              updateSearch({
                direction: search.direction === "asc" ? "desc" : "asc",
              })
            }
            aria-label="Toggle sort direction"
          >
            {search.direction === "asc" ? "Ascending ↑" : "Descending ↓"}
          </button>
        </div>
      </div>
      {error && (
        <div className={styles.error} role="alert">
          Committee could not be updated: {error.message}.{" "}
          {query.data && "Previously loaded data is shown."}{" "}
          <button onClick={refresh}>Retry</button>
        </div>
      )}
      <div className={styles.tableScroll} aria-busy={busy}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Rank</th>
              <th scope="col">Name</th>
              <th scope="col">Status</th>
              <th scope="col" className={styles.numeric}>
                Votes {query.data?.core.symbol}
              </th>
              <th scope="col">Webpage</th>
            </tr>
          </thead>
          <tbody>
            {selection.rows.map((member) => {
              const website = safeCommitteeWebsite(member.website);
              return (
                <tr key={member.id}>
                  <td>{member.rank}</td>
                  <th scope="row">
                    <Link
                      to="/account/$accountName"
                      params={{ accountName: member.name }}
                      search={{ tab: "activity" }}
                    >
                      {member.name}
                    </Link>
                    <span className={styles.assetType}>{member.id}</span>
                  </th>
                  <td>Active</td>
                  <td className={styles.numeric}>
                    {formatAssetAmount(
                      member.votes,
                      query.data!.core.precision,
                    )}
                  </td>
                  <td>
                    {website ? (
                      <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {member.website} <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      member.website || "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!query.data && !error && (
          <div className={styles.empty} role="status">
            Connecting to the node and loading committee members…
          </div>
        )}
        {query.data && selection.total === 0 && (
          <div className={styles.empty}>
            <h2>
              {search.q ? "No matching members" : "No active committee members"}
            </h2>
            {search.q && (
              <button
                onClick={() =>
                  void navigate({ search: defaultCommitteeSearch })
                }
              >
                Reset filters
              </button>
            )}
          </div>
        )}
      </div>
      <div className={styles.pagination}>
        <label>
          Rows per page
          <select
            aria-label="Rows per page"
            value={search.size}
            onChange={(event) =>
              updateSearch({
                size: Number(event.target.value) as CommitteeSearch["size"],
              })
            }
          >
            <option>10</option>
            <option>25</option>
            <option>50</option>
          </select>
        </label>
        <div className={styles.pageButtons}>
          <button
            disabled={selection.page === 1}
            onClick={() => updateSearch({ page: 1 })}
          >
            First
          </button>
          <button
            disabled={selection.page === 1}
            onClick={() => updateSearch({ page: selection.page - 1 })}
          >
            Previous
          </button>
          <span>
            Page {selection.page} of {selection.pageCount}
          </span>
          <button
            disabled={selection.page === selection.pageCount}
            onClick={() => updateSearch({ page: selection.page + 1 })}
          >
            Next
          </button>
          <button
            disabled={selection.page === selection.pageCount}
            onClick={() => updateSearch({ page: selection.pageCount })}
          >
            Last
          </button>
        </div>
      </div>
      <p className={styles.footnote}>
        Active membership, accounts and votes come directly from the node.
        Search and sorting cover the complete active committee. Rank follows the
        node’s active member order.
      </p>
    </section>
  );
}
