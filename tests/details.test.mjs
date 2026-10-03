import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  SignedBlockCodec,
  parseJson,
} from "@open-graphene/chain-swaplock-bindings";
import {
  parseBlockHeight,
  processedTransactionId,
} from "../src/features/block/model.ts";
import {
  assetDescription,
  assetFlags,
  validateAssetDetailSearch,
} from "../src/features/asset/model.ts";
import { displayJson } from "../src/lib/json.ts";
const fixture = JSON.parse(
  readFileSync(new URL("./details.fixture.json", import.meta.url), "utf8"),
);
test("block heights reject nonnumeric, fractional and out-of-range route values", () => {
  for (const value of ["0", "-1", "1.5", "1e3", "4294967296", "oops"])
    assert.equal(parseBlockHeight(value), undefined);
  assert.equal(parseBlockHeight("4294967295"), 4294967295);
});
test("processed transaction IDs exclude signatures and execution results", () => {
  const block = SignedBlockCodec.decode(
    parseJson(JSON.stringify(fixture.block)),
  );
  const transaction = block.transactions[0];
  assert.equal(
    processedTransactionId(transaction),
    "3217ccb0093b11b124a34979352b34390c5675f4",
  );
  assert.equal(
    processedTransactionId({
      ...transaction,
      signatures: [],
      operation_results: [],
    }),
    processedTransactionId(transaction),
  );
});
test("asset descriptions preserve plain text and HTML as text, and flags include unknown bits", () => {
  assert.equal(assetDescription('{"main":"Description"}'), "Description");
  assert.equal(assetDescription("<img src=x>"), "<img src=x>");
  assert.deepEqual(assetFlags(0), []);
  assert.deepEqual(assetFlags(0x201), [
    "Charge market fee",
    "Lock maximum supply",
  ]);
  assert.match(assetFlags(0x10000)[0], /0x10000/);
  assert.deepEqual(validateAssetDetailSearch({ tab: "bad", page: -1 }), {
    tab: "overview",
    page: 1,
  });
});
test("raw detail display preserves large integers and renders bytes as hex", () => {
  assert.equal(
    displayJson({ amount: 9007199254740993n, bytes: new Uint8Array([0, 255]) }),
    '{\n  "amount": "9007199254740993",\n  "bytes": "00ff"\n}',
  );
});
