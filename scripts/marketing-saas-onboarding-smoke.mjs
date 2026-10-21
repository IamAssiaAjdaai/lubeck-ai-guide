// Opt-in local-only browser acceptance for the *unsaved* customer onboarding UI.
// No SaaS auth, server persistence, AI analysis or publishing is tested here.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CITYWALK_PLAYWRIGHT_MODULE ?? "playwright");
const origin = new URL(process.env.MARKETING_SAAS_SMOKE_URL ?? "http://127.0.0.1:3108");
if (origin.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(origin.hostname) ||
    origin.port !== "3108" || origin.pathname !== "/" || origin.search || origin.hash) {
  throw new Error("Marketing SaaS smoke runs only on http://127.0.0.1:3108 or localhost:3108");
}
const screenshots = await mkdtemp(path.join(tmpdir(), "marketing-saas-ui-"));
const problems = [];
const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome",
});
async function pageAt(width, height) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", (error) => problems.push(error.message));
  await page.route("**/*", (route) => {
    const request = new URL(route.request().url());
    if (request.origin === origin.origin) return route.continue();
    problems.push(`Blocked external request: ${request.origin}`);
    return route.abort();
  });
  await page.goto(origin.toString(), { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Create your project" }).waitFor();
  return { page, context };
}
async function assertNoOverflow(page, size) {
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
    `Horizontal overflow at ${size}`,
  );
}

try {
  // Desktop: invalid input -> correction -> owner-declared preview -> no stored data.
  const desktop = await pageAt(1440, 900);
  const d = desktop.page;
  await assertNoOverflow(d, "1440px");
  await d.screenshot({ path: path.join(screenshots, "desktop-project-type.png"), fullPage: true });
  // Exercise pointer interaction on previously unchecked radio controls.
  await d.getByRole("radio", { name: /^App/ }).check();
  assert.equal(await d.getByRole("radio", { name: /^App/ }).isChecked(), true);
  await d.getByRole("radio", { name: /^Website/ }).check();
  assert.equal(await d.getByRole("radio", { name: /^Website/ }).isChecked(), true);
  await d.getByRole("button", { name: /Continue/ }).click();
  await d.getByRole("button", { name: /Continue/ }).click();
  await d.getByRole("alert").filter({ hasText: "Enter at least 2 characters." }).waitFor();
  await d.getByLabel(/Business or project name/).fill("Nordlicht Studio");
  await d.getByLabel("Website URL").fill("https://studio.example");
  await d.getByLabel(/What do you want marketing to achieve/).fill("Get more clients");
  await d.getByLabel(/What do you offer/).fill("We build websites for small German businesses.");
  await d.getByLabel(/One business claim to review/).fill("We provide web development services.");
  await d.screenshot({ path: path.join(screenshots, "desktop-details.png"), fullPage: true });
  await d.getByRole("button", { name: /Continue/ }).click();
  await d.getByText("No external analysis performed").waitFor();
  await d.getByText("Owner-declared · not verified").waitFor();
  await d.getByRole("button", { name: /Continue/ }).click();
  await d.getByText(/Not confirmed · This preview cannot create/).waitFor();
  await d.screenshot({ path: path.join(screenshots, "desktop-review.png"), fullPage: true });
  await d.getByRole("button", { name: /Preview dashboard/ }).click();
  await d.getByRole("heading", { name: "Your project preview" }).waitFor();
  await d.getByText("No saved project yet").waitFor();
  await d.screenshot({ path: path.join(screenshots, "desktop-empty-dashboard.png"), fullPage: true });
  await d.reload();
  await d.getByRole("heading", { name: "Create your project" }).waitFor();
  await desktop.context.close();

  // Mobile: local business needs a city, no URL. The draft survives validation
  // correction but intentionally does not survive reload.
  const mobile = await pageAt(390, 844);
  const m = mobile.page;
  await m.getByRole("radio", { name: /Local Business/ }).check();
  assert.equal(await m.getByRole("radio", { name: /Local Business/ }).isChecked(), true);
  await assertNoOverflow(m, "390px project type");
  await m.screenshot({ path: path.join(screenshots, "mobile-project-type.png"), fullPage: true });
  await m.getByRole("button", { name: /Continue/ }).click();
  await m.getByLabel(/Business or project name/).fill("Local Studio");
  await m.getByLabel(/What do you want marketing to achieve/).fill("Find nearby customers");
  await m.getByLabel(/What do you offer/).fill("We offer styling services in the local area.");
  await m.getByRole("button", { name: /Continue/ }).click();
  await m.getByRole("alert").filter({ hasText: "Enter the city your business serves." }).waitFor();
  await m.getByLabel("Business city").fill("Düsseldorf");
  await m.screenshot({ path: path.join(screenshots, "mobile-details.png"), fullPage: true });
  await assertNoOverflow(m, "390px details");
  await m.getByRole("button", { name: /Continue/ }).click();
  await m.getByText("No external analysis performed").waitFor();
  await m.getByRole("button", { name: /Continue/ }).click();
  await m.getByLabel("Edit your unconfirmed claim").fill("We provide local services.");
  await m.getByText(/Not confirmed · This preview cannot create/).waitFor();
  await m.screenshot({ path: path.join(screenshots, "mobile-review.png"), fullPage: true });
  await assertNoOverflow(m, "390px review");
  await m.setViewportSize({ width: 375, height: 812 });
  await assertNoOverflow(m, "375px review");
  await m.getByRole("button", { name: /Preview dashboard/ }).click();
  await m.getByText("No saved project yet").waitFor();
  await assertNoOverflow(m, "375px dashboard");
  await m.screenshot({ path: path.join(screenshots, "mobile-empty-dashboard.png"), fullPage: true });
  await mobile.context.close();

  assert.deepEqual(problems, [], "Unexpected browser errors or off-local network requests");
  console.log("PASS: desktop 1440px + mobile 390/375px, validation, owner-only provenance, unsaved review/dashboard, no horizontal overflow, no off-local requests.");
  console.log("MARKETING_SAAS_BROWSER_PASS");
  console.log(`Screenshots: ${screenshots}`);
} finally {
  await browser.close();
}
