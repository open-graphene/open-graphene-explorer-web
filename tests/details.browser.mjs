import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { preview } from "vite";
const live = process.argv.includes("--live");
const server = process.env.EXPLORER_URL
  ? null
  : await preview({
      preview: { host: "127.0.0.1", port: 5199, strictPort: true },
    });
const base = process.env.EXPLORER_URL ?? "http://127.0.0.1:5199";
const browser = await chromium.launch();
const fixture = JSON.parse(
  await readFile(new URL("./details.fixture.json", import.meta.url), "utf8"),
);
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let failBlock = false,
    failSupply = false,
    failHolders = false;
  const rpcRequests = [],
    queryRequests = [];
  if (!live) {
    await page.routeWebSocket(/wss:\/\//, (socket) =>
      socket.onMessage((message) => {
        const request = JSON.parse(String(message));
        const [, method, args] = request.params;
        rpcRequests.push({ method, args });
        let result;
        if (method === "login") result = true;
        else if (["database", "history", "network_broadcast"].includes(method))
          result = { database: 0, history: 2, network_broadcast: 3 }[method];
        else if (method === "get_chain_id")
          result =
            "3b4f346481a66146d732eb22a43b5956134e5bea6124b379033589146036cbbf";
        else if (
          (method === "get_block" && failBlock) ||
          (method === "get_objects" && failSupply && args[0].includes("2.3.0"))
        ) {
          socket.send(
            JSON.stringify({
              id: request.id,
              error: { code: 1, message: "Injected RPC failure" },
            }),
          );
          return;
        } else if (method === "get_block")
          result =
            args[0] === 3350
              ? fixture.block
              : args[0] === 3351
                ? { ...fixture.block, transactions: [] }
                : null;
        else if (method === "get_dynamic_global_properties")
          result = { ...fixture.head, head_block_number: 3351 };
        else if (method === "get_assets")
          result = args[0].map((name) =>
            ["BTS", "1.3.0"].includes(name)
              ? {
                  ...fixture.asset,
                  options: {
                    ...fixture.asset.options,
                    description: '{"main":"<b>Safe text description</b>"}',
                  },
                }
              : null,
          );
        else if (method === "get_objects")
          result = args[0].map(
            (id) => fixture.objects.find((object) => object.id === id) ?? null,
          );
        else if (method === "get_accounts")
          result = args[0].map(
            (id) =>
              fixture.accounts.find((account) => account.id === id) ?? null,
          );
        else throw new Error(`Unexpected RPC ${method}`);
        socket.send(JSON.stringify({ id: request.id, result }));
      }),
    );
    await page.route("**/graphene/swaplock/indexer/**", async (route) => {
      const url = new URL(route.request().url());
      queryRequests.push(url);
      assert.ok(url.pathname.includes("/assets/get_holders/"));
      if (failHolders)
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: '{"error":"Unavailable"}',
        });
      const offset = Number(url.searchParams.get("offset")),
        limit = Number(url.searchParams.get("limit"));
      const holders = Array.from({ length: 60 }, (_, id) => ({
        account_id: id,
        account_name: `holder-${String(id).padStart(2, "0")}`,
        amount: 6000000 - id * 100000,
        amount_units: 60 - id,
      }));
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          asset_id: 0,
          symbol: "BTS",
          holders: holders.slice(offset, offset + limit),
          offset,
          limit,
        }),
      });
    });
  }
  await page.goto(`${base}/block/3350`);
  await page
    .getByRole("heading", { name: "Transaction 1", exact: true })
    .waitFor();
  await page
    .getByText("3217ccb0093b11b124a34979352b34390c5675f4", { exact: true })
    .waitFor();
  await page.getByText("Operation and result", { exact: true }).first().click();
  assert.match(await page.locator("pre").first().innerText(), /registrar/);
  await page.screenshot({
    path: `/tmp/explorer-block-${live ? "live" : "fixture"}.png`,
    fullPage: true,
  });
  if (!live) {
    failBlock = true;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page
      .getByRole("button", { name: "Retry block", exact: true })
      .waitFor({ timeout: 15000 });
    await page
      .getByRole("heading", { name: "Transaction 1", exact: true })
      .waitFor();
    failBlock = false;
    await page
      .getByRole("button", { name: "Retry block", exact: true })
      .click();
    await page.getByRole("alert").waitFor({ state: "hidden" });
    await page.getByRole("link", { name: "Next block →", exact: true }).click();
    await page
      .getByRole("heading", { name: "No transactions", exact: true })
      .waitFor();
    await page.getByLabel("Block number", { exact: true }).fill("3352");
    await page.getByRole("button", { name: "Go", exact: true }).click();
    await page
      .getByRole("heading", { name: "Block not found", exact: true })
      .waitFor();
    await page.goto(`${base}/block/not-a-number`);
    await page
      .getByRole("heading", { name: "Invalid block number", exact: true })
      .waitFor();
  }
  if (live) {
    await page.goto(`${base}/explorer/assets?q=BTS`);
    await page.getByRole("link", { name: "BTS", exact: true }).click();
    await page.waitForURL("**/asset/BTS");
    await page.getByRole("heading", { name: "Fees", exact: true }).waitFor();
    await page.goBack();
    assert.equal(new URL(page.url()).searchParams.get("q"), "BTS");
  }
  await page.goto(`${base}/asset/BTS`);
  await page.getByRole("heading", { name: "Fees", exact: true }).waitFor();
  await page.getByRole("link", { name: "null-account", exact: true }).waitFor();
  await page.waitForFunction(
    () => !document.querySelector("main").textContent.includes("Loading…"),
  );
  assert.equal(await page.getByRole("alert").count(), 0);
  if (!live) {
    assert.equal(await page.locator("main b").count(), 0);
    await page
      .getByText("<b>Safe text description</b>", { exact: true })
      .waitFor();
    failSupply = true;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page
      .getByRole("button", { name: "Retry supply", exact: true })
      .waitFor({ timeout: 15000 });
    await page.getByRole("heading", { name: "Fees", exact: true }).waitFor();
    failSupply = false;
    await page
      .getByRole("button", { name: "Retry supply", exact: true })
      .click();
    await page.getByRole("alert").waitFor({ state: "hidden" });
  }
  await page.screenshot({
    path: `/tmp/explorer-asset-${live ? "live" : "fixture"}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Holders", exact: true }).click();
  await page
    .getByRole("table", { name: "Asset holders", exact: true })
    .waitFor();
  await page.locator("tbody tr").first().waitFor();
  if (!live) {
    assert.equal(await page.locator("tbody tr").count(), 25);
    await page
      .getByRole("button", { name: "Next holders", exact: true })
      .click();
    await page.getByRole("link", { name: "holder-25", exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("page"), "2");
    assert.equal(queryRequests.at(-1).searchParams.get("offset"), "25");
    await page.reload();
    await page.getByRole("link", { name: "holder-25", exact: true }).waitFor();
    failHolders = true;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page
      .getByRole("button", { name: "Retry holders", exact: true })
      .waitFor({ timeout: 15000 });
    assert.equal(await page.locator("tbody tr").count(), 25);
    failHolders = false;
    await page
      .getByRole("button", { name: "Retry holders", exact: true })
      .click();
    await page.getByRole("alert").waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "Next holders", exact: true })
      .click();
    await page.getByRole("link", { name: "holder-50", exact: true }).waitFor();
    assert.equal(await page.locator("tbody tr").count(), 10);
    assert.ok(
      await page
        .getByRole("button", { name: "Next holders", exact: true })
        .isDisabled(),
    );
  }
  for (const path of ["/block/3350", "/asset/BTS"]) {
    await page.goto(base + path);
    await page
      .getByRole("heading", {
        name: path.includes("block") ? "Transaction 1" : "Fees",
        exact: true,
      })
      .waitFor();
    for (const width of [1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `${path} overflow ${width}`,
      );
    }
  }
  if (!live) {
    await page.goto(`${base}/asset/UNKNOWN`);
    await page
      .getByRole("heading", { name: "Asset not found", exact: true })
      .waitFor();
  }
  assert.deepEqual(errors, []);
  console.log(
    `PASS ${live ? "live" : "fixture"} block/asset details: RPC transactions, supply, local links, Query holders, pagination, reload, responsive layouts${live ? "" : ", partial errors/retry, empty and invalid states"}`,
  );
} finally {
  await browser.close();
  if (server)
    await new Promise((resolve, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : resolve())),
    );
}
