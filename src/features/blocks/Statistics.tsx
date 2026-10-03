import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  SwaplockProvider,
  useDynamicGlobalProperties,
  useSwaplockClient,
} from "@open-graphene/chain-swaplock-react";
import { objectId } from "@open-graphene/primitives";
import { nodeUrl } from "../../lib/config";
import { useChainConnection } from "../../lib/useChainConnection";
import {
  formatWholeSupply,
  blockAge,
  blockMetrics,
  timestampMilliseconds,
  type Block,
} from "./metrics";
import { BlockChart } from "./BlockChart";
import * as styles from "./blocks.css";

type ChainValues = {
  head?: number;
  time?: string;
  witnesses?: number;
  committee?: number;
  missed?: number;
  supply?: string;
  stealthSupply?: string;
};
type Props = { blocks: Block[]; now: number };
const number = new Intl.NumberFormat("en-US");
const decimal = (value: number | null) =>
  value === null ? "—" : value.toFixed(2);

export function Statistics({ blocks }: { blocks: Block[] }) {
  const { connection, reconnect } = useChainConnection();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  if (connection.status === "connected")
    return (
      <SwaplockProvider client={connection.client}>
        <ConnectedStatistics blocks={blocks} now={now} reconnect={reconnect} />
      </SwaplockProvider>
    );
  return (
    <>
      <StatisticsGrid blocks={blocks} now={now} chain={{}} />
      <div className={styles.status} role="status">
        {connection.status === "error" ? (
          <>
            Live network data is unavailable.{" "}
            <button onClick={reconnect}>Reconnect</button>
          </>
        ) : (
          "Connecting to the Swaplock network…"
        )}
      </div>
    </>
  );
}

function ConnectedStatistics({
  blocks,
  now,
  reconnect,
}: Props & { reconnect: () => void }) {
  const client = useSwaplockClient();
  const head = useDynamicGlobalProperties({ live: true });
  const metadata = useQuery({
    queryKey: ["explorer", nodeUrl, "network-metadata"],
    queryFn: async () => {
      const [global, asset] = await Promise.all([
        client.database.getGlobalProperties({}),
        client.database.asset("1.3.0"),
      ]);
      const [dynamic] = await client.database.getObjects({
        ids: [objectId(asset.dynamic_asset_data_id)],
        subscribe: false,
      });
      if (dynamic?.kind !== "asset_dynamic_data")
        throw new Error("Core asset supply is unavailable");
      const amount = (raw: bigint) =>
        formatWholeSupply(raw, asset.precision, asset.symbol);
      return {
        witnesses: global.active_witnesses.length,
        committee: global.active_committee_members.length,
        supply: amount(dynamic.value.current_supply),
        stealthSupply: amount(dynamic.value.confidential_supply),
      };
    },
    structuralSharing: false,
    refetchInterval: 15_000,
  });
  const chain: ChainValues = {
    ...metadata.data,
    head: head.data?.head_block_number,
    time: head.data?.time,
    missed: head.data?.recently_missed_count,
  };
  const headOld =
    chain.time !== undefined &&
    now - timestampMilliseconds(chain.time) > 15_000;
  const live = head.live.status === "live" && !headOld && !head.isError;
  const indexedHead = blocks[0]?.block_num;
  const lag =
    indexedHead !== undefined && chain.head !== undefined
      ? Math.max(0, chain.head - indexedHead)
      : null;
  return (
    <>
      <StatisticsGrid blocks={blocks} now={now} chain={chain} />
      <div className={styles.status} role="status">
        <span className={live ? styles.healthy : styles.warning}>
          {live ? "Live network" : "Live updates interrupted"}
        </span>
        {!live && <button onClick={reconnect}>Reconnect</button>}
        {metadata.isError && (
          <span>
            Network details could not refresh.{" "}
            <button onClick={() => void metadata.refetch()}>Retry</button>
          </span>
        )}
        {indexedHead !== undefined && (
          <span>
            Indexed block #{number.format(indexedHead)}
            {lag !== null && lag > 0
              ? ` · ${number.format(lag)} behind the network`
              : ""}
          </span>
        )}
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string | number | undefined;
  tone?: "healthy" | "warning";
  hint?: string;
}) {
  return (
    <div className={styles.stat} title={hint}>
      <dt>{label}</dt>
      <dd className={tone ? styles[tone] : undefined}>{value ?? "—"}</dd>
    </div>
  );
}

function StatisticsGrid({
  blocks,
  now,
  chain,
}: Props & { chain: ChainValues }) {
  const metrics = blockMetrics(blocks);
  return (
    <dl className={styles.statistics} aria-label="Blockchain statistics">
      <Stat
        label="Current block"
        value={
          chain.head === undefined ? undefined : `#${number.format(chain.head)}`
        }
      />
      <Stat
        label="Last block"
        value={chain.time ? blockAge(chain.time, now) : undefined}
        tone={
          chain.time && now - timestampMilliseconds(chain.time) <= 15_000
            ? "healthy"
            : "warning"
        }
      />
      <Stat label="Trx/s" value={decimal(metrics.transactionsPerSecond)} />
      <Stat
        label="Average confirmation time"
        value={
          metrics.confirmationSeconds === null
            ? "—"
            : `${decimal(metrics.confirmationSeconds)}s`
        }
        hint="Estimate: half the average interval between recent blocks. This is not irreversible finality."
      />
      <Stat label="Active witnesses" value={chain.witnesses} tone="healthy" />
      <Stat
        label="Active committee members"
        value={chain.committee}
        tone="healthy"
      />
      <Stat label="Trx/block" value={decimal(metrics.transactionsPerBlock)} />
      <Stat
        label="Recently missed blocks"
        value={chain.missed}
        tone="warning"
      />
      <Stat label="Current supply" value={chain.supply} />
      <div className={styles.stat}>
        <dt>Block times</dt>
        <dd>
          <BlockChart
            label="Block times"
            points={metrics.intervals}
            unit="seconds"
          />
        </dd>
      </div>
      <div className={styles.stat}>
        <dt>Trx/block</dt>
        <dd>
          <BlockChart
            label="Transactions per block"
            points={metrics.transactions}
            unit="transactions"
          />
        </dd>
      </div>
      <Stat label="Stealth supply" value={chain.stealthSupply} />
    </dl>
  );
}
