import assert from "node:assert/strict";
import { chromium } from "playwright";
import { preview } from "vite";
const server = process.env.EXPLORER_URL
  ? null
  : await preview({
      preview: { host: "127.0.0.1", port: 5194, strictPort: true },
    });
const baseUrl = process.env.EXPLORER_URL ?? "http://127.0.0.1:5194";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const queryCalls = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  if (request.url().includes("query.swaplock")) queryCalls.push(request.url());
});
try {
  await page.goto(`${baseUrl}/explorer/witnesses`);
  await page.locator("tbody tr").first().waitFor({ timeout: 30000 });
  const rows = await page.locator("tbody tr").count();
  assert.ok(rows > 0);
  assert.ok(
    (await page.locator("body").innerText()).includes("Active witnesses"),
  );
  const name = await page.locator("tbody th a").first().innerText();
  await page.getByLabel("Search witnesses").fill(name);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForURL((url) => url.searchParams.get("q") === name);
  await page.reload();
  await page.locator("tbody tr").first().waitFor({ timeout: 30000 });
  assert.equal(await page.getByLabel("Search witnesses").inputValue(), name);
  await page.getByLabel("Sort by").selectOption("name");
  await page.waitForURL((url) => url.searchParams.get("sort") === "name");
  await page.getByLabel("Search witnesses").fill("no-such-witness-ever");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("heading", { name: "No active witnesses found" })
    .waitFor();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.locator("tbody tr").first().waitFor();
  for (const width of [1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `no page overflow at ${width}px`,
    );
  }
  await page.screenshot({ path: "/tmp/open-graphene-witnesses-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "/tmp/open-graphene-witnesses-desktop.png" });
  const recovery = await browser.newPage();
  await recovery.addInitScript(() => {
    const NativeWebSocket = window.WebSocket;
    window.failWitnessConnection = true;
    window.WebSocket = class extends NativeWebSocket {
      constructor(...args) {
        if (window.failWitnessConnection)
          throw new Error("Test node connection unavailable");
        super(...args);
      }
    };
  });
  await recovery.goto(`${baseUrl}/explorer/witnesses`);
  await recovery
    .getByRole("alert")
    .filter({ hasText: "Cannot connect" })
    .waitFor({ timeout: 15000 });
  await recovery.evaluate(() => {
    window.failWitnessConnection = false;
  });
  await recovery.getByRole("button", { name: "Reconnect" }).click();
  await recovery.locator("tbody tr").first().waitFor({ timeout: 30000 });
  await recovery.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(queryCalls, []);
  console.log(
    `Witnesses live browser passed: ${rows} visible witnesses, filter/sort/reload/empty/responsive, RPC only`,
  );
} finally {
  await browser.close();
  if (server)
    await new Promise((resolve, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : resolve())),
    );
}
