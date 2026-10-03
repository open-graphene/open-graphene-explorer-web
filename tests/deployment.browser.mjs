import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.EXPLORER_URL ?? "https://explorer.mirrorboards.chat";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText !== "net::ERR_ABORTED")
      errors.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  await page.goto(base);
  await page.waitForURL("**/explorer/blocks");
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr").length === 20,
  );
  for (const section of ["assets", "accounts", "witnesses", "committee"]) {
    const response = await page.goto(`${base}/explorer/${section}`);
    assert.equal(response.status(), 200, `${section} direct navigation`);
    await page.locator("tbody tr").first().waitFor();
    assert.equal(
      await page.getByRole("alert").count(),
      0,
      `${section} data loads`,
    );
  }
  const account = "acta-13bbcc46590ab6997bb4de40b86127a7";
  const response = await page.goto(`${base}/account/${account}`);
  assert.equal(response.status(), 200);
  await page.getByRole("table", { name: "Account activity" }).waitFor();
  await page.getByRole("link", { name: "Balances", exact: true }).click();
  await page.waitForURL("**tab=balances");
  await page.reload();
  await page.getByRole("heading", { name: account, exact: true }).waitFor();
  await page
    .getByRole("heading", { name: "No balances", exact: true })
    .or(page.getByRole("table", { name: "Account balances" }))
    .waitFor();
  assert.equal(await page.getByRole("alert").count(), 0);
  for (const width of [1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    `PASS public HTTPS: ${base}; all explorer routes, Query/RPC data, account Activity/Balances reload, mobile, no runtime/network errors`,
  );
} finally {
  await browser.close();
}
