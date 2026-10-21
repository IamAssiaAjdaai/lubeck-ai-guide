// Read-only smoke checks against loopback builds. Never run against production.
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CITYWALK_PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.CITYWALK_LAUNCH_TEST_ORIGIN || "http://127.0.0.1:3100";
const target = new URL(origin);
assert.equal(target.hostname, "127.0.0.1", "Only a loopback build can be tested");
assert.equal(target.protocol, "http:");
const configured = process.env.CITYWALK_LAUNCH_TEST_LEGAL_CONFIGURED === "1";
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const [route, heading] of [
    ["/", /Make every city your own\./i], ["/explore", /.+/],
    ["/en/lubeck", /.+/], ["/en/account", /.+/],
    ["/privacy", "Privacy notice"], ["/terms", "Terms of use"],
    ["/imprint", "Imprint"], ["/support", "Need help with CITYWALK?"],
    ["/account-deletion", "Delete your CITYWALK account"],
  ]) {
    const response = await page.goto(origin + route, { waitUntil: "networkidle" });
    assert.equal(response?.status(), 200, route);
    assert.ok(await page.getByRole("heading", { level: 1, name: heading }).count() >= 1, `${route} content`);
    if (["/privacy", "/terms", "/imprint"].includes(route)) {
      const robots = await page.locator('meta[name="robots"]').getAttribute("content");
      assert.equal(/noindex/.test(robots || ""), !configured, `${route} indexing`);
      assert.equal(await page.getByRole("note").count(), configured ? 0 : 1, `${route} launch blocker`);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://getcitywalk.com${route}`);
      const nav = page.getByRole("navigation", { name: "Legal navigation" });
      assert.ok(await nav.getByRole("link", { name: "Support", exact: true }).isVisible());
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.addStyleTag({ content: `html { font-size: ${width === 390 ? "200%" : "100%"} !important; }` });
        const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
        assert.ok(size.document <= size.viewport + 1, `${route} reflow at ${width}px`);
      }
    }
    results.push({ route, status: 200 });
  }
  const sitemap = await (await page.request.get(origin + "/sitemap.xml")).text();
  for (const route of ["/privacy", "/terms", "/imprint"]) assert.equal(sitemap.includes(`https://getcitywalk.com${route}`), configured);
  for (const [route, status] of [["/api/content/cities?locale=en", 200], ["/api/auth/get-session", 200], ["/api/account/export", 401]]) {
    const response = await page.request.get(origin + route);
    assert.equal(response.status(), status, route);
    results.push({ route, status });
  }
  const dropped = await page.request.post(origin + "/api/analytics/marketing-funnel", {
    data: { event: "walk_started", city: "lubeck" },
  });
  assert.equal(dropped.status(), 204);
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log(JSON.stringify({ configured, results, legalReflow: true, unauthenticatedFunnelDropped: true }, null, 2));
} finally {
  await browser.close();
}
