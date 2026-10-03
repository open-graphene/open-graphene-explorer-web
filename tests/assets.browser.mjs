import assert from "node:assert/strict";
import { chromium } from "playwright";
import { preview } from "vite";

const server = await preview({
  preview: { host: "127.0.0.1", port: 5192, strictPort: true },
});
const url = "http://127.0.0.1:5192/explorer/assets";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  const sockets = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("websocket", (socket) => sockets.push(socket.url()));
  if (process.argv.includes("--live")) {
    await page.goto(url);
    await page.getByRole("link", { name: "BTS", exact: true }).waitFor();
    await page
      .getByRole("link", { name: "null-account", exact: true })
      .waitFor({ timeout: 30_000 });
    assert.equal(await page.getByRole("alert").count(), 0);
    assert.equal(
      await page.getByRole("button", { name: "Retry details" }).count(),
      0,
    );
    await page.screenshot({
      path: "/tmp/open-graphene-assets-desktop.png",
      fullPage: true,
    });
    await page.getByLabel("Search assets", { exact: true }).fill("bts");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForFunction(
      () => document.querySelectorAll("tbody tr").length === 1,
    );
    assert.match(await page.locator("tbody").innerText(), /BTS/);
    assert.equal(new URL(page.url()).searchParams.get("q"), "bts");
    await page.reload();
    await page.getByRole("link", { name: "BTS", exact: true }).waitFor();
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page.getByLabel("Search by", { exact: true }).selectOption("id");
    await page.getByLabel("Match", { exact: true }).selectOption("equals");
    await page.getByLabel("Search assets", { exact: true }).fill("0");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForFunction(
      () => document.querySelectorAll("tbody tr").length === 1,
    );
    assert.match(await page.locator("tbody").innerText(), /BTS/);
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
    await page.screenshot({
      path: "/tmp/open-graphene-assets-mobile.png",
      fullPage: true,
    });
    assert.equal(sockets.length, 0, "assets use HTTP query only");
    assert.deepEqual(errors, []);
    console.log(
      "PASS live assets: supply and issuers, symbol/ID search, reload, 1024/768/390/320px, HTTP only",
    );
  } else {
    const allAssets = Array.from({ length: 76 }, (_, id) => ({
      id,
      symbol: `AST${String(id).padStart(3, "0")}`,
      precision: 5,
      max_supply: 1000000000000,
      last_updated_block: id * 100,
    }));
    let failList = false;
    let failDetails = false;
    const requestedAssetIds = [];
    const listRequests = [];
    await page.route("**/graphene/swaplock/indexer/**", async (route) => {
      const request = new URL(route.request().url());
      const path = request.pathname;
      let body;
      if (path.includes("/sea_query/get_assets/")) {
        const limit = Number(request.searchParams.get("limit"));
        const offset = Number(request.searchParams.get("offset"));
        const filters = JSON.parse(request.searchParams.get("filters") ?? "[]");
        const sort = JSON.parse(request.searchParams.get("sort") ?? "[]");
        listRequests.push({ limit, offset, filters, sort });
        assert.ok(limit <= 50);
        if (failList) {
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "Offline" }),
          });
          return;
        }
        let rows = allAssets.filter((asset) =>
          filters.every((filter) =>
            filter.conditions.every((condition) => {
              const value =
                filter.field === "id" ? `1.3.${asset.id}` : asset.symbol;
              const target = condition.value.toLowerCase();
              if (condition.op === "equals")
                return value.toLowerCase() === target;
              if (condition.op === "startsWith")
                return value.toLowerCase().startsWith(target);
              return value.toLowerCase().includes(target);
            }),
          ),
        );
        rows.sort((left, right) => {
          for (const item of sort) {
            const a = left[item.field],
              b = right[item.field];
            const comparison =
              typeof a === "string" ? a.localeCompare(b) : a - b;
            if (comparison)
              return item.sort === "desc" ? -comparison : comparison;
          }
          return 0;
        });
        body = {
          data: rows.slice(offset, offset + limit),
          total: rows.length,
          offset,
          limit,
        };
      } else if (path.includes("/objects/get_current/")) {
        const objectId = request.searchParams.get("object_id");
        if (failDetails) {
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: "Details offline" }),
          });
          return;
        }
        const id = Number(objectId.split(".").at(-1));
        if (objectId.startsWith("1.3.")) {
          requestedAssetIds.push(id);
          body = {
            object: {
              state: {
                id: objectId,
                symbol: allAssets[id].symbol,
                precision: 5,
                issuer: "1.2.3",
                dynamic_asset_data_id: `2.3.${id}`,
                options: {
                  max_supply: "1000000000000",
                  market_fee_percent: 0,
                  max_market_fee: "1000000000000000",
                  issuer_permissions: 0,
                  flags: 0,
                  core_exchange_rate: {
                    base: { amount: 1, asset_id: "1.3.0" },
                    quote: { amount: 1, asset_id: objectId },
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
              },
            },
          };
        } else {
          body = {
            object: {
              state: {
                id: objectId,
                current_supply: "409326790233",
                confidential_supply: 0,
                accumulated_fees: 0,
                accumulated_collateral_fees: 0,
                fee_pool: 0,
              },
            },
          };
        }
      } else if (path.includes("/sea_query/get_accounts/")) {
        const filters = JSON.parse(request.searchParams.get("filters"));
        assert.equal(filters[0].conditions[0].filterType, "number");
        body = {
          data: [
            {
              id: 3,
              name: "issuer-account",
              registrar: 0,
              last_updated_block: 0,
            },
          ],
          total: 1,
          limit: 200,
          offset: 0,
        };
      } else {
        throw new Error(`Unexpected endpoint ${path}`);
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    await page.goto(url);
    await page
      .getByRole("link", { name: "issuer-account", exact: true })
      .first()
      .waitFor();
    assert.equal(await page.locator("tbody tr").count(), 25);
    assert.ok(
      requestedAssetIds.every((id) => id < 25),
      "metadata only loads for the visible page",
    );
    assert.match(
      await page.locator("tbody tr").first().innerText(),
      /4,093,267.90233/,
    );
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await page.getByRole("link", { name: "AST025", exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("page"), "2");
    assert.equal(listRequests.at(-1).offset, 25);
    await page
      .getByRole("button", { name: "Sort descending", exact: true })
      .click();
    await page.getByRole("link", { name: "AST075", exact: true }).waitFor();
    assert.equal(
      new URL(page.url()).searchParams.get("page"),
      null,
      "sorting resets the page",
    );
    assert.equal(listRequests.at(-1).sort[0].sort, "desc");
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await page.getByRole("link", { name: "AST050", exact: true }).waitFor();
    await page.reload();
    await page.getByRole("link", { name: "AST050", exact: true }).waitFor();
    await page.getByLabel("Search assets", { exact: true }).fill("AST07");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.waitForFunction(
      () => document.querySelectorAll("tbody tr").length === 6,
    );
    assert.equal(new URL(page.url()).searchParams.get("q"), "AST07");
    await page.goBack();
    await page.getByRole("link", { name: "AST050", exact: true }).waitFor();
    assert.equal(
      await page.getByLabel("Search assets", { exact: true }).inputValue(),
      "",
    );
    await page.getByLabel("Rows per page", { exact: true }).selectOption("10");
    await page.waitForFunction(
      () => document.querySelectorAll("tbody tr").length === 10,
    );
    await page.getByLabel("Page number", { exact: true }).fill("3");
    await page.getByRole("button", { name: "Go", exact: true }).click();
    await page.getByRole("link", { name: "AST055", exact: true }).waitFor();
    await page.getByRole("button", { name: "Last page", exact: true }).click();
    await page.waitForFunction(
      () => document.querySelectorAll("tbody tr").length === 6,
    );
    assert.equal(new URL(page.url()).searchParams.get("page"), "8");
    await page.goto(`${url}?size=10&page=999`);
    await page.waitForURL(/page=8/);
    await page.getByRole("link", { name: "AST070", exact: true }).waitFor();
    failList = true;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page
      .getByRole("button", { name: "Retry assets", exact: true })
      .waitFor({ timeout: 15000 });
    assert.equal(
      await page.locator("tbody tr").count(),
      6,
      "failed refresh preserves existing rows",
    );
    failList = false;
    await page
      .getByRole("button", { name: "Retry assets", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Retry assets", exact: true })
      .waitFor({ state: "hidden" });
    await page
      .getByLabel("Search assets", { exact: true })
      .fill("NO-SUCH-ASSET");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page
      .getByRole("heading", { name: "No matching assets", exact: true })
      .waitFor();
    assert.equal(
      await page.locator("tbody tr").count(),
      0,
      "old results never masquerade as new filter results",
    );
    await page
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await page.getByRole("link", { name: "AST000", exact: true }).waitFor();
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
    failDetails = true;
    await page.reload();
    await page
      .getByRole("button", { name: "Retry details", exact: true })
      .waitFor();
    assert.equal(
      await page.locator("tbody tr").count(),
      25,
      "metadata failure does not hide the list",
    );
    failDetails = false;
    await page
      .getByRole("button", { name: "Retry details", exact: true })
      .click();
    await page
      .getByRole("link", { name: "issuer-account", exact: true })
      .first()
      .waitFor();
    failList = true;
    await page.reload();
    await page
      .getByRole("heading", { name: "Assets are unavailable", exact: true })
      .waitFor({ timeout: 15000 });
    assert.equal(sockets.length, 0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS fixtures: server filtering/sorting/page totals, metadata scope, URL/reload/history, page size/jump/bounds, errors/retry, empty and partial states, mobile, HTTP only",
    );
  }
} finally {
  await browser.close();
  await new Promise((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
