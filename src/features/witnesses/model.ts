export type Witness = {
  id: string;
  accountId: string;
  name: string;
  votes: bigint;
  missed: number;
  lastBlock: number;
  url: string | null;
  signingKey: string;
};

function integer(value: unknown, field: string): bigint {
  // Unknown RPC objects retain lossless JSON numbers; their string form is exact.
  const text = String(value);
  if (
    !/^\d+$/.test(text) ||
    (typeof value === "number" && !Number.isSafeInteger(value))
  ) {
    throw new Error(`Invalid witness ${field}`);
  }
  return BigInt(text);
}
function smallInteger(value: unknown, field: string) {
  const result = Number(integer(value, field));
  if (!Number.isSafeInteger(result))
    throw new Error(`Invalid witness ${field}`);
  return result;
}
export function safeWitnessUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function decodeWitness(value: unknown, expectedId: string): Witness {
  if (!value || typeof value !== "object")
    throw new Error(`Witness ${expectedId} is unavailable`);
  const record = value as Record<string, unknown>;
  if (
    record.id !== expectedId ||
    !/^1\.6\.\d+$/.test(expectedId) ||
    typeof record.witness_account !== "string" ||
    !/^1\.2\.\d+$/.test(record.witness_account)
  ) {
    throw new Error(`Invalid witness ${expectedId}`);
  }
  return {
    id: expectedId,
    accountId: record.witness_account,
    name: record.witness_account,
    votes: integer(record.total_votes, "votes"),
    missed: smallInteger(record.total_missed, "missed blocks"),
    lastBlock: smallInteger(record.last_confirmed_block_num, "last block"),
    url: safeWitnessUrl(record.url),
    signingKey:
      typeof record.signing_key === "string"
        ? record.signing_key
        : "Unavailable",
  };
}
export const defaultWitnessSearch = {
  q: "",
  sort: "votes" as "votes" | "name" | "missed" | "lastBlock",
  direction: "desc" as "asc" | "desc",
  page: 1,
  size: 25,
};
export type WitnessSearch = typeof defaultWitnessSearch;
export function validateWitnessSearch(
  value: Record<string, unknown>,
): WitnessSearch {
  const page = Number(value.page);
  const size = Number(value.size);
  return {
    q: typeof value.q === "string" ? value.q.trim().slice(0, 100) : "",
    sort: ["votes", "name", "missed", "lastBlock"].includes(String(value.sort))
      ? (value.sort as WitnessSearch["sort"])
      : "votes",
    direction: value.direction === "asc" ? "asc" : "desc",
    page:
      Number.isSafeInteger(page) && page > 0 ? Math.min(page, 1_000_000) : 1,
    size: [10, 25, 50].includes(size) ? size : 25,
  };
}
export function selectWitnesses(witnesses: Witness[], search: WitnessSearch) {
  const ranked = [...witnesses].sort((a, b) =>
    a.votes === b.votes
      ? a.id.localeCompare(b.id, undefined, { numeric: true })
      : a.votes > b.votes
        ? -1
        : 1,
  );
  const ranks = new Map(
    ranked.map((witness, index) => [witness.id, index + 1]),
  );
  const matching = witnesses.filter(
    (witness) =>
      witness.name.toLowerCase().includes(search.q.toLowerCase()) ||
      witness.id.includes(search.q),
  );
  matching.sort((a, b) => {
    const left = a[search.sort];
    const right = b[search.sort];
    const order =
      typeof left === "string" && typeof right === "string"
        ? left.localeCompare(right)
        : left < right
          ? -1
          : left > right
            ? 1
            : 0;
    return order === 0
      ? ranks.get(a.id)! - ranks.get(b.id)!
      : search.direction === "asc"
        ? order
        : -order;
  });
  const pages = Math.max(1, Math.ceil(matching.length / search.size));
  const page = Math.min(search.page, pages);
  return {
    rows: matching.slice((page - 1) * search.size, page * search.size),
    total: matching.length,
    pages,
    page,
    ranks,
  };
}
export function participation(slots: bigint): string {
  let filled = 0;
  for (let position = 0n; position < 128n; position++)
    if ((slots & (1n << position)) !== 0n) filled++;
  return `${((filled / 128) * 100).toFixed(2)}%`;
}
