import test from "node:test";
import assert from "node:assert/strict";
import {
  assetListRequest,
  defaultAssetSearch,
  pageCount,
  validateAssetSearch,
} from "../src/features/assets/search.ts";
import { formatAssetAmount, formatIndexedAmount } from "../src/lib/amounts.ts";

test("invalid URL values normalize to supported page sizes and sort fields", () => {
  assert.deepEqual(
    validateAssetSearch({
      page: -1,
      size: 100000,
      sort: "issuer;drop table",
      direction: "up",
      q: ["x"],
    }),
    defaultAssetSearch,
  );
  assert.equal(validateAssetSearch({ page: "2", size: "10" }).page, 2);
  assert.equal(validateAssetSearch({ page: "Infinity" }).page, 1);
  assert.equal(validateAssetSearch({ page: 1e10, size: 50 }).page, 1_000_000);
});
test("all filtering and ordering are included in the paginated server request", () => {
  const request = assetListRequest({
    ...defaultAssetSearch,
    q: "bts",
    match: "startsWith",
    page: 3,
    size: 10,
    direction: "desc",
  });
  assert.equal(request.offset, 20);
  assert.equal(request.limit, 10);
  assert.deepEqual(request.sort, [
    { field: "symbol", sort: "desc" },
    { field: "id", sort: "asc" },
  ]);
  assert.deepEqual(request.filters, [
    {
      field: "symbol",
      conditions: [{ filterType: "text", op: "startsWith", value: "bts" }],
    },
  ]);
});
test("numeric asset instances and full IDs use the correct protocol prefix", () => {
  for (const q of ["100", "1.3.100"]) {
    const request = assetListRequest({
      ...defaultAssetSearch,
      q,
      field: "id",
      match: "equals",
      sort: "id",
    });
    assert.equal(request.filters[0].conditions[0].value, "1.3.100");
    assert.equal(request.sort.length, 1);
  }
});
test("page counts include the partial last page and one empty page", () => {
  assert.equal(pageCount(76, 25), 4);
  assert.equal(pageCount(0, 25), 1);
});
test("amount formatting preserves fractional units and large integer precision", () => {
  assert.equal(formatAssetAmount(409326790233n, 5), "4,093,267.90233");
  assert.equal(formatAssetAmount(9007199254740993n, 5), "90,071,992,547.40993");
  assert.equal(formatAssetAmount(0n, 5), "0");
  assert.equal(formatIndexedAmount(9007199254740992, 5), "Unavailable");
});
