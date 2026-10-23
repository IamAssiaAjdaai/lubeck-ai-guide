import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ["apps/marketing-saas/**/*.{ts,tsx}"], rules: { "@next/next/no-html-link-for-pages": "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "apps/**/dist/**",
    "apps/**/node_modules/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    ".cloudflare/**",
    ".vinext/**",
    "mobile/**",
    "lubeck-ai-guide/**", // Separate local checkout, not this application.
  ]),
]);

export default eslintConfig;
