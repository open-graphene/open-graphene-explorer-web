import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { SwaplockClient } from "@open-graphene/chain-swaplock-api";
import { Route } from "../../routes/explorer.witnesses";
import { useChainConnection } from "../../lib/useChainConnection";
import { formatAssetAmount } from "../../lib/amounts";
import { activeWitnessesQuery } from "./queries";
import { participation, selectWitnesses, type WitnessSearch } from "./model";
import * as styles from "../explorer-list/list.css";
import * as witnessStyles from "./witnesses.css";

export function WitnessesPage() {
  const { connection, reconnect } = useChainConnection();
  if (connection.status !== "connected")
    return (
      <section className={styles.page}>
        <div className={styles.heading}>
          <h1>Witnesses</h1>
        </div>
        <div
          role={connection.status === "error" ? "alert" : "status"}
          className={styles.empty}
        >
          {connection.status === "error" ? (
            <>
              Cannot connect to the network: {connection.error.message}{" "}
              <button onClick={reconnect}>Reconnect</button>
            </>
          ) : (
            "Connecting to the Swaplock network…"
          )}
        </div>
      </section>
    );
  return <ConnectedWitnesses client={connection.client} />;
}
function ConnectedWitnesses({ client }: { client: SwaplockClient }) {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const query = useQuery(activeWitnessesQuery(client));
  const [draft, setDraft] = useState(search.q);
  useEffect(() => setDraft(search.q), [search.q]);
  const selection = selectWitnesses(query.data?.witnesses ?? [], search);
  function update(changes: Partial<WitnessSearch>) {
    void navigate({ search: { ...search, ...changes } });
  }
  useEffect(() => {
    if (query.data && search.page !== selection.page)
      void navigate({
        search: { ...search, page: selection.page },
        replace: true,
      });
  }, [query.data, search, selection.page, navigate]);
  const current = query.data?.witnesses.find(
    (witness) => witness.id === query.data?.dynamic.current_witness,
  );
  return (
    <section className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h1>Witnesses</h1>
          <p>Active block producers · Live network data</p>
        </div>
        <button
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          {query.isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {query.data && (
        <dl className={witnessStyles.overview}>
          <div>
            <dt>Current witness</dt>
            <dd>
              {current ? (
                <Link
                  to="/account/$accountName"
                  params={{ accountName: current.name }}
                  search={{ tab: "activity" }}
                >
                  {current.name}
                </Link>
              ) : (
                query.data.dynamic.current_witness
              )}
            </dd>
          </div>
          <div>
            <dt>Active witnesses</dt>
            <dd>{query.data.global.active_witnesses.length}</dd>
          </div>
          <div>
            <dt>Participation · last 128 slots</dt>
            <dd>{participation(query.data.dynamic.recent_slots_filled)}</dd>
          </div>
          <div>
            <dt>Pay per block</dt>
            <dd>
              {formatAssetAmount(
                query.data.global.parameters.witness_pay_per_block,
                query.data.asset.precision,
              )}{" "}
              {query.data.asset.symbol}
            </dd>
          </div>
          <div>
            <dt>Witness budget</dt>
            <dd>
              {formatAssetAmount(
                query.data.dynamic.witness_budget,
                query.data.asset.precision,
              )}{" "}
              {query.data.asset.symbol}
            </dd>
          </div>
          <div>
            <dt>Next vote tally · UTC</dt>
            <dd>
              {String(query.data.dynamic.next_maintenance_time).replace(
                "T",
                " ",
              )}
            </dd>
          </div>
        </dl>
      )}
      <form
        className={styles.filters}
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: draft.trim(), page: 1 });
        }}
      >
        <label className={styles.searchField}>
          Search witnesses
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Account name or witness ID"
          />
        </label>
        <button className={styles.searchButton}>Search</button>
      </form>
      <div className={styles.toolbar}>
        <p>
          {selection.total} active witnesses
          {search.q ? ` matching “${search.q}”` : ""}
        </p>
        <div className={styles.sortControls}>
          <label>
            Sort by
            <select
              aria-label="Sort by"
              value={search.sort}
              onChange={(event) =>
                update({
                  sort: event.target.value as WitnessSearch["sort"],
                  page: 1,
                })
              }
            >
              <option value="votes">Votes</option>
              <option value="name">Name</option>
              <option value="missed">Missed blocks</option>
              <option value="lastBlock">Last confirmed block</option>
            </select>
          </label>
          <button
            aria-label="Reverse sort direction"
            onClick={() =>
              update({
                direction: search.direction === "asc" ? "desc" : "asc",
                page: 1,
              })
            }
          >
            {search.direction === "asc" ? "↑ Ascending" : "↓ Descending"}
          </button>
        </div>
      </div>
      {query.isError && (
        <div className={styles.error} role="alert">
          Witness data could not be refreshed. {query.error.message}
          {query.data && " Previously loaded data is shown."}{" "}
          <button onClick={() => void query.refetch()}>Retry</button>
        </div>
      )}
      <div className={styles.tableScroll} aria-busy={query.isFetching}>
        {query.isPending ? (
          <p className={styles.empty} role="status">
            Loading active witnesses…
          </p>
        ) : selection.rows.length ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Witness</th>
                <th>ID</th>
                <th className={styles.numeric}>
                  Votes ({query.data?.asset.symbol})
                </th>
                <th className={styles.numeric}>Missed blocks</th>
                <th className={styles.numeric}>Last confirmed block</th>
                <th>Website</th>
                <th>Signing key</th>
              </tr>
            </thead>
            <tbody>
              {selection.rows.map((witness) => (
                <tr key={witness.id}>
                  <td>{selection.ranks.get(witness.id)}</td>
                  <th scope="row">
                    <Link
                      to="/account/$accountName"
                      params={{ accountName: witness.name }}
                      search={{ tab: "activity" }}
                    >
                      {witness.name}
                    </Link>
                    {witness.id === query.data?.dynamic.current_witness && (
                      <span className={witnessStyles.producing}>
                        Producing now
                      </span>
                    )}
                  </th>
                  <td className={styles.id}>{witness.id}</td>
                  <td className={styles.numeric}>
                    {query.data
                      ? formatAssetAmount(
                          witness.votes,
                          query.data.asset.precision,
                        )
                      : "—"}
                  </td>
                  <td className={styles.numeric}>
                    {witness.missed.toLocaleString("en-US")}
                  </td>
                  <td className={styles.numeric}>
                    {witness.lastBlock.toLocaleString("en-US")}
                  </td>
                  <td>
                    {witness.url ? (
                      <a
                        href={witness.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Website ↗
                      </a>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td className={styles.id}>{witness.signingKey}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          !query.isError && (
            <div className={styles.empty}>
              <h2>No active witnesses found</h2>
              {search.q && (
                <button onClick={() => update({ q: "", page: 1 })}>
                  Clear search
                </button>
              )}
            </div>
          )
        )}
      </div>
      <div className={styles.pagination}>
        <label>
          Rows per page
          <select
            aria-label="Rows per page"
            value={search.size}
            onChange={(event) =>
              update({ size: Number(event.target.value), page: 1 })
            }
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.pageButtons}>
          <button
            disabled={selection.page === 1}
            onClick={() => update({ page: 1 })}
          >
            First
          </button>
          <button
            disabled={selection.page === 1}
            onClick={() => update({ page: selection.page - 1 })}
          >
            Previous
          </button>
          <span>
            Page {selection.page} of {selection.pages}
          </span>
          <button
            disabled={selection.page === selection.pages}
            onClick={() => update({ page: selection.page + 1 })}
          >
            Next
          </button>
          <button
            disabled={selection.page === selection.pages}
            onClick={() => update({ page: selection.pages })}
          >
            Last
          </button>
        </div>
      </div>
      <p className={styles.footnote}>
        Active witnesses only, ranked by total votes. Data refreshes every 15
        seconds. Filtering and sorting cover the complete active set.
      </p>
    </section>
  );
}
