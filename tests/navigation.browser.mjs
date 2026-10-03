import assert from "node:assert/strict";
import { chromium } from "playwright";
import { preview } from "vite";

// This read-only integration check exercises real data across the new routes.
const server = await preview({
  preview: { host: "127.0.0.1", port: 5197, strictPort: true },
});
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const NativeWebSocket = window.WebSocket;
    window.__openedSockets = [];
    window.WebSocket = class extends NativeWebSocket {
      constructor(...args) {
        super(...args);
        window.__openedSockets.push(this);
      }
    };
  });
  const base = "http://127.0.0.1:5197";
  await page.goto(`${base}/explorer/accounts?q=acta&size=10&page=2`);
  const accountLink = page.locator("tbody th a").first();
  await accountLink.waitFor();
  const accountName = (await accountLink.innerText()).trim();
  await accountLink.click();
  await page.waitForURL(/\/account\//);
  await page.getByRole("heading", { name: accountName, exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname, `/account/${accountName}`);
  await page.goBack();
  await page.waitForURL(/page=2/);
  await page.locator("tbody th a").first().waitFor();
  assert.equal(new URL(page.url()).searchParams.get("q"), "acta");
  assert.equal(new URL(page.url()).searchParams.get("size"), "10");
  await page.waitForFunction(() =>
    window.__openedSockets.every(
      (socket) => socket.readyState === WebSocket.CLOSED,
    ),
  );
  for (const route of ["witnesses", "committee"]) {
    await page
      .getByRole("navigation", { name: "Explorer sections" })
      .getByRole("link", { name: new RegExp(`^${route}$`, "i") })
      .click();
    await page.waitForURL(new RegExp(`/explorer/${route}`));
    const memberLink = page.locator('tbody a[href^="/account/"]').first();
    await memberLink.waitFor();
    const memberName = (await memberLink.innerText()).trim();
    await memberLink.click();
    await page.waitForURL(/\/account\//);
    await page
      .getByRole("heading", { name: memberName, exact: true })
      .waitFor();
    await page.getByRole("link", { name: "About", exact: true }).click();
    await page.waitForURL(/\/about$/);
    await page.waitForFunction(() =>
      window.__openedSockets.every(
        (socket) => socket.readyState === WebSocket.CLOSED,
      ),
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS live navigation: local account links, preserved list filters/page, Witnesses/Committee links, RPC sockets close when leaving",
  );
} finally {
  await browser.close();
  await new Promise((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
