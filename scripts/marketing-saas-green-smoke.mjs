import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import sharp from "sharp";
const require = createRequire(import.meta.url);
const { chromium } = await import(
  process.env.MARKETING_PLAYWRIGHT_MODULE ?? "playwright"
);
const origin = process.env.MARKETING_BROWSER_ORIGIN ?? "http://127.0.0.1:3108";
const folder = "docs/design/marketing-saas/brand-02/qa/green";
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.MARKETING_BROWSER_CHANNEL === "bundled"
    ? {}
    : { channel: process.env.MARKETING_BROWSER_CHANNEL ?? "chrome" }),
  headless: true,
});
const errors = [],
  external = [],
  api = [];
async function setup(context) {
  await context.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1"
      ? r.continue()
      : r.abort(),
  );
  context.on("page", (p) => {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("request", (r) => {
      const u = new URL(r.url());
      if (u.hostname !== "127.0.0.1") external.push(u.href);
      if (u.pathname.startsWith("/api/")) api.push(u.pathname);
    });
  });
}
async function shot(page, name) {
  await page.screenshot({
    path: `${folder}/${name}.png`,
    animations: "disabled",
  });
}
async function overflow(page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Horizontal overflow",
  );
}
async function axe(page, name) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(() =>
    window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      },
    }),
  );
  await writeFile(
    `${folder}/axe-${name}.json`,
    JSON.stringify(
      {
        violations: result.violations,
        incomplete: result.incomplete.map((v) => ({
          id: v.id,
          nodes: v.nodes.length,
        })),
      },
      null,
      2,
    ),
  );
  assert.equal(
    result.violations.length,
    0,
    JSON.stringify(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ),
  );
}
const sizes = [
    [1440, 900],
    [768, 1024],
    [390, 844],
    [375, 812],
  ],
  measurements = [];
