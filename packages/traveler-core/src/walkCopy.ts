// These private source packages are siblings. Resolve their public entry points
// directly so a standalone mobile install does not need root node_modules.
import { walkCopy as sharedWalkCopy } from "../../i18n/src/adapters";
import { resolveUILocale } from "../../i18n/src/index";
export type WalkCopy = ReturnType<typeof sharedWalkCopy>;
export function walkCopy(locale: string): WalkCopy { return sharedWalkCopy(resolveUILocale(locale)); }
export { categoryLabel as walkCategoryLabel } from "../../i18n/src/index";
export const walkCopyLocale = resolveUILocale;
