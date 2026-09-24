"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { locales } from "@/lib/i18n";
import { MEDIA_KINDS, type MediaKind } from "@/lib/media/types";

type UploadState = "idle" | "preparing" | "uploading" | "verifying" | "failed";

export function MediaUploadForm({
  cities,
  initialCityId,
  initialKind = "image",
  initialLocale = "de",
  candidatePlaceId,
}: Readonly<{
  cities: readonly Readonly<{ id: number; name: string }>[];
  initialCityId?: number;
  initialKind?: MediaKind;
  initialLocale?: (typeof locales)[number];
  candidatePlaceId?: number;
}>) {
  const router = useRouter();
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState<string>();
  const [kind, setKind] = useState<MediaKind>(initialKind);
  const [selectedFile, setSelectedFile] = useState<File>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const file = selectedFile;
    if (!file || file.size === 0) {
      setError("Choose a file to upload.");
      setState("failed");
      return;
    }
    try {
      setState("preparing");
      const intentResponse = await fetch("/api/admin/media/upload-intents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cityId: Number(form.get("cityId")),
          kind,
          originalFilename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          ...(kind === "audio" ? { locale: form.get("locale") } : {}),
          ...(kind === "audio" ? { accessLevel: form.get("accessLevel") } : {}),
        }),
      });
      const intent = (await intentResponse.json()) as { assetId?: number; uploadUrl?: string; error?: string };
      if (!intentResponse.ok || !intent.assetId || !intent.uploadUrl) {
        throw new Error(intent.error || "Unable to prepare upload.");
      }
      setState("uploading");
      const uploadResponse = await fetch(intent.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error("Object storage rejected the upload.");
      setState("verifying");
      const finalizeResponse = await fetch(`/api/admin/media/${intent.assetId}/finalize`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          candidatePlaceId && kind === "audio"
            ? {
                candidatePlaceId,
                locale: form.get("locale"),
              }
            : {},
        ),
      });
      const finalized = (await finalizeResponse.json()) as { error?: string };
      if (!finalizeResponse.ok) throw new Error(finalized.error || "Uploaded file could not be verified.");
      router.push(`/admin/media/${intent.assetId}?saved=1`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Media upload failed.");
      setState("failed");
    }
  }

  const busy = ["preparing", "uploading", "verifying"].includes(state);
  return (
    <form className="surface-card mt-6 space-y-5 p-5 sm:p-7" onSubmit={submit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="City">
          <select className={inputClass} defaultValue={initialCityId} disabled={busy} name="cityId" required>
            {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
          </select>
        </Field>
        <Field label="Media kind">
          <select className={inputClass} disabled={busy} name="kind" onChange={(event) => setKind(event.target.value as MediaKind)} value={kind}>
            {MEDIA_KINDS.map((value) => <option key={value}>{value}</option>)}
          </select>
        </Field>
      </div>
      {kind === "audio" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Audio locale">
            <select className={inputClass} defaultValue={initialLocale} disabled={busy} name="locale" required>
              {locales.map((locale) => <option key={locale}>{locale}</option>)}
            </select>
          </Field>
          <Field label="Access">
            <select className={inputClass} defaultValue="public" disabled={busy} name="accessLevel">
              <option value="public">Public / free</option>
              <option value="premium">City Pass premium</option>
            </select>
          </Field>
        </div>
      ) : null}
      <Field label="File">
        <input className={inputClass} disabled={busy} name="file" onChange={(event) => setSelectedFile(event.target.files?.[0])} required type="file" />
      </Field>
      <p className="text-xs leading-5 text-text-secondary">
        Files upload directly to object storage. They remain unavailable publicly until verification and approval are complete. SVG, HTML, scripts, archives, and executables are not accepted.
      </p>
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p> : null}
      <button aria-busy={busy} className="button-primary min-h-11 px-5" disabled={busy} type="submit">
        {state === "preparing" ? "Preparing upload…" : state === "uploading" ? "Uploading…" : state === "verifying" ? "Verifying…" : "Upload media"}
      </button>
    </form>
  );
}

function Field({ children, label }: Readonly<{ children: React.ReactNode; label: string }>) {
  return <label className="grid gap-2 text-sm font-semibold"><span>{label}</span>{children}</label>;
}

const inputClass = "min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm";
