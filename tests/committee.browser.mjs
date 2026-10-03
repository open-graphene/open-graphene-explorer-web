import assert from "node:assert/strict";
import { chromium } from "playwright";

import { preview } from "vite";

// Live RPC checks with one injected response failure to verify recovery.
const server = process.env.EXPLORER_URL
  ? null
  : await preview({
      preview: { host: "127.0.0.1", port: 5195, strictPort: true },
    });
const baseUrl = process.env.EXPLORER_URL ?? "http://127.0.0.1:5195";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
const indexerRequests = [];
let rejectNextObjects = false;
await page.routeWebSocket("**", (socket) => {
  const server = socket.connectToServer();
  socket.onMessage((message) => {
    const request = JSON.parse(String(message));
    if (rejectNextObjects && request.params?.[1] === "get_objects") {
      rejectNextObjects = false;
      socket.send(
        JSON.stringify({
          id: request.id,
          error: { code: 1, message: "Committee fixture failure" },
        }),
      );
      return;
    }
    server.send(message);
  });
  server.onMessage((message) => socket.send(message));
});
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  if (request.url().includes("/indexer/")) indexerRequests.push(request.url());
});
try {
  await page.goto(`${baseUrl}/explorer/committee`);
  await page
    .getByRole("cell", { name: "Active", exact: true })
    .first()
    .waitFor({ timeout: 30000 });
  assert.equal(await page.getByRole("alert").count(), 0);
  const firstName = await page.locator("tbody th a").first().innerText();
  const firstId = await page.locator("tbody th span").first().innerText();
  await page.getByLabel("Search members", { exact: true }).fill(firstId);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.waitForURL((url) => url.searchParams.get("q") === firstId);
  assert.equal(await page.locator("tbody tr").count(), 1);
  await page.reload();
  await page.locator("tbody th a").first().waitFor();
  assert.equal(
    await page.getByLabel("Search members", { exact: true }).inputValue(),
    firstId,
  );
  await page
    .getByLabel("Search members", { exact: true })
    .fill("missing-committee-member-987654321");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("heading", { name: "No matching members" }).waitFor();
  await page.goBack();
  await page.getByRole("link", { name: firstName, exact: true }).waitFor();
  await page.getByLabel("Sort by", { exact: true }).selectOption("votes");
  await page.waitForURL((url) => url.searchParams.get("sort") === "votes");
  await page.getByRole("button", { name: "Toggle sort direction" }).click();
  await page.waitForURL((url) => url.searchParams.get("direction") === "desc");
  for (const width of [1280, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    assert.ok(
      dimensions.scroll <= dimensions.width + 1,
      `Page overflow at ${width}px`,
    );
  }
  await page.screenshot({
    path: "/tmp/open-graphene-committee-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "/tmp/open-graphene-committee-desktop.png",
    fullPage: true,
  });
  rejectNextObjects = true;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await page.getByRole("alert").waitFor();
  assert.ok(
    (await page.getByRole("alert").innerText()).includes(
      "Previously loaded data",
    ),
  );
  assert.equal(await page.locator("tbody tr").count(), 1);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.getByRole("alert").waitFor({ state: "detached" });
  const accountLink = page.getByRole("link", { name: firstName, exact: true });
  assert.ok(
    (await accountLink.getAttribute("href")).startsWith(
      `/account/${firstName}`,
    ),
  );
  assert.deepEqual(
    indexerRequests,
    [],
    "Committee must use RPC without Query requests",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Committee live RPC browser checks passed: search, reload/history, sorting, refresh failure/retry, responsive layout, local account link, no Query requests.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) =>
    server ? server.httpServer.close(resolve) : resolve(),
  );
}
