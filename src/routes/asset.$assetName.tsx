import {
  createFileRoute,
  stripSearchParams,
  Link,
} from "@tanstack/react-router";
import {
  defaultAssetDetailSearch,
  validateAssetDetailSearch,
  assetDescription,
  assetFlags,
} from "../features/asset/model";
import { useQuery } from "@tanstack/react-query";
import { useChainConnection } from "../lib/useChainConnection";
import { formatAssetAmount, formatIndexedAmount } from "../lib/amounts";
import { displayJson } from "../lib/json";
import { defaultAssetSearch } from "../features/assets/search";
import {
  assetQuery,
  assetSupplyQuery,
  assetIssuerQuery,
  assetHoldersQuery,
  holdersPageSize,
} from "../features/asset/queries";
import * as list from "../features/explorer-list/list.css";
import * as detail from "../features/detail/detail.css";
import * as accountStyles from "../features/account/account.css";

export const Route = createFileRoute("/asset/$assetName")({
  validateSearch: validateAssetDetailSearch,
  search: { middlewares: [stripSearchParams(defaultAssetDetailSearch)] },
  component: AssetPage,
});

function AssetPage() {
  const { assetName } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { connection, reconnect } = useChainConnection();
  const client =
    connection.status === "connected" ? connection.client : undefined;
  const asset = useQuery(assetQuery(client, assetName));
  const supply = useQuery(
    assetSupplyQuery(client, asset.data?.dynamic_asset_data_id),
  );
  const issuer = useQuery(assetIssuerQuery(client, asset.data?.issuer));
  const core = useQuery(assetQuery(client, "1.3.0"));
  const holders = useQuery(
    assetHoldersQuery(asset.data?.id, search.page, search.tab === "holders"),
  );
  const error = connection.status === "error" ? connection.error : asset.error;
  function refresh() {
    if (connection.status === "error") {
      reconnect();
      return;
    }
    void asset.refetch();
    void core.refetch();
    if (asset.data) {
      void supply.refetch();
      void issuer.refetch();
      if (search.tab === "holders") void holders.refetch();
    }
  }
  const data = asset.data;
  const amount = (value: bigint | undefined) =>
    value === undefined
      ? supply.isPending
        ? "Loading…"
        : "Unavailable"
      : formatAssetAmount(value, data?.precision ?? 0);
  return (
    <section className={list.page}>
      <div className={list.heading}>
        <div className={detail.title}>
          <h1>{data?.symbol ?? assetName}</h1>
          <p>
            {data
              ? `${data.id} · ${data.id === "1.3.0" ? "Core asset" : data.bitasset_data_id ? "Market-issued asset" : "User-issued asset"}`
              : "Asset details"}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={
            connection.status === "connecting" ||
            asset.isFetching ||
            supply.isFetching ||
            holders.isFetching
          }
        >
          Refresh
        </button>
      </div>
      <Link to="/explorer/assets" search={defaultAssetSearch}>
        All assets
      </Link>
      <nav className={accountStyles.tabs} aria-label="Asset sections">
        <Link
          to="/asset/$assetName"
          params={{ assetName }}
          search={{ tab: "overview", page: search.page }}
          className={accountStyles.tab}
          aria-current={search.tab === "overview" ? "page" : undefined}
        >
          Overview
        </Link>
        <Link
          to="/asset/$assetName"
          params={{ assetName }}
          search={{ tab: "holders", page: search.page }}
          className={accountStyles.tab}
          aria-current={search.tab === "holders" ? "page" : undefined}
        >
          Holders
        </Link>
      </nav>
      {error && (
        <div role="alert" className={list.error}>
          Asset could not be loaded: {error.message}.{" "}
          <button onClick={refresh}>Retry asset</button>
        </div>
      )}
      {!error && asset.isPending && <p role="status">Loading asset…</p>}
      {data === null && (
        <div className={list.empty}>
          <h2>Asset not found</h2>
          <p>No asset matches this symbol or ID.</p>
        </div>
      )}
      {data && search.tab === "overview" && (
        <div className={detail.content}>
          {supply.isError && (
            <p className={list.error} role="alert">
              Supply could not be refreshed.{" "}
              {supply.data && "Previously loaded amounts are shown."}{" "}
              <button onClick={() => void supply.refetch()}>
                Retry supply
              </button>
            </p>
          )}
          {issuer.isError && (
            <p className={list.error}>
              Issuer name unavailable; showing its ID.{" "}
              <button onClick={() => void issuer.refetch()}>
                Retry issuer
              </button>
            </p>
          )}
          <dl className={detail.summary}>
            <div>
              <dt>Issuer</dt>
              <dd>
                <Link
                  to="/account/$accountName"
                  params={{ accountName: issuer.data?.name ?? data.issuer }}
                  search={{ tab: "activity" }}
                >
                  {issuer.data?.name ?? data.issuer}
                </Link>
              </dd>
            </div>
            <div>
              <dt>Current supply</dt>
              <dd>
                {amount(supply.data?.current_supply)} {data.symbol}
              </dd>
            </div>
            <div>
              <dt>Maximum supply</dt>
              <dd>
                {formatAssetAmount(data.options.max_supply, data.precision)}{" "}
                {data.symbol}
              </dd>
            </div>
            <div>
              <dt>Confidential supply</dt>
              <dd>
                {amount(supply.data?.confidential_supply)} {data.symbol}
              </dd>
            </div>
            <div>
              <dt>Precision</dt>
              <dd>{data.precision} decimal places</dd>
            </div>
            <div>
              <dt>Created (UTC)</dt>
              <dd>
                {data.creation_time.replace("T", " ")}
                {data.creation_block_num > 0 && (
                  <>
                    {" "}
                    ·{" "}
                    <Link
                      to="/block/$height"
                      params={{ height: String(data.creation_block_num) }}
                    >
                      Block #{data.creation_block_num.toLocaleString("en-US")}
                    </Link>
                  </>
                )}
              </dd>
            </div>
          </dl>
          <section className={detail.section}>
            <h2>Description</h2>
            <p className={detail.description}>
              {assetDescription(data.options.description) ||
                "No description provided."}
            </p>
          </section>
          <section className={detail.section}>
            <h2>Fees</h2>
            <dl className={detail.summary}>
              <div>
                <dt>Configured market fee</dt>
                <dd>
                  {data.options.market_fee_percent / 100}%
                  {(data.options.flags & 1) === 0 && " · disabled"}
                </dd>
              </div>
              <div>
                <dt>Maximum market fee</dt>
                <dd>
                  {formatAssetAmount(
                    data.options.max_market_fee,
                    data.precision,
                  )}{" "}
                  {data.symbol}
                </dd>
              </div>
              <div>
                <dt>Accumulated fees</dt>
                <dd>
                  {amount(supply.data?.accumulated_fees)} {data.symbol}
                </dd>
              </div>
              <div>
                <dt>Accumulated collateral fees</dt>
                <dd>
                  {amount(supply.data?.accumulated_collateral_fees)}{" "}
                  {data.symbol}
                </dd>
              </div>
              <div>
                <dt>Fee pool (core asset)</dt>
                <dd>
                  {supply.data && core.data
                    ? `${formatAssetAmount(supply.data.fee_pool, core.data.precision)} ${core.data.symbol}`
                    : core.isPending || supply.isPending
                      ? "Loading…"
                      : "Unavailable"}
                </dd>
              </div>
              {data.options.extensions.taker_fee_percent !== undefined && (
                <div>
                  <dt>Taker fee</dt>
                  <dd>{data.options.extensions.taker_fee_percent / 100}%</dd>
                </div>
              )}
            </dl>
            {core.isError && (
              <button onClick={() => void core.refetch()}>
                Retry core asset
              </button>
            )}
          </section>
          <section className={detail.section}>
            <h2>Active flags</h2>
            <ul className={detail.tags}>
              {assetFlags(data.options.flags).map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
            {data.options.flags === 0 && <p>None enabled</p>}
            <h2>Issuer permissions</h2>
            <ul className={detail.tags}>
              {assetFlags(data.options.issuer_permissions).map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
            {data.options.issuer_permissions === 0 && (
              <p>No optional permissions retained</p>
            )}
            <p className={list.muted}>
              Permissions describe what the issuer may enable; flags describe
              the current settings.
            </p>
          </section>
          <section className={detail.section}>
            <h2>On-chain settings</h2>
            <details>
              <summary>Exchange rate, authorities and raw options</summary>
              <pre className={detail.code}>{displayJson(data.options)}</pre>
            </details>
          </section>
        </div>
      )}
      {data && search.tab === "holders" && (
        <>
          <p className={list.muted}>
            Indexed liquid balances, largest first. Locked holdings are not
            included; indexed data may lag behind the node.
          </p>
          {holders.isError && (
            <div role="alert" className={list.error}>
              Holders could not be loaded.{" "}
              {holders.data && "Showing the last successful result."}{" "}
              <button onClick={() => void holders.refetch()}>
                Retry holders
              </button>
            </div>
          )}
          {holders.isPending && <p role="status">Loading holders…</p>}
          <div className={list.tableScroll}>
            <table className={list.table} aria-label="Asset holders">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Account</th>
                  <th className={list.numeric}>Balance ({data.symbol})</th>
                </tr>
              </thead>
              <tbody>
                {holders.data?.rows.map((holder, index) => (
                  <tr key={holder.account_id}>
                    <td>{(search.page - 1) * holdersPageSize + index + 1}</td>
                    <th>
                      <Link
                        to="/account/$accountName"
                        params={{
                          accountName:
                            holder.account_name || `1.2.${holder.account_id}`,
                        }}
                        search={{ tab: "activity" }}
                      >
                        {holder.account_name || `1.2.${holder.account_id}`}
                      </Link>
                    </th>
                    <td className={list.numeric}>
                      {formatIndexedAmount(holder.amount, data.precision)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {holders.data?.rows.length === 0 && (
              <div className={list.empty}>
                <h2>No holders on this page</h2>
                {search.page > 1 && (
                  <button
                    onClick={() =>
                      void navigate({ search: { tab: "holders", page: 1 } })
                    }
                  >
                    First page
                  </button>
                )}
              </div>
            )}
          </div>
          <div className={list.pagination}>
            <span>
              Page {search.page} · {holdersPageSize} holders per page
            </span>
            <div className={list.pageButtons}>
              <button
                disabled={search.page === 1 || holders.isFetching}
                onClick={() =>
                  void navigate({
                    search: { tab: "holders", page: search.page - 1 },
                  })
                }
              >
                Previous holders
              </button>
              <button
                disabled={!holders.data?.hasNext || holders.isFetching}
                onClick={() =>
                  void navigate({
                    search: { tab: "holders", page: search.page + 1 },
                  })
                }
              >
                Next holders
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
