import { chromium } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import assert from "node:assert/strict";
const base = "http://127.0.0.1:5174";
const dir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const files = readdirSync(dir).filter(
  (x) => x.endsWith(".sqlite") && x !== "metadata.sqlite",
);
const file =
  process.env.LOCAL_DB_FILE || (files.length === 1 ? files[0] : null);
assert.ok(
  file && files.includes(file),
  "Set LOCAL_DB_FILE to the active LOCAL database filename.",
);
const db = new DatabaseSync(join(dir, file));
const user = db
  .prepare("SELECT user_id FROM members WHERE role='owner' LIMIT 1")
  .get();
assert.ok(user, "Run local integration script first.");
const secret = randomUUID();
const digest = createHash("sha256").update(secret).digest("hex");
db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
  digest,
  user.user_id,
  Date.now() + 600000,
);
mkdirSync("artifacts/ui", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.locator(".hero h1").waitFor();
  await page.getByRole("button", {name:"Explore Store & transfer"}).click();
  assert.equal(await page.getByRole("tab", {name:/Store & transfer/}).getAttribute("aria-selected"), "true");
  await page.getByRole("tabpanel").getByRole("heading", {name:"One product. Every location accounted for."}).waitFor();
  await page.getByRole("tab", {name:/Sell & return/}).click();
  await page.getByRole("tabpanel").getByRole("heading", {name:"Keep every sale connected to your inventory."}).waitFor();
  await page.getByRole("tab", {name:/Purchase & receive/}).click();
  await page.locator("#questions summary").first().click();
  assert.equal(await page.locator("#questions details").first().getAttribute("open"), "");
  await page.locator("#questions summary").first().click();
  await page.evaluate(()=>window.scrollTo(0,0));

  await page.screenshot({
    path: "artifacts/ui/landing-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(350);
  await page.screenshot({
    path: "artifacts/ui/landing-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Landing mobile overflow",
  );
  await context.addCookies([
    {
      name: "sf_session",
      value: secret,
      url: base,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base);
  await page
    .getByRole("heading", { name: "Your stock, at a glance." })
    .waitFor();
  await page.getByText("Loading inventory…").waitFor({ state: "hidden" });
  for (const tab of [
    "Overview",
    "Products",
    "Locations",
    "Purchases",
    "Transfers",
    "Sales & returns",
    "Stock ledger",
    "Suppliers",
    "Team",
  ]) {
    await page
      .locator(".sidebar nav")
      .getByRole("button", { name: tab, exact: true })
      .click();
    await page.waitForTimeout(150);
    await page.screenshot({
      path:
        "artifacts/ui/" +
        tab.toLowerCase().replaceAll(/[^a-z]+/g, "-") +
        ".png",
      fullPage: true,
    });
  }
  await page
    .locator(".sidebar nav")
    .getByRole("button", { name: "Overview", exact: true })
    .click();
  for (const label of [
    "Record a sale",
    "Create a purchase",
    "Move inventory",
    "Add a product",
  ]) {
    await page
      .locator(".operation-buttons")
      .getByRole("button", { name: label })
      .click();
    if (label === "Record a sale" && await page.getByRole("alert").isVisible()) {
      assert.match(await page.getByRole("alert").innerText(), /no stock available to sell/i);
      await page.getByRole("button", {name:"Dismiss error"}).click();
    } else {
      await page.getByRole("dialog").waitFor();
      await page.getByRole("button", { name: "Close dialog" }).click();
    }
    await page.locator(".sidebar nav").getByRole("button", {name:"Overview",exact:true}).click();
  }
  for (const label of ["Awaiting purchase delivery", "Transfers in transit"]) {
    await page
      .locator(".delivery-overview")
      .getByRole("button", { name: new RegExp(label) })
      .click();
    assert.equal(await page.locator(".overview-hub").count(), 0);
    await page
      .locator(".sidebar nav")
      .getByRole("button", { name: "Overview", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Adjust stock", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.screenshot({ path: "artifacts/ui/adjust-stock.png" });
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(350);
  await page.screenshot({
    path: "artifacts/ui/dashboard-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Dashboard mobile overflow",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: nine workspace screens, form, desktop/mobile rendering; no page errors or tested mobile overflow.",
  );
} finally {
  await browser.close();
  db.prepare("DELETE FROM sessions WHERE token=?").run(digest);
  db.close();
}
