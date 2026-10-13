"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { RawBusinessBrief } from "@marketing/core";
import { emptyBrief, type BrandAction, type BrandActionResult } from "@/lib/marketing/brandContext/ui";

export const brandInputClass = "min-h-11 w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-100";
type Campaign = { id: number; name: string; cityId: number };
const groups = [
  { key: "offerings", title: "Angebote", fields: [["name", "Angebotsname"], ["description", "Beschreibung"]], initial: { name: "", description: "" } },
  { key: "targetAudiences", title: "Zielgruppen", fields: [["description", "Zielgruppe"]], initial: { description: "" } },
  { key: "marketingGoals", title: "Marketingziele", fields: [["description", "Ziel"], ["cta", "Handlungsaufforderung (optional)"]], initial: { description: "" } },
  { key: "markets", title: "Märkte", fields: [["name", "Markt"], ["countryCode", "Ländercode (optional, z. B. DE)"]], initial: { name: "" } },
  { key: "provenance", title: "Quellen", fields: [["label", "Quellenbezeichnung"], ["locator", "Quellen-URL (optional)"]], initial: { label: "", kind: "manual" } },
  { key: "facts", title: "Faktenvorschläge", fields: [["statement", "Aussage"]], initial: { statement: "", basis: "user_supplied", provenanceIds: [] } },
  { key: "hypotheses", title: "Hypothesen", fields: [["statement", "Annahme"], ["rationale", "Begründung (optional)"]], initial: { statement: "", provenanceIds: [] } },
  { key: "missingInformation", title: "Offene Fragen", fields: [["question", "Frage"]], initial: { question: "", field: "other" } },
] as const;
export function BrandActionFeedback({ result }: { result: BrandActionResult | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (result && !result.ok) ref.current?.focus(); }, [result]);
  if (!result) return null;
  return <div ref={ref} tabIndex={-1} role={result.ok ? "status" : "alert"} className="rounded-xl border border-border bg-slate-50 p-4 text-sm break-words">
    {result.ok ? `Gespeichert${result.revision ? ` · Revision ${result.revision}` : ""}.` : result.message}
    {!result.ok && result.fields?.length ? <p className="mt-2">Bitte prüfen: {result.fields.join(", ")}</p> : null}
    {!result.ok && result.code === "STALE_REVISION" ? <p className="mt-2">Kopieren Sie bei Bedarf Ihre Eingabe vor dem Neuladen. Es erfolgt keine automatische Wiederholung.</p> : null}
  </div>;
}
export function BrandBriefForm({ action, campaigns = [], initial, target }: { action: BrandAction; campaigns?: Campaign[]; initial?: RawBusinessBrief; target?: { projectId: string; contextId: string; expectedRevision: number } }) {
  const router = useRouter();
  const [brief, setBrief] = useState(initial ?? emptyBrief);
  const [campaignId, setCampaignId] = useState("");
  const [result, setResult] = useState<BrandActionResult | null>(null), [busy, setBusy] = useState(false);
  function identity(key: keyof RawBusinessBrief["identity"], value: string) { setBrief(b => ({ ...b, identity: { ...b.identity, [key]: value || undefined } })); }
  function update(key: typeof groups[number]["key"], index: number, field: string, value: unknown) {
    setBrief(b => ({ ...b, [key]: b[key].map((row, i) => i === index ? { ...row, [field]: value === "" && ["cta", "locator", "countryCode", "rationale"].includes(field) ? undefined : value } : row) }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setResult(null);
    try {
      const submitted = { ...brief, languages: brief.languages.map(v => v.trim()).filter(Boolean), tone: { voice: brief.tone.voice.map(v => v.trim()).filter(Boolean), avoid: brief.tone.avoid.map(v => v.trim()).filter(Boolean), forbiddenClaims: brief.tone.forbiddenClaims.map(v => v.trim()).filter(Boolean) } };
      const reply = await action(target ? { ...target, brief: submitted } : { campaignId: Number(campaignId), brief: submitted });
      setResult(reply);
      if (reply.ok) { if (!target) router.push(`/admin/marketing/brands/${reply.projectId}/${reply.contextId}`); else router.refresh(); }
    } catch { setResult({ ok: false, code: "UNAVAILABLE", message: "Verbindung unterbrochen. Bitte aktuellen Stand prüfen, bevor Sie erneut speichern." }); }
    finally { setBusy(false); }
  }
  const field = (label: string, key: keyof RawBusinessBrief["identity"], required = false) => <label className="grid gap-2 text-sm font-semibold">{label}<input className={brandInputClass} value={brief.identity[key] ?? ""} onChange={e => identity(key, e.target.value)} required={required} maxLength={key === "name" ? 160 : key === "summary" ? 2000 : key === "businessType" ? 120 : 2048} type={key === "website" ? "url" : "text"} /></label>;
  return <form onSubmit={submit} className="surface-card mt-6 space-y-7 p-5 sm:p-7" aria-label={target ? "Markenkontext korrigieren" : "Marke anlegen"}>
    <BrandActionFeedback result={result} />
    {brief.missingInformation.length > 40 ? <p role="status" className="text-sm">Der Kontext enthält zusätzliche offene Fragen. Bitte vor dem Speichern ausdrücklich auf höchstens 40 Fragen reduzieren; es wird nichts stillschweigend gelöscht.</p> : null}
    <fieldset disabled={busy} className="min-w-0 space-y-7">
      {target ? <p className="rounded-xl bg-amber-50 p-4 text-sm">Revision {target.expectedRevision} korrigieren: Eine Korrektur setzt alle aktuellen Bestätigungen zurück. Ältere Revisionen bleiben erhalten. Dies ist keine Löschung.</p> : <label className="grid gap-2 text-sm font-semibold">Bestehende Kampagne<select className={brandInputClass} value={campaignId} onChange={e => setCampaignId(e.target.value)} required><option value="">Bitte auswählen</option>{campaigns.map(c => <option key={c.id} value={c.id}>{c.name} · Stadt {c.cityId}</option>)}</select><span className="font-normal text-text-secondary">Die Kampagne bestimmt den ersten Stadtzugriff. Sie bleibt unabhängig von der Marke.</span></label>}
      <section className="space-y-4"><h2 className="text-xl font-bold">1 · Unternehmen</h2><div className="grid gap-4 sm:grid-cols-2">{field("Unternehmensname", "name", true)}{field("Unternehmensart (optional)", "businessType")}{field("Beschreibung (optional)", "summary")}{field("Website (optional)", "website")}</div>
        <label className="grid gap-2 text-sm font-semibold">Business Brief<textarea className={brandInputClass} value={brief.rawText} onChange={e => setBrief(b => ({ ...b, rawText: e.target.value }))} required maxLength={20000} rows={5} /><span className="font-normal text-text-secondary">Eigene Angaben, keine Zugangsdaten oder unnötigen personenbezogenen Daten. Hier werden keine Fakten automatisch extrahiert.</span></label>
      </section>
      <section className="space-y-4"><h2 className="text-xl font-bold">2 · Ausrichtung</h2>
        <div className="grid gap-4 sm:grid-cols-2">{([['voice', 'Tonalität'], ['avoid', 'Zu vermeiden'], ['forbiddenClaims', 'Unzulässige Aussagen']] as const).map(([key, label]) => <label key={key} className="grid gap-2 text-sm font-semibold">{label} (eine Angabe je Zeile)<textarea className={brandInputClass} value={brief.tone[key].join("\n")} onChange={e => setBrief(b => ({ ...b, tone: { ...b.tone, [key]: e.target.value.split("\n") } }))} /></label>)}
        <label className="grid gap-2 text-sm font-semibold">Sprachen (Codes, durch Komma getrennt)<input className={brandInputClass} value={brief.languages.join(",")} onChange={e => setBrief(b => ({ ...b, languages: e.target.value.split(",") }))} placeholder="de,en" /></label></div>
      </section>
      <section className="space-y-5"><h2 className="text-xl font-bold">3 · Struktur und menschliche Prüfung</h2><p className="text-sm text-text-secondary">Optionale Einträge. Quellen sind manuelle Referenzen: Es werden keine Webseiten abgerufen oder Aussagen unabhängig verifiziert.</p>
        {groups.map(group => <fieldset className="min-w-0 space-y-3 rounded-xl border border-border p-4" key={group.key}><legend className="px-2 font-bold">{group.title}</legend>
          {brief[group.key].map((row, i) => <div key={row.id} className="grid min-w-0 gap-3 border-b border-border pb-4 sm:grid-cols-2">{group.fields.map(([key, label]) => <label key={key} className="grid min-w-0 gap-2 text-sm font-semibold">{label}<input className={brandInputClass} value={String((row as unknown as Record<string, unknown>)[key] ?? "")} onChange={e => update(group.key, i, key, e.target.value)} required={!label.includes("optional")} maxLength={key === "locator" ? 2048 : 2000} type={key === "locator" ? "url" : "text"} /></label>)}
            {group.key === "provenance" ? <label className="grid gap-2 text-sm">Quellenart<select className={brandInputClass} value={(row as RawBusinessBrief["provenance"][number]).kind} onChange={e => update(group.key, i, "kind", e.target.value)}>{["manual", "website", "document", "repository", "raw_brief"].map(k => <option key={k} value={k}>{({ manual: "Manuell", website: "Website", document: "Dokument", repository: "Repository", raw_brief: "Brief" })[k as "manual"]}</option>)}</select></label> : null}
            {group.key === "facts" ? <label className="grid gap-2 text-sm">Grundlage<select className={brandInputClass} value={(row as RawBusinessBrief["facts"][number]).basis} onChange={e => update(group.key, i, "basis", e.target.value)}><option value="user_supplied">Eigene Angabe</option><option value="source_backed">Mit Quellenreferenz (nicht verifiziert)</option></select></label> : null}
            {group.key === "facts" || group.key === "hypotheses" ? <label className="grid gap-2 text-sm">Quellen für Eintrag {i + 1}<select multiple className={brandInputClass} value={(row as RawBusinessBrief["facts"][number]).provenanceIds} onChange={e => update(group.key, i, "provenanceIds", Array.from(e.target.selectedOptions).map(o => o.value))}>{brief.provenance.map(p => <option key={p.id} value={p.id}>{p.label || "Neue Quelle"}</option>)}</select><span>Mehrfachauswahl mit Strg/⌘. Ohne Quelle gilt ein Fakt als eigene Briefangabe.</span></label> : null}
            <button type="button" className="button-secondary min-h-11 px-3 sm:col-span-2" disabled={group.key === "provenance" && [...brief.facts, ...brief.hypotheses].some(f => f.provenanceIds.includes(row.id))} onClick={() => setBrief(b => ({ ...b, [group.key]: b[group.key].filter(r => r.id !== row.id) }))}>{group.title}: Eintrag {i + 1} entfernen</button>
          </div>)}
          {group.key === "provenance" ? <p className="text-xs text-text-secondary">Verwendete Quellen zuerst von Fakten und Hypothesen lösen, bevor sie entfernt werden.</p> : null}
          <button type="button" className="button-secondary min-h-11 px-4" disabled={brief[group.key].length >= (group.key === "provenance" ? 99 : group.key === "facts" || group.key === "hypotheses" ? 100 : group.key === "marketingGoals" ? 20 : group.key === "missingInformation" ? 40 : 50)} onClick={() => setBrief(b => ({ ...b, [group.key]: [...b[group.key], { id: crypto.randomUUID(), ...group.initial }] }))}>{group.title} hinzufügen</button>
        </fieldset>)}
      </section>
      <button type="submit" className="button-primary min-h-11 px-5">{busy ? "Wird gespeichert …" : target ? "Korrektur als neue Revision speichern" : "Marke speichern"}</button>
    </fieldset>
    {result && !result.ok && result.code === "STALE_REVISION" ? <button type="button" className="button-secondary min-h-11 px-4" onClick={() => window.location.reload()}>Aktuelle Revision neu laden</button> : null}
  </form>;
}
