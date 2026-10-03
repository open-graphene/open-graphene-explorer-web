import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeCommitteeMember,
  defaultCommitteeSearch,
  selectCommitteeMembers,
  safeCommitteeWebsite,
  validateCommitteeSearch,
} from "../src/features/committee/model.ts";

test("committee decodes exact RPC votes and rejects invalid object identities or unsafe numbers", () => {
  const raw = {
    id: "1.5.0",
    committee_member_account: "1.2.10",
    url: "",
    total_votes: "9007199254740993",
  };
  assert.equal(decodeCommitteeMember(raw).votes, 9007199254740993n);
  assert.equal(
    decodeCommitteeMember({
      ...raw,
      total_votes: { toString: () => "9007199254740993" },
    }).votes,
    9007199254740993n,
  );
  for (const invalid of [
    { ...raw, id: "1.6.0" },
    { ...raw, total_votes: 9007199254740993 },
    { ...raw, total_votes: -1 },
    { ...raw, total_votes: null },
  ])
    assert.throws(() => decodeCommitteeMember(invalid));
});
test("committee filters and sorts the full active set before pagination", () => {
  const members = Array.from({ length: 31 }, (_, index) => ({
    id: `1.5.${index}`,
    accountId: `1.2.${index}`,
    rank: index + 1,
    name: `member-${String(index).padStart(2, "0")}`,
    votes: BigInt(index),
    website: "",
  }));
  const result = selectCommitteeMembers(members, {
    ...defaultCommitteeSearch,
    sort: "votes",
    direction: "desc",
    size: 10,
    page: 2,
  });
  assert.equal(result.rows[0].votes, 20n);
  assert.equal(result.total, 31);
  assert.equal(
    selectCommitteeMembers(members, {
      ...defaultCommitteeSearch,
      q: "member-30",
      page: 10,
    }).page,
    1,
  );
  assert.equal(members[0].rank, 1);
});
test("committee URL values are bounded and websites only permit HTTP protocols", () => {
  assert.deepEqual(validateCommitteeSearch({}), defaultCommitteeSearch);
  assert.equal(
    validateCommitteeSearch({ page: Infinity, size: 3, sort: "bad" }).page,
    1,
  );
  assert.equal(safeCommitteeWebsite("javascript:alert(1)"), undefined);
  assert.equal(
    safeCommitteeWebsite("https://example.org"),
    "https://example.org/",
  );
});
