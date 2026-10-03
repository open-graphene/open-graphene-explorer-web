import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { bytesToHex } from "@open-graphene/primitives";
import { useChainConnection } from "../lib/useChainConnection";
import { displayJson } from "../lib/json";
import { operationLabel, operationSummary } from "../features/account/activity";
import {
  parseBlockHeight,
  processedTransactionId,
} from "../features/block/model";
import {
  blockQuery,
  blockHeadQuery,
  blockWitnessQuery,
} from "../features/block/queries";
import * as list from "../features/explorer-list/list.css";
import * as detail from "../features/detail/detail.css";

export const Route = createFileRoute("/block/$height")({
  component: BlockPage,
});

function BlockPage() {
  const { height: rawHeight } = Route.useParams();
  const height = parseBlockHeight(rawHeight);
  const navigate = Route.useNavigate();
  const [draft, setDraft] = useState(rawHeight);
  useEffect(() => setDraft(rawHeight), [rawHeight]);
  const { connection, reconnect } = useChainConnection();
  const client =
    connection.status === "connected" ? connection.client : undefined;
  const block = useQuery(blockQuery(client, height));
  const head = useQuery(blockHeadQuery(client));
  const witness = useQuery(blockWitnessQuery(client, block.data?.witness));
  const error = connection.status === "error" ? connection.error : block.error;
  const transactions = block.data?.transactions ?? [];
  function refresh() {
    if (connection.status === "error") {
      reconnect();
      return;
    }
    void block.refetch();
    void head.refetch();
    if (block.data) void witness.refetch();
  }
  if (height === undefined)
    return (
      <section className={list.page}>
        <h1>Invalid block number</h1>
        <p>Enter a whole block number between 1 and 4,294,967,295.</p>
        <Link to="/explorer/blocks">Back to blocks</Link>
      </section>
    );
  return (
    <section className={list.page}>
      <div className={list.heading}>
        <div>
          <h1>Block #{height.toLocaleString("en-US")}</h1>
          <p>Transactions and execution results from the node</p>
        </div>
        <button
          onClick={refresh}
          disabled={connection.status === "connecting" || block.isFetching}
        >
          Refresh
        </button>
      </div>
      <div className={list.toolbar}>
        <div className={detail.row}>
          <Link to="/explorer/blocks">All blocks</Link>
          {height > 1 && (
            <Link to="/block/$height" params={{ height: String(height - 1) }}>
              ← Previous block
            </Link>
          )}
          {head.data && height < head.data.head_block_number && (
            <Link to="/block/$height" params={{ height: String(height + 1) }}>
              Next block →
            </Link>
          )}
        </div>
        <form
          className={detail.row}
          onSubmit={(event) => {
            event.preventDefault();
            const value = parseBlockHeight(draft);
            if (value) void navigate({ params: { height: String(value) } });
          }}
        >
          <label>
            Go to block
            <input
              aria-label="Block number"
              type="number"
              min="1"
              max="4294967295"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <button>Go</button>
        </form>
      </div>
      {error && (
        <div role="alert" className={list.error}>
          Block could not be loaded: {error.message}.{" "}
          {block.data && "Previously loaded data is shown."}{" "}
          <button onClick={refresh}>Retry block</button>
        </div>
      )}
      {!error && block.isPending && <p role="status">Loading block…</p>}
      {block.data === null && (
        <div className={list.empty}>
          <h2>Block not found</h2>
          <p>
            {head.data && height > head.data.head_block_number
              ? "This block has not been produced yet."
              : "The node did not return this block."}
          </p>
        </div>
      )}
      {block.data && (
        <div className={detail.content}>
          <dl className={detail.summary}>
            <div>
              <dt>Timestamp (UTC)</dt>
              <dd>{block.data.timestamp.replace("T", " ")}</dd>
            </div>
            <div>
              <dt>Witness</dt>
              <dd>
                {witness.data ? (
                  <Link
                    to="/account/$accountName"
                    params={{ accountName: witness.data.name }}
                    search={{ tab: "activity" }}
                  >
                    {witness.data.name}
                  </Link>
                ) : (
                  block.data.witness
                )}
              </dd>
            </div>
            <div>
              <dt>Transactions</dt>
              <dd>{transactions.length}</dd>
            </div>
            <div>
              <dt>Operations</dt>
              <dd>
                {transactions.reduce(
                  (count, transaction) => count + transaction.operations.length,
                  0,
                )}
              </dd>
            </div>
            <div>
              <dt>Previous block hash</dt>
              <dd>{bytesToHex(block.data.previous)}</dd>
            </div>
            <div>
              <dt>Transaction Merkle root</dt>
              <dd>{bytesToHex(block.data.transaction_merkle_root)}</dd>
            </div>
          </dl>
          {witness.isError && (
            <p className={list.error}>
              Witness name is unavailable.{" "}
              <button onClick={() => void witness.refetch()}>
                Retry witness
              </button>
            </p>
          )}
          {head.isError && (
            <p className={list.error}>
              Network head is unavailable; next-block navigation is paused.{" "}
              <button onClick={() => void head.refetch()}>Retry head</button>
            </p>
          )}
          {transactions.length === 0 && (
            <div className={list.empty}>
              <h2>No transactions</h2>
              <p>This block contains no transactions.</p>
            </div>
          )}
          {transactions.map((transaction, index) => (
            <section className={detail.section} key={index} id={`tx_${index}`}>
              <h2>Transaction {index + 1}</h2>
              <p className={detail.code}>
                {processedTransactionId(transaction)}
              </p>
              <p className={list.muted}>
                Expires {transaction.expiration.replace("T", " ")} UTC ·{" "}
                {transaction.signatures.length} signatures
              </p>
              {transaction.operations.map((operation, operationIndex) => (
                <div className={detail.operation} key={operationIndex}>
                  <h3>
                    {operationIndex + 1}. {operationLabel(operation[0])}
                  </h3>
                  <p>{operationSummary(operation)}</p>
                  <details>
                    <summary>Operation and result</summary>
                    <pre className={detail.code}>
                      {displayJson({
                        operation,
                        result: transaction.operation_results[operationIndex],
                      })}
                    </pre>
                  </details>
                </div>
              ))}
              <details>
                <summary>Full transaction</summary>
                <pre className={detail.code}>{displayJson(transaction)}</pre>
              </details>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
