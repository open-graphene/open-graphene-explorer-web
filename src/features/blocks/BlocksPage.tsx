import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { referenceUrl } from "../../lib/config";
import { blockMetrics, timestampMilliseconds } from "./metrics";
import {
  operationTypesQuery,
  recentBlocksQuery,
  recentOperationsQuery,
  witnessesQuery,
} from "./queries";
import { Statistics } from "./Statistics";
import * as styles from "./blocks.css";

const number = new Intl.NumberFormat("en-US");
const time = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

export function BlocksPage() {
  const blocks = useQuery(recentBlocksQuery);
  const witnesses = useQuery(witnessesQuery);
  const operations = useQuery(recentOperationsQuery);
  const types = useQuery(operationTypesQuery);
  const rows = [...(blocks.data ?? [])].sort(
    (a, b) => b.block_num - a.block_num,
  );
  const oldest = rows.at(-1)?.block_num;
  const newest = rows[0]?.block_num;
  const activity = (operations.data ?? []).filter(
    (operation) =>
      oldest !== undefined &&
      newest !== undefined &&
      operation.block_num >= oldest &&
      operation.block_num <= newest,
  );
  const metrics = blockMetrics(rows);

  return (
    <>
      <h1 className={styles.srOnly}>Swaplock blockchain explorer</h1>
      <Statistics blocks={rows} />
      {metrics.hasGap && (
        <p className={styles.notice}>
          Some blocks are missing from the indexed window. Statistics use only
          the latest consecutive blocks.
        </p>
      )}
      <div className={styles.panels}>
        <section className={styles.panel} aria-labelledby="activity-title">
          <h2 id="activity-title">Recent activity</h2>
          <p className={styles.panelHint}>
            Operations in the latest 30 indexed blocks
          </p>
          {operations.isError && (
            <p role="alert" className={styles.notice}>
              Activity could not refresh.{" "}
              {operations.data && "Showing the last available records."}{" "}
              <button onClick={() => void operations.refetch()}>
                Retry activity
              </button>
            </p>
          )}
          <div className={styles.tableHeading}>Info</div>
          {operations.isPending || blocks.isPending ? (
            <p className={styles.empty} role="status">
              Loading recent activity…
            </p>
          ) : !activity.length ? (
            <p className={styles.empty}>
              {operations.isError || blocks.isError
                ? "Recent activity is unavailable."
                : "No operations in these blocks."}
            </p>
          ) : (
            <ul className={styles.activityList}>
              {activity.map((operation) => {
                const name =
                  types.data
                    ?.find((type) => type.op_type === operation.op_type)
                    ?.name.replaceAll("_", " ") ??
                  `Operation ${operation.op_type}`;
                return (
                  <li key={operation.op_seq}>
                    <div className={styles.activityTitle}>
                      <strong>{name}</strong>
                      <a
                        href={`${referenceUrl}/block/${operation.block_num}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open block in the original portal"
                      >
                        #{number.format(operation.block_num)} ↗
                      </a>
                    </div>
                    <p className={styles.muted}>
                      Fee payer: 1.2.{operation.fee_payer} ·{" "}
                      {time.format(timestampMilliseconds(operation.block_time))}
                    </p>
                    <details>
                      <summary>Operation details</summary>
                      <pre className={styles.json}>
                        {JSON.stringify(operation.op, null, 2)}
                      </pre>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section className={styles.panel} aria-labelledby="blocks-title">
          <div className={styles.panelTitle}>
            <h2 id="blocks-title">Recent blocks</h2>
            <button
              onClick={() => void blocks.refetch()}
              disabled={blocks.isFetching}
            >
              {blocks.isFetching ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          <p className={styles.panelHint}>
            Latest 20 blocks · Block details open the original portal ↗
          </p>
          {blocks.isError && (
            <p role="alert" className={styles.notice}>
              Blocks could not refresh.{" "}
              {blocks.data
                ? "Showing the last available blocks."
                : "Check your connection and retry."}{" "}
              <button onClick={() => void blocks.refetch()}>
                Retry blocks
              </button>
            </p>
          )}
          {witnesses.isError && (
            <p className={styles.notice}>
              Witness names are unavailable; showing witness IDs.{" "}
              <button onClick={() => void witnesses.refetch()}>
                Retry names
              </button>
            </p>
          )}
          <div className={styles.tableScroll}>
            <table className={styles.table} aria-label="Recent blocks">
              <thead>
                <tr>
                  <th>Block ID</th>
                  <th>Date</th>
                  <th>Witness</th>
                  <th>Transaction count</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((block) => {
                  const witness = witnesses.data?.find(
                    (item) => item.id === block.witness,
                  );
                  return (
                    <tr key={block.block_id}>
                      <td>
                        <a
                          href={`${referenceUrl}/block/${block.block_num}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open block in the original portal"
                        >
                          #{number.format(block.block_num)}
                        </a>
                      </td>
                      <td>
                        <time
                          dateTime={block.timestamp}
                          title={new Date(
                            timestampMilliseconds(block.timestamp),
                          ).toLocaleString()}
                        >
                          {time.format(timestampMilliseconds(block.timestamp))}
                        </time>
                      </td>
                      <td>
                        {witness?.account_name ? (
                          <Link
                            to="/account/$accountName"
                            params={{ accountName: witness.account_name }}
                            search={{ tab: "activity" }}
                          >
                            {witness.account_name}
                          </Link>
                        ) : (
                          `1.6.${block.witness}`
                        )}
                      </td>
                      <td>{number.format(block.tx_count)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {blocks.isPending && (
            <p className={styles.empty} role="status">
              Loading recent blocks…
            </p>
          )}
          {!blocks.isPending && !rows.length && (
            <p className={styles.empty}>
              {blocks.isError
                ? "Block data is unavailable."
                : "No blocks have been indexed yet."}
            </p>
          )}
        </section>
      </div>
    </>
  );
}
