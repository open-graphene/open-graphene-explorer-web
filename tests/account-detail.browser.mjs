import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { preview } from "vite";
const live = process.argv.includes("--live");
const server = await preview({
  preview: { host: "127.0.0.1", port: 5196, strictPort: true },
});
const browser = await chromium.launch({ headless: true });
const fixture = JSON.parse(
  await readFile(
    new URL("./account-detail.fixture.json", import.meta.url),
    "utf8",
  ),
);
const name = fixture.full.account.name;
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let failBalances = false;
  await page.addInitScript(() => {
    window.__sockets = [];
    const Native = window.WebSocket;
    window.WebSocket = class extends Native {
      constructor(...args) {
        super(...args);
        window.__sockets.push(this);
      }
    };
  });
  if (!live)
    await page.routeWebSocket(/wss:\/\//, (socket) => {
      socket.onClose(() => socket.close());
      socket.onMessage((message) => {
        const request = JSON.parse(String(message));
        const [, method, args] = request.params;
        let result;
        if (method === "login") result = true;
        else if (["database", "history", "network_broadcast"].includes(method))
          result = { database: 0, history: 2, network_broadcast: 3 }[method];
        else if (method === "get_chain_id")
          result =
            "3b4f346481a66146d732eb22a43b5956134e5bea6124b379033589146036cbbf";
        else if (method === "get_accounts")
          result = args[0].map((name) =>
            name === "missing-account" ? null : fixture.full.account,
          );
        else if (method === "get_full_accounts")
          result = [[name, fixture.full]];
        else if (method === "get_account_balances") {
          if (failBalances) {
            socket.send(
              JSON.stringify({
                id: request.id,
                error: { code: 1, message: "Balance service unavailable" },
              }),
            );
            return;
          }
          result = [{ asset_id: "1.3.0", amount: "9007199254740993" }];
        } else if (method === "get_assets") result = [fixture.asset];
        else if (method === "get_account_history") {
          const start =
            args[3] === "1.11.0" ? 60 : Number(args[3].split(".")[2]);
          result = Array.from({ length: Math.min(args[2], start) }, (_, i) => ({
            id: `1.11.${start - i}`,
            op: [
              0,
              {
                fee: { asset_id: "1.3.0", amount: "0" },
                from: "1.2.136",
                to: "1.2.100",
                amount: { asset_id: "1.3.0", amount: "123450" },
                extensions: [],
              },
            ],
            result: [0, {}],
            block_num: 1000 - i,
            trx_in_block: 0,
            op_in_trx: 0,
            virtual_op: 0,
            is_virtual: false,
            block_time: "2026-08-18T20:33:33",
          }));
        } else {
          console.error("unexpected", method);
          result = null;
        }
        socket.send(JSON.stringify({ id: request.id, result }));
      });
    });
  await page.goto(`http://127.0.0.1:5196/account/${name}`);
  await page
    .getByRole("table", { name: "Account activity" })
    .waitFor({ timeout: 30000 });
  if (!live) {
    assert.equal(await page.locator("tbody tr").count(), 25);
    assert.match(
      await page.locator("tbody tr").first().innerText(),
      /1\.11\.60/,
    );
    await page.getByRole("button", { name: "Older activity" }).click();
    await page.waitForURL(/before=1\.11\.35/);
    await page.getByText("1.11.35", { exact: true }).waitFor();
    assert.match(
      await page.locator("tbody tr").first().innerText(),
      /1\.11\.35/,
    );
    await page.reload();
    await page.getByText("1.11.35", { exact: true }).waitFor();
    await page.getByRole("link", { name: "Balances", exact: true }).click();
    await page.getByRole("table", { name: "Account balances" }).waitFor();
    await page.getByText("90,071,992,547.40993", { exact: true }).waitFor();
    failBalances = true;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Balances could not be loaded" })
      .waitFor({ timeout: 15000 });
    await page.getByText("90,071,992,547.40993", { exact: true }).waitFor();
    failBalances = false;
    await page.getByRole("button", { name: "Retry balances" }).click();
    await page.getByRole("alert").waitFor({ state: "detached" });
    await page.getByRole("link", { name: "Activity", exact: true }).click();
    await page.getByText("1.11.35", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Newest activity" }).click();
    await page.getByText("1.11.60", { exact: true }).waitFor();
  } else {
    await page
      .getByRole("rowheader", { name: /Create data room/ })
      .first()
      .waitFor();
    await page.getByRole("link", { name: "Balances", exact: true }).click();
    await page
      .getByRole("heading", { name: "No balances", exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("heading", { name: "No balances", exact: true })
      .waitFor();
    await page.getByRole("link", { name: "Activity", exact: true }).click();
    await page.getByRole("table", { name: "Account activity" }).waitFor();
  }
  await page.screenshot({
    path: `/tmp/open-graphene-account-${live ? "live" : "fixture"}-desktop.png`,
    fullPage: true,
  });
  for (const width of [1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `overflow at ${width}`,
    );
  }
  await page.screenshot({
    path: `/tmp/open-graphene-account-${live ? "live" : "fixture"}-mobile.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "About", exact: true }).click();
  // Playwright replaces WebSocket for mocked routes, bypassing the native
  // instrumentation above. Verify actual transport cleanup in the live run.
  if (live)
    await page.waitForFunction(
      () =>
        window.__sockets.length > 0 &&
        window.__sockets.every(
          (socket) => socket.readyState === WebSocket.CLOSED,
        ),
    );
  if (!live) {
    await page.goto("http://127.0.0.1:5196/account/missing-account");
    await page.getByRole("heading", { name: "Account not found" }).waitFor();
  }
  assert.deepEqual(errors, []);
  console.log(
    `PASS account ${live ? "live" : "fixtures"}: activity, balances, URL tabs/reload, responsive${live ? ", connection cleanup" : ", inclusive cursor paging, exact bigint, failure retains data, retry, not found"}`,
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
