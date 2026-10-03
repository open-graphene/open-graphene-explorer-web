import test from "node:test";
import assert from "node:assert/strict";
import {
  accountListRequest,
  defaultAccountSearch,
  validateAccountSearch,
} from "../src/features/accounts/search.ts";
import { supplyPercentage } from "../src/features/accounts/percentage.ts";

test("account URL rejects unsupported ordering and invalid pagination", () => {
  assert.deepEqual(
    validateAccountSearch({
      sort: "balance",
      field: "unknown",
      size: 500,
      page: -1,
    }),
    defaultAccountSearch,
  );
  assert.equal(validateAccountSearch({ page: "2", size: "50" }).page, 2);
});
test("account queries filter registrars and order the whole result before pagination", () => {
  const query = accountListRequest({
    ...defaultAccountSearch,
    q: "swaplock",
    field: "registrar_name",
    sort: "registrar_name",
    direction: "desc",
    page: 3,
    size: 10,
  });
  assert.equal(query.offset, 20);
  assert.equal(query.limit, 10);
  assert.deepEqual(query.filters, [
    {
      field: "registrar_name",
      conditions: [{ filterType: "text", op: "contains", value: "swaplock" }],
    },
  ]);
  assert.deepEqual(query.sort, [
    { field: "registrar_name", sort: "desc" },
    { field: "id", sort: "asc" },
  ]);
});
test("account instance searches expand to account IDs, not asset IDs", () => {
  for (const q of ["100", "1.2.100"]) {
    assert.equal(
      accountListRequest({
        ...defaultAccountSearch,
        q,
        field: "id",
        match: "equals",
      }).filters[0].conditions[0].value,
      "1.2.100",
    );
  }
});
test("supply percentages preserve large integer precision and distinguish tiny balances from zero", () => {
  assert.equal(supplyPercentage(0n, 100n), "0%");
  assert.equal(supplyPercentage(1n, 3n), "33.3333%");
  assert.equal(supplyPercentage(1n, 10_000_000n), "<0.0001%");
  assert.equal(supplyPercentage(9007199254740993n, 90071992547409930n), "10%");
  assert.equal(supplyPercentage(1n, 0n), "Unavailable");
});
