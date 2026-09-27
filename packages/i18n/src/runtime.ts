// Use the baseline Object API on both JavaScript engines; no platform polyfill.
export function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}
export function isI18nDevelopment(): boolean { return process.env.NODE_ENV === "development"; }
