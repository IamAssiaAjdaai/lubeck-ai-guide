// Local-only Chrome acceptance for the approved auth UI. Not a real auth flow.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CITYWALK_PLAYWRIGHT_MODULE ?? "playwright");
const origin = "http://127.0.0.1:3108";
const issues = [];
const screenshotDir = await mkdtemp(path.join(tmpdir(), "marketing-saas-auth-ui-"));
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" });

async function getPreview(width, height) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.on("pageerror", (error) => issues.push(error.message));
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    issues.push("Blocked external browser request");
    return route.abort();
  });
  await page.goto(`${origin}/auth`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Create your account" }).waitFor();
  return { page, context };
}
async function noOverflow(page, label) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true,
    `Horizontal overflow: ${label}`);
}
async function view(page, label) {
  await page.getByRole("navigation", { name: "Choose auth screen" })
    .getByRole("button", { name: new RegExp(label, "i") }).click();
}

try {
  const desktop = await getPreview(1440, 900);
  const d = desktop.page;
  await noOverflow(d, "desktop signup 1440px");
  await d.screenshot({ path: path.join(screenshotDir, "desktop-signup.png"), fullPage: true });
  await d.getByRole("button", { name: "Validate sign-up details" }).click();
  assert.equal(await d.getByRole("alert").count(), 3);
  await d.getByLabel("Your name").fill("Alex Morgan");
  await d.getByLabel("Work email").fill("alex@example.com");
  await d.getByLabel("Password", { exact: true }).fill("long-unique-password-2026");
  await d.getByRole("button", { name: "Validate sign-up details" }).click();
  await d.getByRole("status").getByText(/Account creation and verification emails are not connected/).waitFor();
  await view(d, "Sign in");
  await d.getByRole("heading", { name: "Welcome back" }).waitFor();
  await d.screenshot({ path: path.join(screenshotDir, "desktop-signin.png"), fullPage: true });
  await view(d, "Verify email");
  await d.getByText(/no email has been sent/i).waitFor();
  await d.screenshot({ path: path.join(screenshotDir, "desktop-verification.png"), fullPage: true });
  await view(d, "Reset password");
  await d.getByRole("heading", { name: "Reset your password" }).waitFor();
  await d.screenshot({ path: path.join(screenshotDir, "desktop-reset.png"), fullPage: true });
  await view(d, "Expired link");
  await d.getByText(/invalid or has expired/).waitFor();
  await d.screenshot({ path: path.join(screenshotDir, "desktop-expired.png"), fullPage: true });
  await desktop.context.close();

  for (const width of [390, 375]) {
    const mobile = await getPreview(width, 844);
    const p = mobile.page;
    await noOverflow(p, `mobile signup ${width}px`);
    await p.screenshot({ path: path.join(screenshotDir, `mobile-signup-${width}.png`), fullPage: true });
    for (const screen of ["Sign in", "Verify email", "Reset password", "Expired link"]) {
      await view(p, screen);
      await noOverflow(p, `mobile ${screen} ${width}px`);
    }
    await view(p, "Sign up");
    await p.getByLabel("Password", { exact: true }).fill("my-long-private-password");
    await p.getByRole("button", { name: "Show password" }).click();
    assert.equal(await p.getByLabel("Password", { exact: true }).getAttribute("type"), "text");
    await p.getByRole("button", { name: "Hide password" }).click();
    assert.equal(await p.getByLabel("Password", { exact: true }).getAttribute("type"), "password");
    await mobile.context.close();
  }
  assert.deepEqual(issues, [], "UI must not issue external requests or uncaught browser errors");
  console.log("PASS: sign-up, sign-in, email verification, reset, expired-link UI; 1440px / 390px / 375px; local validation; no external requests.");
  console.log("MARKETING_SAAS_AUTH_UI_BROWSER_PASS");
  console.log(`Screenshots: ${screenshotDir}`);
} finally {
  await browser.close();
}
