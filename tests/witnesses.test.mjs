import test from "node:test";
import assert from "node:assert/strict";
import {
  decodeWitness,
  safeWitnessUrl,
  selectWitnesses,
  defaultWitnessSearch,
  validateWitnessSearch,
  participation,
} from "../src/features/witnesses/model.ts";
const witness = (id, votes, name) => ({
  id,
  votes,
  name,
  missed: 0,
  lastBlock: 1,
  accountId: "1.2.1",
  url: null,
});
test("witness ranking retains exact large votes before filtering and pagination", () => {
  const rows = [
    witness("1.6.1", 9007199254740992n, "alpha"),
    witness("1.6.2", 9007199254740993n, "beta"),
  ];
  const result = selectWitnesses(rows, {
    ...defaultWitnessSearch,
    q: "alpha",
    size: 1,
    page: 99,
  });
  assert.equal(result.rows[0].name, "alpha");
  assert.equal(result.ranks.get("1.6.1"), 2);
  assert.equal(result.page, 1);
  assert.equal(rows[0].name, "alpha");
});
test("witness decoding rejects unsafe integers and unsafe external URLs", () => {
  const raw = {
    id: "1.6.1",
    witness_account: "1.2.9",
    total_votes: "9007199254740993",
    total_missed: 0,
    last_confirmed_block_num: 25,
    url: "javascript:alert(1)",
  };
  assert.equal(decodeWitness(raw, raw.id).votes, 9007199254740993n);
  assert.equal(decodeWitness(raw, raw.id).url, null);
  assert.throws(() =>
    decodeWitness({ ...raw, total_votes: 9007199254740993 }, raw.id),
  );
  assert.throws(() => decodeWitness(raw, "1.6.2"));
  assert.equal(safeWitnessUrl("https://example.org"), "https://example.org/");
  assert.equal(safeWitnessUrl("//example.org"), null);
});
test("witness URL state normalizes invalid page and sort values", () => {
  assert.deepEqual(
    validateWitnessSearch({ page: -1, size: 500, sort: "nonsense" }),
    defaultWitnessSearch,
  );
});
test("participation counts all 128 recent slots", () => {
  assert.equal(participation((1n << 128n) - 1n), "100.00%");
  assert.equal(participation(0n), "0.00%");
  assert.equal(participation(1n << 127n), "0.78%");
});
