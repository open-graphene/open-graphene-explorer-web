import assert from "node:assert/strict";
import { chromium } from "playwright";
import { preview } from "vite";

const server = await preview({
  preview: { host: "127.0.0.1", port: 5191, strictPort: true },
});
const url = "http://127.0.0.1:5191";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  if (process.argv.includes("--live")) {
    await page.addInitScript(() => {
      window.__testSockets = [];
      const NativeWebSocket = window.WebSocket;
      window.WebSocket = class extends NativeWebSocket {
        constructor(...args) {
          super(...args);
          window.__testSockets.push(this);
        }
      };
    });
    await page.goto(`${url}/explorer/blocks`);
    await page
      .getByText("Live network", { exact: true })
      .waitFor({ timeout: 30_000 });
    await page.waitForFunction(
      () => document.querySelectorAll("tbody tr").length === 20,
    );
    const initialBlock = await page.locator("tbody tr").first().innerText();
    await page.waitForFunction(
      (initial) =>
        document
          .querySelector("tbody tr")
          ?.textContent?.replaceAll(/\s/g, "") !==
        initial.replaceAll(/\s/g, ""),
      initialBlock,
      { timeout: 15_000 },
    );
    await page.screenshot({
      path: "/tmp/open-graphene-blocks-desktop.png",
      fullPage: true,
    });
    console.log((await page.locator("dl").innerText()).replaceAll("\n", " | "));
    await page.reload();
    await page
      .getByText("Live network", { exact: true })
      .waitFor({ timeout: 30_000 });
    for (const width of [768, 390, 320]) {
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
      path: "/tmp/open-graphene-blocks-mobile.png",
      fullPage: true,
    });
    await page.getByRole("link", { name: "About", exact: true }).click();
    await page.getByRole("heading", { name: "About", exact: true }).waitFor();
    await page.waitForFunction(
      () =>
        window.__testSockets.length > 0 &&
        window.__testSockets.every(
          (socket) => socket.readyState === WebSocket.CLOSED,
        ),
      undefined,
      { timeout: 10_000 },
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS live: 20 blocks, head updates, reload, 768/390/320px, connection cleanup, no runtime errors",
    );
  } else {
    let mode = "success";
    let head = 100;
    let blockRequests = 0;
    await page.routeWebSocket(/wss:\/\//, (socket) => socket.close());
    await page.route("**/graphene/swaplock/indexer/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body;
      if (path.includes("/blocks/get_latest/")) {
        blockRequests++;
        if (mode === "error") {
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ message: "Indexer unavailable" }),
          });
          return;
        }
        body = {
          limit: 30,
          blocks:
            mode === "empty"
              ? []
              : Array.from({ length: 30 }, (_, index) => ({
                  block_num: head - index,
                  block_id: `block-${head - index}`,
                  previous: `block-${head - index - 1}`,
                  timestamp: new Date(
                    Date.UTC(2026, 9, 3, 12, 0, 0) - index * 3000,
                  ).toISOString(),
                  witness: 1,
                  tx_count: index === 0 ? 1 : 0,
                  witness_signature: "",
                })),
        };
      } else if (path.includes("/witnesses/")) {
        body = {
          witnesses: [
            { id: 1, account_name: "wit01", last_updated_block: head },
          ],
          limit: 1000,
          offset: 0,
        };
      } else if (path.includes("/operations/get_latest/")) {
        body = {
          limit: 16,
          operations: [
            {
              op_seq: 1,
              block_num: head,
              block_time: "2026-10-03T12:00:00Z",
              fee_payer: 4,
              is_virtual: false,
              op_type: 0,
              trx_in_block: 0,
              op_in_trx: 0,
              virtual_op: 0,
              op: {
                from: "1.2.4",
                to: "1.2.5",
                amount: { amount: 100, asset_id: "1.3.0" },
              },
              result: [0, {}],
            },
          ],
        };
      } else if (path.includes("/operations/get_types/")) {
        body = { types: [{ op_type: 0, name: "transfer", is_virtual: false }] };
      } else {
        throw new Error(`Unexpected API request: ${path}`);
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    await page.goto(url);
    await page.waitForURL("**/explorer/blocks");
    await page
      .getByRole("link", { name: "#100", exact: true })
      .last()
      .waitFor();
    assert.equal(await page.locator("tbody tr").count(), 20);
    await page
      .getByText("Live network data is unavailable.", { exact: false })
      .waitFor();
    await page.getByText("transfer", { exact: true }).waitFor();
    await page.getByText("Operation details", { exact: true }).click();
    assert.match(await page.locator("pre").innerText(), /1\.2\.5/);
    assert.match(await page.locator("tbody tr").first().innerText(), /wit01/);
    await page.getByRole("link", { name: "About", exact: true }).click();
    await page.getByRole("heading", { name: "About", exact: true }).waitFor();
    const requestsAfterLeaving = blockRequests;
    await page.waitForTimeout(3500);
    assert.equal(
      blockRequests,
      requestsAfterLeaving,
      "polling stops on navigation away",
    );
    await page.goBack();
    await page
      .getByRole("heading", { name: "Recent blocks", exact: true })
      .waitFor();
    mode = "error";
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page
      .getByRole("button", { name: "Retry blocks" })
      .waitFor({ timeout: 15_000 });
    assert.equal(
      await page.locator("tbody tr").count(),
      20,
      "last successful data is retained during outages",
    );
    mode = "success";
    head = 101;
    await page.getByRole("button", { name: "Retry blocks" }).click();
    await page
      .getByRole("link", { name: "#101", exact: true })
      .last()
      .waitFor();
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
    mode = "empty";
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page.getByText("No blocks have been indexed yet.").waitFor();
    assert.equal(await page.locator("tbody tr").count(), 0);
    await page.reload();
    await page.getByText("No blocks have been indexed yet.").waitFor();
    mode = "error";
    await page.reload();
    await page
      .getByText("Block data is unavailable.")
      .waitFor({ timeout: 15_000 });
    assert.deepEqual(errors, []);
    console.log(
      "PASS fixtures: redirect, 20 blocks, activity details, node failure, navigation cleanup, stale data, retry, empty/error states, responsive widths, no runtime errors",
    );
  }
} finally {
  await browser.close();
  await new Promise((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
