const { chromium } = await import(
  process.env.MARKETING_PLAYWRIGHT_MODULE ?? "playwright"
);
import { readdir, readFile, mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
const browser = await chromium.launch({
  ...(process.env.MARKETING_BROWSER_CHANNEL === "bundled"
    ? {}
    : { channel: process.env.MARKETING_BROWSER_CHANNEL ?? "chrome" }),
  headless: true,
});
const full = process.env.MARKETING_FULL_JOURNEY === "true";
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  permissions: ["clipboard-read", "clipboard-write"],
});
await context.route("**/*", (route) =>
  new URL(route.request().url()).hostname === "127.0.0.1"
    ? route.continue()
    : route.abort(),
);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const email = `browser-${randomUUID()}@example.test`;
const password = "Synthetic-browser-password-2026!";
try {
  await page.goto("http://127.0.0.1:3108/auth");
  await page.getByRole("button", { name: "Neues Konto erstellen" }).click();
  await page.getByLabel("Dein Name").fill("QA Unternehmen");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Konto erstellen", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Bitte bestätige" })
    .waitFor();
  let mail;
  for (const file of await readdir(".qa-mail")) {
    const data = JSON.parse(await readFile(".qa-mail/" + file, "utf8"));
    if (data.to === email && data.kind === "verify") mail = data;
  }
  if (!mail) throw new Error("QA verification sink missing");
  await page.goto(mail.url);
  await page.goto("http://127.0.0.1:3108/auth");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Anmelden", exact: true }).click();
  await page
    .getByRole("heading", { name: "Dein Unternehmen", exact: true })
    .waitFor();
  await page
    .getByLabel("Unternehmensname", { exact: true })
    .fill("Glanz Browser QA");
  await page
    .getByRole("button", { name: "Unternehmen anlegen", exact: true })
    .click();
  if (full) {
    await page
      .getByLabel("Öffentliche Website (HTTPS)")
      .fill("https://glanz.example");
    await page
      .getByRole("button", { name: "Website importieren", exact: true })
      .click();
    await page.getByText("Website-Vorschlag · ungeprüft").first().waitFor();
  } else {
    await page
      .getByLabel("Was bietest du an?")
      .fill("Wir reinigen Büros in Düsseldorf.");
    await page
      .getByLabel("Fakten zum Prüfen")
      .fill("Wir reinigen Büros in Düsseldorf.");
    await page
      .getByRole("button", { name: "Angaben speichern", exact: true })
      .click();
    await page.getByText("Eigene Angabe · ungeprüft").waitFor();
  }
  await page
    .getByRole("checkbox", {
      name: "Wir reinigen Büros in Düsseldorf.",
      exact: true,
    })
    .check();
  await page
    .getByRole("checkbox", { name: "Ich habe die ausgewählten" })
    .check();
  await page
    .getByRole("button", { name: "Ausgewählte Fakten bestätigen" })
    .click();
  await page.getByText("Von dir bestätigt", { exact: true }).waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "Glanz Browser QA", exact: true })
    .click();
  await page.getByText("Von dir bestätigt", { exact: true }).waitFor();
  if (full) {
    await page
      .getByRole("button", { name: "Marketing-Packs", exact: true })
      .click();
    await page
      .getByLabel("Wen möchtest du erreichen?")
      .fill("Büroleitungen in Düsseldorf");
    await page
      .getByRole("button", { name: "Demo-Pack erstellen", exact: true })
      .click();
    await page
      .getByRole("heading", {
        name: "Prüfen, bearbeiten, selbst veröffentlichen",
      })
      .waitFor();
    await page.getByText("3 von 4 Packs verfügbar", { exact: true }).waitFor();
    const editor = page.getByRole("textbox", { name: /^Beitrag 1/ });
    await editor.fill(
      (await editor.inputValue()) + "\n\nLass uns deinen Bedarf besprechen.",
    );
    await page
      .getByRole("button", { name: "Änderungen speichern", exact: true })
      .click();
    await page
      .getByText("Änderungen als neue Version gespeichert.", { exact: true })
      .waitFor();
    await page
      .getByRole("combobox", { name: "Gespeicherte Version", exact: true })
      .selectOption("1");
    if (
      (await editor.inputValue()).includes("Lass uns deinen Bedarf besprechen.")
    )
      throw new Error("Original version overwritten");
    await page
      .getByRole("combobox", { name: "Gespeicherte Version", exact: true })
      .selectOption("2");
    if (
      !(await editor.inputValue()).includes(
        "Lass uns deinen Bedarf besprechen.",
      )
    )
      throw new Error("Edited version missing");
    await page
      .getByRole("checkbox", {
        name: "Ich habe diese gespeicherte Version geprüft.",
      })
      .check();
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Als Markdown herunterladen", exact: true })
      .click();
    const download = await pending;
    await download.saveAs("docs/qa/marketing-saas/synthetic-pack.md");
    const content = await readFile(
      "docs/qa/marketing-saas/synthetic-pack.md",
      "utf8",
    );
    if (
      !content.includes("DEMO") ||
      !content.includes("Lass uns deinen Bedarf besprechen.") ||
      !content.includes("Wir reinigen Büros in Düsseldorf.")
    )
      throw new Error("Export content invalid");
    await page
      .getByRole("button", { name: "Inhalte kopieren", exact: true })
      .click();
    await page
      .getByText("In die Zwischenablage kopiert.", { exact: true })
      .waitFor();
    if (
      !(await page.evaluate(() => navigator.clipboard.readText())).includes(
        "Lass uns deinen Bedarf besprechen.",
      )
    )
      throw new Error("Clipboard content missing");
    const inaccessible = await page.evaluate(
      () =>
        [...document.querySelectorAll("input,textarea,select")].filter(
          (el) => !el.labels?.length && !el.getAttribute("aria-label"),
        ).length,
    );
    if (inaccessible) throw new Error("Unlabelled form field");
    await page
      .getByRole("button", { name: "Demo-Pack erstellen", exact: true })
      .click();
    await page.getByText("2 von 4 Packs verfügbar", { exact: true }).waitFor();
  }
  await mkdir("docs/qa/marketing-saas/screenshots", { recursive: true });
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await page
      .getByRole("heading", {
        name: full ? "Dein 7-Tage-Plan" : "2. Fakten prüfen und bestätigen",
        exact: true,
      })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `docs/qa/marketing-saas/screenshots/${full ? "complete-journey" : "auth-facts"}-${width}.png`,
      fullPage: false,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    if (overflow) throw new Error(`Horizontal overflow ${width}`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    full
      ? "MARKETING_SAAS_COMPLETE_DEMO_JOURNEY_PASS"
      : "MARKETING_SAAS_AUTH_FACTS_BROWSER_PASS",
  );
} finally {
  await browser.close();
}
