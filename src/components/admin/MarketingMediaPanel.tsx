import {
  attachMarketingContentMediaAction,
  detachMarketingContentMediaAction,
} from "@/app/admin/(protected)/marketing/actions";

type AvailableMarketingMedia = Readonly<{
  id: number;
  assetKey: string;
  originalFilename: string;
  kind: string;
}>;

type AttachedMarketingMedia = Readonly<{
  id: number;
  mediaAssetId: number;
  originalFilename: string;
  kind: string;
  position: number;
}>;

export function MarketingMediaPanel({
  attached,
  available,
  canEdit,
  cityId,
  contentId,
}: Readonly<{
  attached: readonly AttachedMarketingMedia[];
  available: readonly AvailableMarketingMedia[];
  canEdit: boolean;
  cityId: number;
  contentId: number;
}>) {
  const attachedIds = new Set(attached.map(({ mediaAssetId }) => mediaAssetId));
  const selectable = available.filter(({ id }) => !attachedIds.has(id));

  return (
    <section className="surface-card mt-6 p-5 sm:p-7">
      <h2 className="text-lg font-bold">Social media assets</h2>
      <p className="mt-2 text-sm leading-6 text-text-secondary">
        Attach approved public images or videos from this city. Their order is
        preserved for later publishing automation.
      </p>

      {attached.length > 0 ? (
        <ul className="mt-5 divide-y divide-border rounded-xl border border-border">
          {attached.map((asset) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 p-4"
              key={asset.id}
            >
              <span className="text-sm">
                <strong>{asset.originalFilename}</strong>
                <span className="ml-2 text-text-secondary">
                  {asset.kind} · #{asset.position}
                </span>
              </span>
              {canEdit ? (
                <form
                  action={detachMarketingContentMediaAction.bind(
                    null,
                    contentId,
                    asset.id,
                  )}
                >
                  <input name="cityId" type="hidden" value={cityId} />
                  <button
                    className="text-sm font-bold text-red-700"
                    type="submit"
                  >
                    Detach
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-text-secondary">
          No media attached to this social draft yet.
        </p>
      )}

      {canEdit ? (
        selectable.length > 0 ? (
          <form
            action={attachMarketingContentMediaAction.bind(null, contentId)}
            className="mt-5 flex flex-wrap gap-3"
          >
            <input name="cityId" type="hidden" value={cityId} />
            <select
              aria-label="Marketing media asset"
              className={inputClass}
              name="mediaAssetId"
              required
            >
              <option value="">Select approved media</option>
              {selectable.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.originalFilename} · {asset.kind}
                </option>
              ))}
            </select>
            <button
              className="button-secondary min-h-11 px-4"
              type="submit"
            >
              Attach media
            </button>
          </form>
        ) : (
          <p className="mt-5 text-sm text-text-secondary">
            No additional approved public image or video is available for this
            city.
          </p>
        )
      ) : null}
    </section>
  );
}

const inputClass =
  "min-h-11 min-w-64 rounded-xl border border-border bg-white px-3 text-sm";