try {
  const context = await browser.newContext();
  await setup(context);
  const page = await context.newPage();
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.goto(origin + "/");
    await page.locator("#hero-pack textarea").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(
      (await page.locator(".m-hero h1").innerText()).replace(/\s+/g, " "),
      "Dein Unternehmen kennt sich aus. Dein Marketing jetzt auch.",
    );
    assert.ok(
      await page
        .locator(".m-hero h1")
        .evaluate((e) =>
          getComputedStyle(e).fontFamily.includes("SaaS Fraunces"),
        ),
    );
    assert.equal(
      await page
        .locator(".m-header")
        .evaluate((e) => getComputedStyle(e).backgroundColor),
      "rgb(22, 45, 44)",
    );
    assert.equal(
      await page
        .locator(".m-hero")
        .getByText(/Wirkfaden/)
        .count(),
      0,
    );
    assert.ok(
      (await page.locator("main>section").count()) >= 13,
      "Complete landing sections retained",
    );
    const editor = await page
        .locator("#landing-hero-posts textarea")
        .boundingBox(),
      tabs = await page.locator("#hero-pack [role=tablist]").boundingBox();
    assert.ok(
      editor && editor.y + 80 <= height,
      `80px editable post visible at ${width}`,
    );
    assert.ok(
      tabs && tabs.y + tabs.height <= height,
      `All tabs visible at ${width}`,
    );
    measurements.push({ width, height, editor, tabs });
    await overflow(page);
    await shot(page, `landing-hero-${width}`);
    await sharp(
      await page.screenshot({ fullPage: true, animations: "disabled" }),
    )
      .webp({ quality: 85 })
      .toFile(`${folder}/landing-full-${width}.webp`);
    await axe(page, `landing-${width}`);
    await page
      .getByRole("group", { name: "Weg des Unternehmenswissens" })
      .getByRole("button", { name: /Bestätigung/ })
      .click();
    const hero = page.locator("#hero-pack");
    await hero.getByRole("tab", { name: "Hooks & CTA" }).click();
    await hero
      .getByLabel("Hook 1", { exact: true })
      .fill("Synthetischer grüner Hero-Hook.");
    await hero.getByRole("tab", { name: "Prüfen & exportieren" }).click();
    assert.equal(await hero.getByRole("button").isEnabled(), false);
    await hero.getByRole("checkbox").check();
    const pending = page.waitForEvent("download");
    await hero.getByRole("button").click();
    await (await pending).saveAs(`${folder}/hero-export-${width}.md`);
    const exported = await readFile(
      `${folder}/hero-export-${width}.md`,
      "utf8",
    );
    assert.match(exported, /FIKTIVES BEISPIEL/);
    assert.match(exported, /Synthetischer grüner Hero-Hook/);
    await page.locator("#pilot-status").scrollIntoViewIfNeeded();
    assert.equal(
      await page.locator("#pilot-status input,#pilot-status form").count(),
      0,
    );
    assert.equal(await page.locator("#pilot-status button").isDisabled(), true);
  }
  assert.deepEqual(api, [], "Public landing must not call the API");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(origin + "/");
  assert.equal(
    await page
      .locator(".hero-copy")
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => location.hash), "#inhalt");
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await page.goto(origin + "/auth");
    await page.getByLabel("E-Mail-Adresse").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await shot(page, `auth-${width}`);
    await overflow(page);
    await axe(page, `auth-${width}`);
  }
  await page.getByRole("button", { name: "Passwort vergessen?" }).click();
  await shot(page, "password-reset-request-375");
  await axe(page, "password-reset-request");
  await context.close();
  assert.ok(
    process.env.MARKETING_AUTH_STATE_PATH,
    "A synthetic local authenticated state is required",
  );
  const privateContext = await browser.newContext({
    storageState: process.env.MARKETING_AUTH_STATE_PATH,
  });
  await setup(privateContext);
  const workspace = await privateContext.newPage();
  for (const [width, height] of sizes) {
    await workspace.setViewportSize({ width, height });
    await workspace.goto(origin + "/auth");
    await workspace
      .getByRole("heading", { name: "Dein Unternehmen", exact: true })
      .waitFor();
    await workspace.evaluate(() => document.fonts.ready);
    await shot(workspace, `onboarding-${width}`);
    await axe(workspace, `onboarding-${width}`);
    await overflow(workspace);
    await workspace
      .getByRole("button", { name: "Glanz Browser QA", exact: true })
      .click();
    await workspace.getByLabel("Öffentliche Website (HTTPS)").waitFor();
    await shot(workspace, `intake-${width}`);
    await axe(workspace, `intake-${width}`);
    await overflow(workspace);
    await workspace
      .getByRole("heading", { name: "2. Fakten prüfen und bestätigen" })
      .scrollIntoViewIfNeeded();
    await shot(workspace, `facts-${width}`);
    await axe(workspace, `facts-${width}`);
    await overflow(workspace);
    const nav = workspace.getByRole("navigation", {
      name: width <= 650 ? "Mobile Navigation" : "Arbeitsbereich",
    });
    // Existing mobile and desktop controls intentionally keep the same API/state transition.
    await nav
      .getByRole("button", {
        name: width <= 650 ? "Packs" : "Marketing-Packs",
        exact: true,
      })
      .click();
    await workspace
      .getByRole("heading", {
        name: "Dein nächstes Marketing-Pack",
        exact: true,
      })
      .waitFor();
    await shot(workspace, `campaign-${width}`);
    await axe(workspace, `campaign-${width}`);
    await overflow(workspace);
    const history = workspace.locator(".pilot-history button").last();
    await history.click();
    await workspace.locator(".pack-result").waitFor();
    const versions = workspace.getByLabel("Gespeicherte Version", {
      exact: true,
    });
    await versions.selectOption("1");
    const firstPost = workspace.getByRole("textbox", { name: /^Beitrag 1/ });
    assert.equal(await firstPost.getAttribute("readonly"), "");
    await shot(workspace, `version-history-${width}`);
    await versions.selectOption("2");
    assert.match(
      await firstPost.inputValue(),
      /Lass uns deinen Bedarf besprechen/,
    );

    await workspace
      .locator(".pack-result")
      .evaluate((e) => e.scrollIntoView({ block: "start" }));
    await shot(workspace, `workspace-${width}`);
    await axe(workspace, `workspace-${width}`);
    await overflow(workspace);
    await workspace
      .getByRole("tab", { name: "Hooks & CTA", exact: true })
      .click();
    await shot(workspace, `hooks-${width}`);
    await workspace
      .getByRole("tab", { name: "Prüfen & exportieren", exact: true })
      .click();
    await shot(workspace, `export-${width}`);
    await nav
      .getByRole("button", {
        name: width <= 650 ? "Nutzung" : "Nutzung & Plan",
        exact: true,
      })
      .click();
    await workspace
      .getByRole("heading", { name: "Nutzung & Plan", exact: true })
      .waitFor();
    await workspace.evaluate(() => scrollTo(0, 0));
    await shot(workspace, `usage-${width}`);
    await axe(workspace, `usage-${width}`);
    await overflow(workspace);
  }
  await writeFile(
    `${folder}/first-screen-measurements.json`,
    JSON.stringify(measurements, null, 2),
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    "MARKETING_GREEN_SYSTEM_PASS: complete landing, first-screen Pack, auth, persisted intake/facts/campaign/history/editor/export/usage × 4 widths, axe, reduced motion, no public collection or live AI",
  );
} finally {
  await browser.close();
}
