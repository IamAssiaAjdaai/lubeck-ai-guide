import assert from "node:assert/strict";
import { createRequire } from "node:module";

const playwrightModule = process.env.CITYWALK_PLAYWRIGHT_MODULE;
if (!playwrightModule) {
  throw new Error("CITYWALK_PLAYWRIGHT_MODULE is required");
}

const require = createRequire(import.meta.url);
const { chromium } = require(playwrightModule);
const baseUrl = process.env.CITYWALK_ACCOUNT_E2E_BASE_URL ?? "http://127.0.0.1:3101";

async function assertStatus(response, expected, label) {
  if (response.status() === expected) return;
  let body = "<unavailable>";
  try {
    body = await response.text();
  } catch {
    // The status remains the primary failure signal if the body is unavailable.
  }
  assert.equal(response.status(), expected, `${label} returned ${response.status()}: ${body}`);
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`${baseUrl}/account-deletion`, { waitUntil: "networkidle" });

  await page.getByRole("heading", { name: "Delete your CITYWALK account" }).waitFor();
  await page.waitForTimeout(750);
  await page.getByLabel("Account email").fill("citywalk-account-e2e@example.invalid");

  const requestResponsePromise = page.waitForResponse(
    response => response.url().endsWith("/api/account/delete-request") && response.request().method() === "POST",
    { timeout: 10000 },
  );
  await page.getByRole("button", { name: "Send deletion confirmation" }).click();
  const requestResponse = await requestResponsePromise;
  await assertStatus(requestResponse, 200, "delete-request");

  const requestStatus = page.getByRole("status");
  await requestStatus.waitFor();
  assert.match(
    await requestStatus.textContent(),
    /If a CITYWALK account exists for that address/i,
  );

  await page.goto(`${baseUrl}/account-deletion#token=invalid-e2e-token`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("heading", { name: "Confirm permanent deletion" }).waitFor();
  await page.waitForFunction(() => window.location.hash === "");
  await page.waitForTimeout(250);

  await page
    .getByLabel("I understand that this permanently deletes my CITYWALK account.")
    .check();
  const confirmResponsePromise = page.waitForResponse(
    response => response.url().endsWith("/api/account/delete-confirm") && response.request().method() === "POST",
    { timeout: 10000 },
  );
  await page.getByRole("button", { name: "Delete my account permanently" }).click();
  const confirmResponse = await confirmResponsePromise;
  await assertStatus(confirmResponse, 400, "delete-confirm");

  const alert = page.getByRole("alert");
  await alert.waitFor();
  assert.match(
    await alert.textContent(),
    /invalid, expired, or already used/i,
  );
} finally {
  await browser.close();
}
