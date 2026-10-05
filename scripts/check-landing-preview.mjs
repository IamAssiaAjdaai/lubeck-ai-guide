// CI-only browser check. Uses a loopback server, never the production origin.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CITYWALK_PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.CITYWALK_PREVIEW_ORIGIN || "http://127.0.0.1:3100";
const parsed = new URL(origin);
assert.equal(parsed.hostname, "127.0.0.1", "Only the loopback preview may be tested");
assert.equal(parsed.protocol, "http:");
const output = path.resolve(process.env.CITYWALK_PREVIEW_OUTPUT || "artifacts/landing-preview");
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 } });
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    const response = await page.goto(`${origin}/landing-preview`, { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200, `HTTP at ${width}px`);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("h1").count(), 1);
    assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /noindex/);
    assert.equal(await page.locator("form, input, iframe").count(), 0);
    assert.equal(await page.getByRole("navigation", { name: "Landing page" }).count(), 1);
    assert.equal(await page.getByRole("heading", { name: "A walk that fits your day." }).count(), 1);
    assert.equal(await page.getByText("Walking times are estimates, not a guaranteed arrival time.").count(), 1);
    assert.equal(await page.getByRole("heading", { name: "Discover more as you walk." }).count(), 1);
    assert.equal(await page.getByText(/availability varies by place, published content and selected language/i).count(), 1);
    assert.equal(await page.getByRole("heading", { name: "Starting in Lübeck. Built for more cities." }).count(), 1);
    assert.equal(await page.getByText(/store availability is announced separately/i).count(), 1);

    const overflow = await page.evaluate(() => [...document.querySelectorAll("main *, header *, footer *")]
      .filter(element => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && (box.left < -1 || box.right > window.innerWidth + 1);
      }).map(element => element.tagName));
    assert.deepEqual(overflow, [], `Horizontal overflow at ${width}px`);
    const tooSmall = await page.getByRole("link").evaluateAll(links => links
      .filter(link => link.textContent !== "Skip to content")
      .filter(link => link.getBoundingClientRect().height < 44)
      .map(link => link.textContent));
    assert.deepEqual(tooSmall, [], `Short interaction targets at ${width}px`);
    await page.keyboard.press("Tab");
    assert.equal(await page.locator(":focus").textContent(), "Skip to content");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(":focus").getAttribute("id"), "landing-content");
    await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: path.join(output, `landing-${width}.png`), fullPage: true });
    assert.deepEqual(pageErrors, [], `Client errors at ${width}px`);
    results.push({ width, status: 200, overflow: false, keyboardSkip: true });
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 390, height: 1000 }, reducedMotion: "reduce" });
  await page.goto(`${origin}/landing-preview`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  const pageWidth = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert.ok(pageWidth.document <= pageWidth.viewport + 1, "Reflow at 200% text");
  assert.ok(await page.getByRole("heading", { level: 1 }).isVisible());
  await page.screenshot({ path: path.join(output, "landing-390-text-200.png"), fullPage: true });
  results.push({ width: 390, textScale: "200%", reducedMotion: true });
  await page.close();
  await writeFile(path.join(output, "checks.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ result: "passed", checks: results }, null, 2));
} finally {
  await browser.close();
}
