import type { MediaAssetRow } from "@/db/schema";
import { locales } from "@/lib/i18n";
import { MEDIA_PURPOSES, type MediaEntityType } from "@/lib/media/types";
import { attachMediaAction, detachMediaAction } from "@/app/admin/(protected)/media-actions";

type EntityMediaRow = Readonly<{
  attachment: Readonly<{
    id: number;
    purpose: string;
    locale: string;
    position: number;
  }>;
  asset: MediaAssetRow;
}>;

export function MediaAttachmentPanel({
  assets,
  attachments,
  entityId,
  entityType,
  readOnly = false,
}: Readonly<{
  assets: readonly (MediaAssetRow & { usageCount: number })[];
  attachments: readonly EntityMediaRow[];
  entityId: number;
  entityType: MediaEntityType;
  readOnly?: boolean;
}>) {
  return (
    <section className="surface-card mt-6 p-5 sm:p-7">
      <h2 className="text-lg font-bold">Media attachments</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Only approved attachments are public. Pending media can be prepared here without replacing legacy media.
      </p>
      {attachments.length > 0 ? (
        <ul className="mt-5 divide-y divide-border rounded-xl border border-border">
          {attachments.map(({ attachment, asset }) => (
            <li className="flex flex-wrap items-center justify-between gap-3 p-4" key={attachment.id}>
              <span className="text-sm"><strong>{asset.originalFilename}</strong><span className="ml-2 text-text-secondary">{attachment.purpose}{attachment.locale ? ` · ${attachment.locale}` : ""} · #{attachment.position}</span></span>
              {!readOnly ? <form action={detachMediaAction.bind(null, entityType, entityId, attachment.id)}>
                <button className="text-sm font-bold text-red-700" type="submit">Detach</button>
              </form> : null}
            </li>
          ))}
        </ul>
      ) : <p className="mt-5 text-sm text-text-secondary">No CMS media attached.</p>}
      {!readOnly ? <form action={attachMediaAction.bind(null, entityType, entityId)} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <select aria-label="Media asset" className={inputClass} name="mediaAssetId" required>
          <option value="">Select media</option>
          {assets.filter(({ approvalStatus }) => approvalStatus !== "archived").map((asset) => (
            <option key={asset.id} value={asset.id}>{asset.originalFilename} · {asset.kind} · {asset.approvalStatus}</option>
          ))}
        </select>
        <select aria-label="Media purpose" className={inputClass} name="purpose">
          {MEDIA_PURPOSES.map((purpose) => <option key={purpose}>{purpose}</option>)}
        </select>
        <select aria-label="Attachment locale" className={inputClass} name="locale">
          <option value="">Locale-neutral</option>
          {locales.map((locale) => <option key={locale}>{locale}</option>)}
        </select>
        <input aria-label="Position" className={inputClass} defaultValue={0} min={0} name="position" type="number" />
        <button className="button-secondary min-h-11 px-4" type="submit">Attach media</button>
      </form> : null}
    </section>
  );
}

const inputClass = "min-h-11 rounded-xl border border-border bg-white px-3 text-sm";
