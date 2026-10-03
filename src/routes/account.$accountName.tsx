import {
  createFileRoute,
  stripSearchParams,
  Link,
} from "@tanstack/react-router";
import {
  defaultAccountDetailSearch,
  validateAccountDetailSearch,
  olderHistoryCursor,
} from "../features/account/search";
import { useQuery } from "@tanstack/react-query";
import { useChainConnection } from "../lib/useChainConnection";
import { formatAssetAmount } from "../lib/amounts";
import { referenceUrl } from "../lib/config";
import { timestampMilliseconds } from "../features/blocks/metrics";
import {
  accountQuery,
  balancesQuery,
  historyQuery,
} from "../features/account/queries";
import {
  operationJson,
  operationLabel,
  operationSummary,
} from "../features/account/activity";
import * as list from "../features/explorer-list/list.css";
import * as styles from "../features/account/account.css";

export const Route = createFileRoute("/account/$accountName")({
  validateSearch: validateAccountDetailSearch,
  search: { middlewares: [stripSearchParams(defaultAccountDetailSearch)] },
  component: AccountPage,
});

function AccountPage() {
  const { accountName } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { connection, reconnect } = useChainConnection();
  const client =
    connection.status === "connected" ? connection.client : undefined;
  const account = useQuery(accountQuery(client, accountName));
  const balances = useQuery(
    balancesQuery(
      search.tab === "balances" ? client : undefined,
      account.data?.id,
    ),
  );
  const history = useQuery(
    historyQuery(
      search.tab === "activity" ? client : undefined,
      account.data?.id,
      search.before,
    ),
  );
  const selected = search.tab === "activity" ? history : balances;
  const oldest = history.data?.operations.at(-1);
  const older =
    oldest && history.data?.hasOlder
      ? olderHistoryCursor(oldest.id)
      : undefined;

  function refresh() {
    if (connection.status === "error") {
      reconnect();
      return;
    }
    void account.refetch();
    if (account.data) void selected.refetch();
  }

  return (
    <section className={list.page} aria-label="Account details">
      <div className={list.heading}>
        <div className={styles.heading}>
          <h1>{account.data?.name ?? accountName}</h1>
          <p>Account overview</p>
        </div>
        <button
          onClick={refresh}
          disabled={
            connection.status === "connecting" ||
            account.isFetching ||
            selected.isFetching
          }
        >
          Refresh
        </button>
      </div>
      {account.data && (
        <div className={styles.metadata}>
          <span>
            Account ID <strong>{account.data.id}</strong>
          </span>
          <span>
            Created{" "}
            {new Date(
              timestampMilliseconds(account.data.creation_time),
            ).toLocaleString("en-GB", { timeZone: "UTC" })}{" "}
            UTC
          </span>
          <span>
            Created by{" "}
            <Link
              to="/account/$accountName"
              params={{ accountName: account.data.registrar }}
              search={{ tab: "activity" }}
            >
              {account.data.registrar}
            </Link>
          </span>
        </div>
      )}
      <nav className={styles.tabs} aria-label="Account sections">
        <Link
          to="/account/$accountName"
          params={{ accountName }}
          search={{ ...search, tab: "activity" }}
          className={styles.tab}
          aria-current={search.tab === "activity" ? "page" : undefined}
        >
          Activity
        </Link>
        <Link
          to="/account/$accountName"
          params={{ accountName }}
          search={{ ...search, tab: "balances" }}
          className={styles.tab}
          aria-current={search.tab === "balances" ? "page" : undefined}
        >
          Balances
        </Link>
      </nav>
      {connection.status === "connecting" && (
        <p role="status">Connecting to the node…</p>
      )}
      {connection.status === "error" && (
        <div role="alert" className={list.error}>
          Node connection failed: {connection.error.message}.{" "}
          <button onClick={reconnect}>Reconnect</button>
        </div>
      )}
      {account.isError && (
        <div role="alert" className={list.error}>
          Account could not be loaded: {account.error.message}.{" "}
          <button onClick={() => void account.refetch()}>Retry account</button>
        </div>
      )}
      {client && account.isPending && <p role="status">Loading account…</p>}
      {account.data === null && (
        <div className={list.empty}>
          <h2>Account not found</h2>
          <p>
            No account matches “{accountName}”. Check the name or account ID.
          </p>
        </div>
      )}
      {account.data && (
        <>
          {selected.isError && (
            <div role="alert" className={list.error}>
              {search.tab === "activity" ? "Activity" : "Balances"} could not be
              loaded: {selected.error.message}.{" "}
              <button onClick={() => void selected.refetch()}>
                Retry {search.tab}
              </button>
            </div>
          )}
          {selected.isPending && <p role="status">Loading {search.tab}…</p>}
          {search.tab === "balances" && balances.data && (
            <>
              <p className={list.muted}>
                Asset balances · {balances.data.rows.length}{" "}
                {balances.data.rows.length === 1 ? "asset" : "assets"}
              </p>
              {balances.data.rows.length === 0 ? (
                <div className={list.empty}>
                  <h2>No balances</h2>
                  <p>This account has no asset balances.</p>
                </div>
              ) : (
                <div className={list.tableScroll}>
                  <table className={list.table} aria-label="Account balances">
                    <thead>
                      <tr>
                        <th>Asset</th>
                        <th>Asset ID</th>
                        <th className={list.numeric}>Available</th>
                        <th className={list.numeric}>In orders</th>
                        <th className={list.numeric}>In collateral</th>
                        <th className={list.numeric}>In vesting</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balances.data.rows.map((balance) => (
                        <tr key={balance.assetId}>
                          <th>
                            <Link
                              to="/asset/$assetName"
                              params={{
                                assetName:
                                  balance.asset?.symbol ?? balance.assetId,
                              }}
                              search={{ tab: "overview", page: 1 }}
                            >
                              {balance.asset?.symbol ?? balance.assetId}
                            </Link>
                          </th>
                          <td className={list.id}>{balance.assetId}</td>
                          {(
                            [
                              "available",
                              "orders",
                              "collateral",
                              "vesting",
                            ] as const
                          ).map((bucket) => (
                            <td key={bucket} className={list.numeric}>
                              {balance.asset
                                ? formatAssetAmount(
                                    balance[bucket],
                                    balance.asset.precision,
                                  )
                                : "Asset precision unavailable"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {balances.data.truncated && (
                <p role="alert" className={list.error}>
                  The node limited the orders, collateral or vesting records.
                  Those columns show partial balances.
                </p>
              )}
              <p className={list.muted}>
                Vesting shows the remaining balance, including funds not yet
                withdrawable. Amounts are shown in each asset’s own units.
              </p>
            </>
          )}
          {search.tab === "activity" && history.data && (
            <>
              <div className={list.toolbar}>
                <p>
                  {history.data.operations.length} operations · newest first
                </p>
                {search.before && (
                  <button
                    onClick={() =>
                      void navigate({ search: { tab: "activity" } })
                    }
                  >
                    Newest activity
                  </button>
                )}
              </div>
              {history.data.operations.length === 0 ? (
                <div className={list.empty}>
                  <h2>No activity</h2>
                  <p>
                    No operations are available for this account in the node
                    history.
                  </p>
                </div>
              ) : (
                <div className={list.tableScroll}>
                  <table className={list.table} aria-label="Account activity">
                    <thead>
                      <tr>
                        <th>Operation</th>
                        <th>Details</th>
                        <th>Block</th>
                        <th>Time (UTC)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.data.operations.map((operation) => (
                        <tr key={operation.id}>
                          <th>
                            {operationLabel(operation.op[0])}
                            <span className={list.assetType}>
                              {operation.id}
                              {operation.is_virtual ? " · Virtual" : ""}
                            </span>
                          </th>
                          <td>
                            <div className={styles.description}>
                              {operationSummary(operation.op)}
                            </div>
                            <details className={styles.details}>
                              <summary>Operation data</summary>
                              <pre>{operationJson(operation.op)}</pre>
                            </details>
                          </td>
                          <td>
                            <Link
                              to="/block/$height"
                              params={{ height: String(operation.block_num) }}
                            >
                              {operation.block_num.toLocaleString("en-US")}
                            </Link>
                          </td>
                          <td>
                            {new Date(
                              timestampMilliseconds(operation.block_time),
                            ).toLocaleString("en-GB", { timeZone: "UTC" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className={styles.footer}>
                <span>
                  History retained by the node. Older operations may have been
                  pruned.
                </span>
                <button
                  disabled={!older || history.isFetching}
                  onClick={() => {
                    if (older)
                      void navigate({
                        search: { tab: "activity", before: older },
                      });
                  }}
                >
                  Older activity →
                </button>
              </div>
            </>
          )}
        </>
      )}
      <div className={styles.footer}>
        <span>Read directly from the chain node</span>
        <a
          href={`${referenceUrl}/account/${encodeURIComponent(account.data?.name ?? accountName)}`}
          target="_blank"
          rel="noreferrer"
        >
          Open original account ↗
        </a>
      </div>
    </section>
  );
}
