import assert from "node:assert/strict";
import { chromium } from "playwright";
import { preview } from "vite";

const server = await preview({
  preview: { host: "127.0.0.1", port: 5193, strictPort: true },
});
const url = "http://127.0.0.1:5193/explorer/accounts";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [],
    sockets = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("websocket", (socket) => sockets.push(socket.url()));
  const link = (name) => page.getByRole("link", { name, exact: true });
  const button = (name) => page.getByRole("button", { name, exact: true });
  const search = page.getByLabel("Search accounts", { exact: true });
  if (process.argv.includes("--live")) {
    await page.goto(url);
    await page.locator("tbody tr").first().waitFor();
    await page.waitForFunction(() =>
      document.querySelector("tbody")?.textContent.includes("%"),
    );
    assert.equal(await page.getByRole("alert").count(), 0);
    assert.equal(await button("Retry balances").count(), 0);
    assert.equal(await button("Retry supply").count(), 0);
    await page.screenshot({
      path: "/tmp/open-graphene-accounts-desktop.png",
      fullPage: true,
    });
    await search.fill("swaplock");
    await button("Search").click();
    await link("swaplock").first().waitFor();
    await page.getByLabel("Match", { exact: true }).selectOption("equals");
    await page.waitForFunction(
      () => document.querySelectorAll("tbody tr").length === 1,
    );
    await page.reload();
    await link("swaplock").first().waitFor();
    await button("Reset").click();
    await page
      .getByLabel("Search by", { exact: true })
      .selectOption("registrar_name");
    await search.fill("swaplock");
    await button("Search").click();
    await page.waitForFunction(
      () => document.querySelectorAll("tbody tr").length > 1,
    );
    await button("Next page").click();
    await page.waitForURL(/page=2/);
    await page.locator("tbody tr").first().waitFor();
    assert.equal(await page.getByRole("alert").count(), 0);
  } else {
    const allAccounts = Array.from({ length: 63 }, (_, id) => ({
      id,
      name: `account-${String(id).padStart(3, "0")}`,
      registrar: 100,
      registrar_name: id % 2 ? "registrar-b" : "registrar-a",
      memo_key: `KEY${id}`,
      last_updated_block: id * 100,
    }));
    let failList = false,
      failBalance = false;
    const balanceRequests = [];
    await page.route("**/graphene/swaplock/indexer/**", async (route) => {
      const request = new URL(route.request().url());
      let body;
      const reject = () =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Offline" }),
        });
      if (request.pathname.includes("/sea_query/get_accounts/")) {
        if (failList) return reject();
        const limit = Number(request.searchParams.get("limit")),
          offset = Number(request.searchParams.get("offset"));
        assert.ok(limit <= 50);
        const filters = JSON.parse(request.searchParams.get("filters") || "[]");
        const sorts = JSON.parse(request.searchParams.get("sort") || "[]");
        const rows = allAccounts.filter((account) =>
          filters.every((filter) =>
            filter.conditions.every((condition) => {
              const value = String(
                filter.field === "id"
                  ? `1.2.${account.id}`
                  : account[filter.field],
              ).toLowerCase();
              const target = condition.value.toLowerCase();
              if (condition.op === "equals") return value === target;
              if (condition.op === "startsWith")
                return value.startsWith(target);
              return value.includes(target);
            }),
          ),
        );
        rows.sort((left, right) => {
          for (const sort of sorts) {
            const a = left[sort.field],
              b = right[sort.field];
            const comparison =
              typeof a === "string" ? a.localeCompare(b) : a - b;
            if (comparison)
              return sort.sort === "desc" ? -comparison : comparison;
          }
          return 0;
        });
        body = {
          data: rows.slice(offset, offset + limit),
          total: rows.length,
          offset,
          limit,
        };
      } else if (request.pathname.includes("/accounts/get_balances/")) {
        const id = Number(
          request.searchParams.get("account").split(".").at(-1),
        );
        balanceRequests.push(id);
        if (failBalance && id === 0) return reject();
        body = {
          account_id: id,
          balances:
            id === 1
              ? []
              : [
                  {
                    asset_id: 0,
                    amount: 100000,
                    precision: 5,
                    symbol: "BTS",
                    amount_units: 1,
                    last_updated_block: 1,
                  },
                ],
        };
      } else if (request.pathname.includes("/objects/get_current/")) {
        const id = request.searchParams.get("object_id");
        body = {
          object: {
            state:
              id === "1.3.0"
                ? {
                    id,
                    symbol: "BTS",
                    precision: 5,
                    issuer: "1.2.3",
                    dynamic_asset_data_id: "2.3.7",
                    options: {
                      max_supply: "1000000000000",
                      market_fee_percent: 0,
                      max_market_fee: "1000000000000000",
                      issuer_permissions: 0,
                      flags: 0,
                      core_exchange_rate: {
                        base: { amount: 1, asset_id: id },
                        quote: { amount: 1, asset_id: id },
                      },
                      whitelist_authorities: [],
                      blacklist_authorities: [],
                      whitelist_markets: [],
                      blacklist_markets: [],
                      description: "",
                      extensions: {},
                    },
                    creation_block_num: 0,
                    creation_time: "2026-08-18T17:45:00",
                  }
                : {
                    id,
                    current_supply: "10000000",
                    confidential_supply: 0,
                    accumulated_fees: 0,
                    accumulated_collateral_fees: 0,
                    fee_pool: 0,
                  },
          },
        };
        assert.ok(
          ["1.3.0", "2.3.7"].includes(id),
          "follow the dynamic asset pointer",
        );
      } else throw new Error(`Unexpected endpoint ${request.pathname}`);
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    await page.goto(url);
    await page.waitForFunction(() =>
      document.querySelector("tbody")?.textContent.includes("1%"),
    );
    assert.equal(await page.locator("tbody tr").count(), 25);
    assert.ok(balanceRequests.every((id) => id < 25));
    assert.match(await page.locator("tbody tr").nth(1).innerText(), /0%/);
    await button("Next page").click();
    await link("account-025").waitFor();
    await button("Sort descending").click();
    await link("account-062").waitFor();
    assert.equal(new URL(page.url()).searchParams.get("page"), null);
    await button("Next page").click();
    await link("account-037").waitFor();
    await page.reload();
    await link("account-037").waitFor();
    await search.fill("account-06");
    await button("Search").click();
    await page.waitForFunction(
      () => document.querySelectorAll("tbody tr").length === 3,
    );
    await page.goBack();
    await link("account-037").waitFor();
    assert.equal(await search.inputValue(), "");
    await button("Reset").click();
    await page
      .getByLabel("Search by", { exact: true })
      .selectOption("registrar_name");
    await search.fill("registrar-b");
    await button("Search").click();
    await link("account-001").waitFor();
    await page.waitForFunction(
      () => document.querySelectorAll("tbody tr").length === 25,
    );
    assert.ok(
      (await page.locator("tbody").innerText()).includes("registrar-b"),
    );
    assert.ok(
      !(await page.locator("tbody").innerText()).includes("registrar-a"),
    );
    await button("Last page").click();
    await page.waitForFunction(
      () => document.querySelectorAll("tbody tr").length === 6,
    );
    await button("Reset").click();
    await page.getByLabel("Search by", { exact: true }).selectOption("id");
    await page.getByLabel("Match", { exact: true }).selectOption("equals");
    await search.fill("42");
    await button("Search").click();
    await link("account-042").waitFor();
    assert.equal(await page.locator("tbody tr").count(), 1);
    await search.fill("999");
    await button("Search").click();
    await page
      .getByRole("heading", { name: "No matching accounts", exact: true })
      .waitFor();
    assert.equal(await page.locator("tbody tr").count(), 0);
    await button("Clear filters").click();
    await link("account-000").waitFor();
    await page.getByLabel("Rows per page", { exact: true }).selectOption("10");
    await page.waitForFunction(
      () => document.querySelectorAll("tbody tr").length === 10,
    );
    await page.getByLabel("Page number", { exact: true }).fill("3");
    await button("Go").click();
    await link("account-020").waitFor();
    await page.goto(`${url}?page=999&size=10`);
    await page.waitForURL(/page=7/);
    await link("account-060").waitFor();
    failList = true;
    await button("Refresh").click();
    await button("Retry accounts").waitFor({ timeout: 15000 });
    assert.equal(await page.locator("tbody tr").count(), 3);
    failList = false;
    await button("Retry accounts").click();
    await button("Retry accounts").waitFor({ state: "hidden" });
    failBalance = true;
    await page.goto(url);
    await button("Retry balances").waitFor();
    const failedRow = page
      .locator("tbody tr")
      .filter({ has: link("account-000") });
    assert.match(await failedRow.innerText(), /Unavailable/);
    assert.doesNotMatch(await failedRow.innerText(), /0%/);
    assert.equal(await page.locator("tbody tr").count(), 25);
    failBalance = false;
    await button("Retry balances").click();
    await page.waitForFunction(() =>
      document.querySelector("tbody tr")?.textContent.includes("1%"),
    );
    failList = true;
    await page.reload();
    await page
      .getByRole("heading", { name: "Accounts are unavailable", exact: true })
      .waitFor({ timeout: 15000 });
    failList = false;
    await button("Retry accounts").click();
    await link("account-000").waitFor();
  }
  for (const width of [1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `overflow at ${width}px`,
    );
  }
  if (process.argv.includes("--live"))
    await page.screenshot({
      path: "/tmp/open-graphene-accounts-mobile.png",
      fullPage: true,
    });
  assert.deepEqual(errors, []);
  assert.deepEqual(sockets, []);
  console.log(
    `PASS ${process.argv.includes("--live") ? "live" : "fixture"} accounts: query filtering, sorting, pagination, URL history, balances, responsive layout, HTTP only`,
  );
} finally {
  await browser.close();
  await new Promise((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
