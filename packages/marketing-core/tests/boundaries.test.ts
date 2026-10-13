// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

describe("marketing core extraction boundary", () => {
  it("permits only internal package imports and Zod in every production module", () => {
    const root = resolve("packages/marketing-core/src");
    for (const name of readdirSync(root, { recursive: true, encoding: "utf8" }).filter((name) => name.endsWith(".ts"))) {
      const source = readFileSync(resolve(root, name), "utf8");
      const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
      const check = (node: ts.Node) => {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
          const specifier = node.moduleSpecifier;
          if (specifier && ts.isStringLiteral(specifier)) {
            const path = specifier.text;
            expect(path === "zod" || /^\.\/[^/]+$/.test(path), `${name}: ${path}`).toBe(true);
            if (path.startsWith("./")) expect(readFileSync(resolve(root, path + ".ts"), "utf8")).toBeTruthy();
          }
        }
        if (ts.isCallExpression(node)) {
          expect(node.expression.kind, name).not.toBe(ts.SyntaxKind.ImportKeyword);
          if (ts.isIdentifier(node.expression)) expect(node.expression.text, name).not.toBe("require");
        }
        if (ts.isIdentifier(node)) {
          expect(node.text, name).not.toMatch(/^(cityId|placeId|campaignId|CITYWALK|process|fetch)$/);
        }
        ts.forEachChild(node, check);
      };
      check(file);
    }
    const manifest = JSON.parse(readFileSync(resolve(root, "../package.json"), "utf8"));
    expect(Object.keys(manifest.dependencies)).toEqual(["zod"]);
  });

  it("is not imported by existing Marketing CMS runtime flows", () => {
    const root = resolve("src/lib/admin/marketing");
    for (const file of readdirSync(root).filter((file) => file.endsWith(".ts") && !file.includes(".test.") && file !== "brandContextAdapter.ts")) {
      expect(readFileSync(resolve(root, file), "utf8"), file).not.toMatch(/@marketing\/core|brandContextAdapter/);
    }
  });
});
