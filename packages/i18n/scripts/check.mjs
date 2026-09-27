import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export function flatten(value, prefix = "") {
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === "object" && !Array.isArray(child)
      ? Object.entries(flatten(child, name)) : [[name, child]];
  }));
}
export function checkDictionary(english, translated) {
  const base = flatten(english), values = flatten(translated), errors = [];
  const tokens = value => [...value.matchAll(/\{([^{}]+)\}/g)].map(match => match[1]).sort().join(",");
  for (const [key, source] of Object.entries(base)) {
    const value = values[key];
    if (typeof value !== "string" || !value.trim()) errors.push(`${key}: missing or empty`);
    else if (tokens(value) !== tokens(source)) errors.push(`${key}: interpolation mismatch`);
  }
  for (const key of Object.keys(values)) if (!Object.hasOwn(base, key)) errors.push(`${key}: unknown key`);
  return errors;
}
export function checkCatalogs(directory) {
  const read = locale => JSON.parse(readFileSync(path.join(directory, `${locale}.json`), "utf8"));
  const locales = JSON.parse(readFileSync(new URL("../src/launch-locales.json", import.meta.url), "utf8"));
  const english = read("en");
  return [...locales, "ar"].map(locale => ({ locale, keys: Object.keys(flatten(read(locale))).length, errors: checkDictionary(english, read(locale)) }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const results = checkCatalogs(process.argv[2] ?? fileURLToPath(new URL("../src/locales", import.meta.url)));
  for (const row of results) {
    console.log(`${row.locale}: ${row.keys} UI keys, ${row.errors.length} errors`);
    for (const error of row.errors) console.error(`  ${row.locale}: ${error}`);
  }
  if (results.some(row => row.errors.length)) process.exitCode = 1;
}
