import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = await import(
  process.env.MARKETING_PLAYWRIGHT_MODULE ?? "playwright"
);
const origin = process.env.MARKETING_BRAND_ORIGIN ?? "http://127.0.0.1:3128";
const folder =
  process.env.MARKETING_BRAND_EVIDENCE_ROOT ??
  "docs/design/marketing-saas/brand-01/qa";
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.MARKETING_BROWSER_CHANNEL === "bundled"
    ? {}
    : { channel: process.env.MARKETING_BROWSER_CHANNEL ?? "chrome" }),
  headless: true,
  args: ["--disable-gpu"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [],
  apiRequests = [],
  external = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  const u = new URL(r.url());
  if (u.pathname.startsWith("/api/")) apiRequests.push(u.pathname);
  if (u.hostname !== "127.0.0.1") external.push(r.url());
});
await context.route("**/*", (r) =>
  new URL(r.request().url()).hostname === "127.0.0.1"
    ? r.continue()
    : r.abort(),
);
async function overflow() {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "Overflow",
  );
}
async function screenshot(name) {
  await page.screenshot({
    path: `${folder}/${name}.png`,
    animations: "disabled",
  });
}
async function axe(name) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const r = await page.evaluate(() =>
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
        violations: r.violations,
        incomplete: r.incomplete.map((v) => ({
          id: v.id,
          nodes: v.nodes.length,
        })),
      },
      null,
      2,
    ),
  );
  assert.equal(
    r.violations.length,
    0,
    JSON.stringify(
      r.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ),
  );
}
try {
  for (const direction of ["kernmut", "wirkfaden"]) {
    await page.goto(`${origin}/design/brand/${direction}`);
    await page.locator(".brand-concept").waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1440, 768, 390, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => scrollTo(0, 0));
      await overflow();
      await screenshot(`${direction}-hero-${width}`);
      if (width <= 600) {
        await page.getByRole("button", { name: "Menü ☰" }).click();
        await page
          .getByRole("navigation", { name: "Konzeptnavigation" })
          .getByRole("link", { name: "Warum Kontext?" })
          .click();
        assert.equal(
          await page
            .getByRole("button", { name: "Menü ☰" })
            .getAttribute("aria-expanded"),
          "false",
        );
      }
      await page.locator("#kontext").scrollIntoViewIfNeeded();
      await screenshot(`${direction}-context-${width}`);
      await page.locator("#pack").scrollIntoViewIfNeeded();
      await screenshot(`${direction}-pack-${width}`);
      await overflow();
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await axe(direction);
    await page.getByRole("button", { name: "02 Bestätigung" }).click();
    await page
      .getByRole("heading", { name: "Von einem Menschen bestätigt" })
      .waitFor();
    await page.getByRole("button", { name: "03 Kontext" }).click();
    await page
      .getByRole("heading", { name: "Als Kontext im Pack verwendet" })
      .waitFor();
    const pack = page.locator("#pack .concept-pack");
    await pack.getByRole("button", { name: "Post 02" }).click();
    const editor = pack.getByLabel("Beitrag 2");
    await editor.fill(
      (await editor.inputValue()) + "\n\nSynthetische Designprüfung.",
    );
    await pack.getByRole("tab", { name: "Hooks & CTA" }).click();
    await pack
      .getByLabel("Hook 1", { exact: true })
      .fill("Synthetischer Hook zur Designprüfung.");
    await pack.getByRole("tab", { name: "7-Tage-Plan" }).click();
    assert.equal(await pack.locator(".cp-plan li:visible").count(), 7);
    await page.keyboard.press("Home");
    assert.match(await editor.inputValue(), /Designprüfung/);
    await pack.getByRole("tab", { name: "Prüfen & exportieren" }).click();
    assert.equal(
      await pack
        .getByRole("button", { name: "Beispiel als Markdown herunterladen" })
        .isEnabled(),
      false,
    );
    await pack
      .getByRole("checkbox", { name: "Ich habe den Beispielentwurf geprüft." })
      .check();
    const pending = page.waitForEvent("download");
    await pack
      .getByRole("button", { name: "Beispiel als Markdown herunterladen" })
      .click();
    const download = await pending;
    await download.saveAs(`${folder}/${direction}-export.md`);
    const md = await readFile(`${folder}/${direction}-export.md`, "utf8");
    assert.match(md, /FIKTIVES DESIGNBEISPIEL/);
    assert.match(md, /Synthetischer Hook zur Designprüfung/);
    assert.match(md, /Synthetische Designprüfung/);
    await axe(`${direction}-export`);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${origin}/design/brand/${direction}`);
    await page.locator(".brand-concept").waitFor();
    assert.equal(
      await page
        .locator(".bc-hero-copy,.bc-b-hero h1")
        .first()
        .evaluate((e) => getComputedStyle(e).animationName),
      "none",
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await page
        .locator(".bc-skip")
        .evaluate((e) => e === document.activeElement),
      true,
    );
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => location.hash), "#concept-main");
    await page.emulateMedia({ reducedMotion: "no-preference" });
  }
  const firstScreens = [];
  for (const [width, height] of [
    [1440, 900],
    [768, 1024],
    [390, 844],
    [375, 812],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${origin}/design/brand/wirkfaden`);
    await page.locator(".bc-b-copy").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await overflow();
    const tabs = await page.locator("#hero-pack [role=tablist]").boundingBox();
    const editor = await page.locator("#b-hero-posts textarea").boundingBox();
    assert.ok(
      tabs && tabs.y + tabs.height <= height,
      `All Pack tabs above fold at ${width}`,
    );
    assert.ok(
      editor && editor.y + 80 <= height,
      `At least 80px of editable post above fold at ${width}`,
    );
    firstScreens.push({ width, height, tabs, editor });
    await screenshot(`wirkfaden-first-screen-${width}`);
    const hero = page.locator("#hero-pack");
    await hero.getByRole("button", { name: "Post 02" }).click();
    await hero
      .getByLabel("Beitrag 2")
      .fill("Synthetischer Hero-Entwurf zur Prüfung.");
    await hero.getByRole("tab", { name: "Hooks & CTA" }).click();
    await hero
      .getByLabel("Hook 1", { exact: true })
      .fill("Synthetischer Hero-Hook.");
    await hero.getByRole("tab", { name: "3 Posts" }).click();
    assert.equal(
      await hero.getByLabel("Beitrag 2").inputValue(),
      "Synthetischer Hero-Entwurf zur Prüfung.",
    );
    await hero.getByRole("tab", { name: "Prüfen & exportieren" }).click();
    assert.equal(
      await hero
        .getByRole("button", { name: "Beispiel als Markdown herunterladen" })
        .isEnabled(),
      false,
    );
    await hero.getByRole("checkbox").check();
    assert.equal(
      await hero
        .getByRole("button", { name: "Beispiel als Markdown herunterladen" })
        .isEnabled(),
      true,
    );
    if (width === 375) {
      const pendingHero = page.waitForEvent("download");
      await hero
        .getByRole("button", { name: "Beispiel als Markdown herunterladen" })
        .click();
      const heroDownload = await pendingHero;
      await heroDownload.saveAs(`${folder}/wirkfaden-hero-export.md`);
      const heroText = await readFile(
        `${folder}/wirkfaden-hero-export.md`,
        "utf8",
      );
      assert.match(heroText, /FIKTIVES DESIGNBEISPIEL/);
      assert.match(heroText, /Synthetischer Hero-Entwurf/);
      assert.match(heroText, /Synthetischer Hero-Hook/);
      await page
        .getByRole("button", { name: "Nächste Designansicht →" })
        .click();
      await page
        .getByRole("heading", { name: "Du weißt, was stimmt." })
        .waitFor();
      await page
        .getByRole("button", { name: "Beispiel-Pack ansehen →", exact: true })
        .click();
      await page.locator("#b-workspace-tab-posts").waitFor();
    }
    for (const [i, name] of [
      "Anmeldung",
      "Unternehmensprofil",
      "Marketing-Pack",
    ].entries()) {
      await page
        .getByRole("group", { name: "Produktansicht wählen" })
        .getByRole("button", {
          name: `${String(i + 1).padStart(2, "0")} · ${name}`,
          exact: true,
        })
        .click();
      await page.locator(".bc-product-shell").scrollIntoViewIfNeeded();
      await overflow();
      await screenshot(`wirkfaden-product-${i + 1}-${width}`);
      await axe(`wirkfaden-product-${i + 1}-${width}`);
    }
  }
  await writeFile(
    `${folder}/first-screen-measurements.json`,
    JSON.stringify(firstScreens, null, 2),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  assert.deepEqual(apiRequests, []);
  assert.deepEqual(external, []);
  await page.goto(`${origin}/design/brand`);
  await page
    .getByRole("heading", { name: "Mehr Charakter. Dein Urteil zuerst." })
    .waitFor();
  for (const f of page.frames().slice(1)) {
    await f.locator(".brand-concept").waitFor();
    await f.evaluate(() => document.fonts.ready);
  }
  await page.setViewportSize({ width: 1440, height: 1450 });
  await screenshot("concepts-side-by-side-1440");
  await overflow();
  await axe("review");
  await page.setViewportSize({ width: 390, height: 1000 });
  await screenshot("concept-review-390");
  await overflow();
  await page.goto(`${origin}/design/brand?viewport=mobile`);
  await page
    .getByRole("heading", { name: "Mehr Charakter. Dein Urteil zuerst." })
    .waitFor();
  for (const f of page.frames().slice(1)) {
    await f.locator(".brand-concept").waitFor();
    await f.evaluate(() => document.fonts.ready);
    assert.equal(await f.evaluate(() => innerWidth), 390);
  }
  await page.setViewportSize({ width: 1440, height: 1850 });
  await screenshot("concepts-side-by-side-mobile");
  await axe("review-mobile");
  await overflow();
  await page.goto(origin);
  await page
    .getByRole("heading", {
      name: "Deine Website. Dein nächster Marketingplan.",
    })
    .waitFor();
  assert.equal(await page.locator(".brand-concept").count(), 0);
  assert.equal(
    await page.evaluate(() =>
      [...document.styleSheets].some((s) => s.href?.includes("brand-concepts")),
    ),
    false,
  );
  assert.deepEqual(errors, []);
  console.log(
    "MARKETING_BRAND_CONCEPTS_PASS: 2 concepts × 4 widths; context, editing, plan, review/export, keyboard, reduced motion, axe, no API/external calls, baseline unchanged",
  );
} finally {
  await browser.close();
}
