import "server-only";
import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";
import { redactObviousCredentials } from "@marketing/core";
import { WebsiteIntakeError } from "./errors";
import { extractedPageSchema } from "./contracts";

const excluded = new Set(["script", "style", "template", "noscript", "svg", "form", "iframe", "nav", "footer", "head"]);
type Node = DefaultTreeAdapterMap["node"];
const clean = (text: string) => redactObviousCredentials(text.replace(/\s+/g, " ").trim());
export function extractPage(html: string, sourceUrl: string, fetchedAt: string) {
  const doc = parse(html);
  const candidates: string[] = [];
  let title = "", description = "";
  function text(node: Node): string {
    if (node.nodeName === "#text") return (node as DefaultTreeAdapterMap["textNode"]).value;
    if (!("childNodes" in node)) return "";
    if ("tagName" in node && (excluded.has(node.tagName) || node.attrs.some(a =>
      a.name === "hidden" || a.name === "inert" || (a.name === "aria-hidden" && a.value === "true")
      || (a.name === "style" && /display\s*:\s*none|visibility\s*:\s*hidden/i.test(a.value))))) return "";
    return node.childNodes.map(text).join(" ");
  }
  function visit(node: Node, hidden = false) {
    if ("tagName" in node) {
      if (node.tagName === "title") title = clean("childNodes" in node ? node.childNodes.map(text).join(" ") : "").slice(0,160);
      if(node.tagName === "meta" && node.attrs.some(a=>a.name==="name" && /^(robots|marketingbriefbot)$/i.test(a.value)) && node.attrs.some(a=>a.name==="content" && /noindex|nofollow|none/i.test(a.value))) throw new WebsiteIntakeError("POLICY");
      if (node.tagName === "meta" && node.attrs.some(a => a.name === "name" && a.value === "description")) description = clean(node.attrs.find(a => a.name === "content")?.value ?? "").slice(0,500);
      hidden ||= excluded.has(node.tagName) || node.attrs.some(a => a.name === "hidden" || a.name === "inert" || a.name === "aria-hidden" && a.value === "true" || a.name === "style" && /display\s*:\s*none|visibility\s*:\s*hidden/i.test(a.value));
      if (!hidden && /^(p|li|h[1-3])$/.test(node.tagName)) {
        const value = clean(text(node));
        // Conservative verbatim candidates. No qualification/price/result inference.
        if (value.length >= 12 && value.length <= 500 && !/ignore|instruction|system\s*prompt|assistant|ignoriere|anweisung|api[_ -]?key|password|passwort/i.test(value)
          && !candidates.includes(value) && candidates.length < 8) candidates.push(value);
      }
    }
    if ("childNodes" in node) node.childNodes.forEach(child => visit(child, hidden));
  }
  visit(doc);
  return extractedPageSchema.parse({ sourceUrl, fetchedAt, title, description, candidates, uncertainty: "requires_human_review" });
}
