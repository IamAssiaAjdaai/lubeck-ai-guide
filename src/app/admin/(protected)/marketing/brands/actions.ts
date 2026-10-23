"use server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { AdminAuthorizationError, requireAdminCapability } from "@/lib/admin/authorization.server";
import { createPersistedBrandContext, correctPersistedBrandContext, confirmPersistedBrandFacts, associateBrandProjectCampaign, BrandContextPersistenceError } from "@/lib/marketing/brandContext/service.server";
import type { BrandActionResult } from "@/lib/marketing/brandContext/ui";

function failure(error: unknown): BrandActionResult {
  if (error instanceof ZodError) return { ok: false, code: "INVALID", message: "Bitte die Angaben prüfen. Pflichtfelder, Quellen und Sprachcodes müssen gültig sein.", fields: [...new Set(error.issues.map(i => ({ identity: "Unternehmen", rawText: "Business Brief", offerings: "Angebote", targetAudiences: "Zielgruppen", marketingGoals: "Marketingziele", tone: "Tonalität", markets: "Märkte", languages: "Sprachen", provenance: "Quellen", facts: "Faktenvorschläge", hypotheses: "Hypothesen", missingInformation: "Offene Fragen", campaignId: "Kampagne" })[String(i.path.find(p => ["identity", "rawText", "offerings", "targetAudiences", "marketingGoals", "tone", "markets", "languages", "provenance", "facts", "hypotheses", "missingInformation", "campaignId"].includes(String(p)))) as "identity"] ?? "Formular"))] };
  if (error instanceof AdminAuthorizationError) return { ok: false, code: "FORBIDDEN", message: "Keine Berechtigung. Bitte die Anmeldung und alle Stadtzugriffe prüfen." };
  if (error instanceof BrandContextPersistenceError && error.code === "STALE_REVISION") return { ok: false, code: "STALE_REVISION", message: "Eine neuere Revision wurde gespeichert. Bitte neu laden und die Änderungen erneut prüfen. Ihre Eingabe wurde nicht gespeichert." };
  return { ok: false, code: "UNAVAILABLE", message: "Die Änderung konnte nicht abgeschlossen werden. Bitte den aktuellen Stand prüfen, bevor Sie erneut speichern." };
}
async function mutate(capability: "marketing:manage" | "publishing:review", operation: () => Promise<{ projectId: string; contextId: string; revision: number } | void>) {
  try {
    await requireAdminCapability(capability);
    const result = await operation();
    revalidatePath("/admin/marketing/brands", "layout");
    return { ok: true as const, ...(result ? { projectId: result.projectId, contextId: result.contextId, revision: result.revision } : {}) };
  } catch (error) { return failure(error); }
}
export async function createBrandAction(input: unknown): Promise<BrandActionResult> { return mutate("marketing:manage", () => createPersistedBrandContext(input)); }
export async function correctBrandAction(input: unknown): Promise<BrandActionResult> { return mutate("marketing:manage", () => correctPersistedBrandContext(input)); }
export async function confirmBrandAction(input: unknown): Promise<BrandActionResult> { return mutate("publishing:review", () => confirmPersistedBrandFacts(input)); }
export async function associateBrandCampaignAction(input: unknown): Promise<BrandActionResult> { return mutate("marketing:manage", () => associateBrandProjectCampaign(input)); }
