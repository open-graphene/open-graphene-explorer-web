export type CommitteeMember = {
  id: string;
  accountId: string;
  name: string;
  votes: bigint;
  website: string;
  rank: number;
};
export type CommitteeSearch = {
  q: string;
  sort: "rank" | "name" | "votes";
  direction: "asc" | "desc";
  page: number;
  size: 10 | 25 | 50;
};
export const defaultCommitteeSearch: CommitteeSearch = {
  q: "",
  sort: "rank",
  direction: "asc",
  page: 1,
  size: 25,
};
export function validateCommitteeSearch(
  value: Record<string, unknown>,
): CommitteeSearch {
  const page = Number(value.page);
  const size = Number(value.size);
  return {
    q: typeof value.q === "string" ? value.q.trim().slice(0, 100) : "",
    sort: value.sort === "name" || value.sort === "votes" ? value.sort : "rank",
    direction: value.direction === "desc" ? "desc" : "asc",
    page:
      Number.isSafeInteger(page) && page > 0 ? Math.min(page, 1_000_000) : 1,
    size: size === 10 || size === 50 ? size : 25,
  };
}

// get_objects preserves unsupported object kinds as unknown. Validate the small
// committee projection here until the generated binding includes object 1.5.
export function decodeCommitteeMember(
  value: unknown,
): Omit<CommitteeMember, "name" | "rank"> {
  if (!value || typeof value !== "object")
    throw new Error("Missing committee object");
  const member = value as Record<string, unknown>;
  if (
    typeof member.id !== "string" ||
    !/^1\.5\.\d+$/.test(member.id) ||
    typeof member.committee_member_account !== "string" ||
    !/^1\.2\.\d+$/.test(member.committee_member_account) ||
    typeof member.url !== "string"
  )
    throw new Error("Invalid committee object");
  const rawVotes = member.total_votes;
  // The generated codec preserves unknown objects using lossless JSON numbers.
  const voteText = String(rawVotes);
  if (
    !/^\d+$/.test(voteText) ||
    (typeof rawVotes === "number" && !Number.isSafeInteger(rawVotes))
  ) {
    throw new Error(`Invalid vote amount for ${member.id}`);
  }
  const votes = BigInt(voteText);
  return {
    id: member.id,
    accountId: member.committee_member_account,
    votes,
    website: member.url,
  };
}
export function safeCommitteeWebsite(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {
    /* An invalid website remains visible as text, never a link. */
  }
  return undefined;
}
export function selectCommitteeMembers(
  members: readonly CommitteeMember[],
  search: CommitteeSearch,
) {
  const query = search.q.toLowerCase();
  const filtered = members.filter(
    (member) =>
      member.name.toLowerCase().includes(query) || member.id.includes(query),
  );
  filtered.sort((left, right) => {
    const first = left[search.sort];
    const second = right[search.sort];
    const comparison = first < second ? -1 : first > second ? 1 : 0;
    return (
      (search.direction === "asc" ? comparison : -comparison) ||
      left.rank - right.rank
    );
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / search.size));
  const page = Math.min(search.page, pageCount);
  return {
    total: filtered.length,
    pageCount,
    page,
    rows: filtered.slice((page - 1) * search.size, page * search.size),
  };
}
