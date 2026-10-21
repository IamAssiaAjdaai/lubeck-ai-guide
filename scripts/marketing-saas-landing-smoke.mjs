import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = await import(
  process.env.MARKETING_PLAYWRIGHT_MODULE ?? "playwright"
);
const browser = await chromium.launch({
  ...(process.env.MARKETING_BROWSER_CHANNEL === "bundled"
    ? {}
    : { channel: process.env.MARKETING_BROWSER_CHANNEL ?? "chrome" }),
  headless: true,
  args: ["--disable-gpu"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();
const errors = [],
  requests = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  if (r.url().includes("/api/")) requests.push(r.url());
});
await context.route("**/*", (r) =>
  new URL(r.request().url()).hostname === "127.0.0.1"
    ? r.continue()
    : r.abort(),
);
const folder = "docs/qa/marketing-saas/ux-411-refinement";
await mkdir(folder, { recursive: true });
async function screenshot(name) {
  await page.screenshot({ path: `${folder}/${name}.png` });
}
async function noOverflow() {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "Horizontal overflow",
  );
}
async function axe(name) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(() =>
    window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
      },
    }),
  );
  await import("node:fs/promises").then((fs) =>
    fs.writeFile(
      `${folder}/axe-${name}.json`,
      JSON.stringify(
        {
          violations: result.violations,
          incomplete: result.incomplete.map((x) => ({
            id: x.id,
            description: x.description,
            nodes: x.nodes.length,
          })),
        },
        null,
        2,
      ),
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
try {
  await page.goto("http://127.0.0.1:3108/");
  await page
    .getByRole("heading", {
      name: "Deine Website. Dein nächster Marketingplan.",
    })
    .waitFor();
  for (const img of await page.locator("img").all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate((i) => i.decode());
  }
  assert.equal(
    await page
      .locator("img")
      .evaluateAll((imgs) => imgs.every((i) => i.naturalWidth > 0)),
    true,
    "Broken product screenshot",
  );
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => scrollTo(0, 0));
    await noOverflow();
    await screenshot(`landing-${width}`);
    assert.ok(
      (await page
        .locator(".preview-post p")
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))) >= 14,
    );
    if (width <= 900) {
      await page.getByRole("button", { name: "Menü ☰" }).click();
      await page
        .getByRole("navigation", { name: "Hauptnavigation" })
        .getByRole("link", { name: "Beispiel", exact: true })
        .click();
      assert.equal(
        await page
          .getByRole("button", { name: "Menü ☰" })
          .getAttribute("aria-expanded"),
        "false",
      );
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("tab", { name: "02 Fakten bestätigen" }).click();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page
      .getByRole("tab", { name: "03 Kampagne planen" })
      .getAttribute("aria-selected"),
    "true",
  );
  await page.locator("#beispiel").scrollIntoViewIfNeeded();
  await axe("landing");
  await page.getByRole("button", { name: "Beispiel-Fakten ansehen" }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Fakten im Beispiel bestätigen" })
      .isEnabled(),
    false,
  );
  await page
    .getByRole("checkbox", { name: "Wir reinigen Büros in Düsseldorf." })
    .check();
  await page
    .getByRole("checkbox", {
      name: "Ich habe die ausgewählten Beispielfakten geprüft.",
    })
    .check();
  await page
    .getByRole("button", { name: "Fakten im Beispiel bestätigen" })
    .click();
  await page
    .locator("#beispiel")
    .getByLabel("Was möchtest du erreichen?")
    .selectOption("sichtbarkeit");
  await page.getByRole("button", { name: "Beispiel-Pack laden" }).click();
  assert.equal(await page.locator(".sample-plan li").count(), 7);
  assert.equal(await page.locator(".sample-posts textarea").count(), 3);
  await page
    .getByRole("tab", { name: "Prüfen & exportieren", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Beispiel als Markdown exportieren" })
      .isEnabled(),
    false,
  );
  await page.getByRole("tab", { name: "3 Posts", exact: true }).click();
  assert.equal(await page.locator("#sample-pack-posts").isVisible(), true);
  assert.equal(await page.locator("#sample-pack-plan").isVisible(), false);
  await page.getByRole("tab", { name: "Hooks & CTA", exact: true }).click();
  await page
    .getByLabel("Hook 1", { exact: true })
    .fill("Synthetischer Hook zur Prüfung.");
  await page.getByRole("tab", { name: "7-Tage-Plan", exact: true }).click();
  assert.equal(await page.locator(".sample-plan li:visible").count(), 7);
  await page.keyboard.press("Home");
  await page.getByRole("tab", { name: "3 Posts", exact: true }).click();
  assert.equal(await page.locator("#sample-pack-posts").isVisible(), true);
  const editor = page.locator(".sample-posts textarea").first();
  const original = await editor.inputValue();
  await editor.fill(original + "\n\nSynthetische redaktionelle Ergänzung.");
  await page.getByRole("button", { name: "01 Website & Kurzbrief" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Speichere oder verwirf" })
    .waitFor();
  await page.getByRole("button", { name: "Beispielversion speichern" }).click();
  await page.getByLabel("Beispielversion", { exact: true }).selectOption("0");
  assert.equal(await editor.inputValue(), original);
  assert.equal(await editor.getAttribute("readonly"), "");
  await page.getByLabel("Beispielversion", { exact: true }).selectOption("1");
  assert.match(await editor.inputValue(), /redaktionelle Ergänzung/);
  await page
    .getByRole("tab", { name: "Prüfen & exportieren", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Ich habe diese Beispielversion geprüft." })
    .check();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Beispiel als Markdown exportieren" })
    .click();
  const download = await downloadPromise;
  await download.saveAs(`${folder}/sample-export.md`);
  const markdown = await readFile(`${folder}/sample-export.md`, "utf8");
  assert.match(markdown, /FIKTIVES BEISPIEL/);
  assert.match(markdown, /Version 2/);
  assert.match(markdown, /Synthetischer Hook zur Prüfung/);
  assert.match(markdown, /Ziel: sichtbarkeit/);
  assert.match(markdown, /redaktionelle Ergänzung/);
  assert.doesNotMatch(markdown, /regelmäßige Unterhaltsreinigung/);
  await page
    .getByRole("button", { name: "Inhalte kopieren", exact: true })
    .click();
  assert.match(
    await page.evaluate(() => navigator.clipboard.readText()),
    /FIKTIVES BEISPIEL/,
  );
  await axe("sample");
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.locator(".sample-result-title").scrollIntoViewIfNeeded();
    await noOverflow();
    await page.getByRole("tab", { name: "3 Posts", exact: true }).click();
    await screenshot(`sample-${width}`);
    await page.getByRole("tab", { name: "Hooks & CTA", exact: true }).click();
    await screenshot(`hooks-${width}`);
    await page
      .getByRole("tab", { name: "Prüfen & exportieren", exact: true })
      .click();
    await screenshot(`export-${width}`);
    await noOverflow();
  }
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.locator("#pilot-status").scrollIntoViewIfNeeded();
    assert.equal(
      await page
        .getByRole("button", {
          name: "Pilot-Zugang anfragen · noch nicht verfügbar",
        })
        .isEnabled(),
      false,
    );
    assert.equal(
      await page.locator("#pilot-status input,#pilot-status form").count(),
      0,
    );
    await noOverflow();
    await screenshot(`pilot-${width}`);
  }
  await page.getByRole("button", { name: "Beispiel zurücksetzen" }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "03 Ziel & Marketing-Pack" })
      .isEnabled(),
    false,
  );
  assert.equal(requests.length, 0, "Anonymous landing/tour made API calls");
  await page.locator("#faq details").first().locator("summary").click();
  assert.equal(
    await page.locator("#faq details").first().getAttribute("open"),
    "",
  );
  await page.goto("http://127.0.0.1:3108/rechtliches#datenschutz");
  await axe("legal");
  await noOverflow();
  await page.goto("http://127.0.0.1:3108/auth");
  await page.getByRole("heading", { name: "Willkommen zurück" }).waitFor();
  await axe("auth");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await screenshot(`auth-${width}`);
    await noOverflow();
  }
  assert.deepEqual(errors, []);
  console.log(
    "MARKETING_SAAS_LANDING_TOUR_PASS: 4 widths, no API calls, fact gate, 7 days/3 posts, version history, reviewed export/clipboard, keyboard tabs, legal, no overflow/page errors, axe",
  );
} finally {
  await browser.close();
}
