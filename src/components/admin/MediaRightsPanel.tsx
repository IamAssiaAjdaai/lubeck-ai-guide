import type { MediaAssetRightsRow } from "@/db/schema";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { MEDIA_RIGHTS_BASES, type MediaRightsStatus } from "@/lib/media/rights";

type FormAction = (formData: FormData) => void | Promise<void>;
type SubmitAction = () => void | Promise<void>;

export function MediaRightsPanel({
  canManage,
  canVerify,
  deleteAction,
  rights,
  rightsStatus,
  saveAction,
  verifyAction,
}: Readonly<{
  canManage: boolean;
  canVerify: boolean;
  deleteAction: SubmitAction;
  rights?: MediaAssetRightsRow;
  rightsStatus: MediaRightsStatus;
  saveAction: FormAction;
  verifyAction: SubmitAction;
}>) {
  return (
    <section className="surface-card mt-6 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Rights and provenance</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Technical approval is separate from legal rights verification.
          </p>
        </div>
        <RightsStatus status={rightsStatus} />
      </div>

      {canManage ? (
        <form action={saveAction} className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label="Rights basis">
            <select
              className={inputClass}
              defaultValue={rights?.rightsBasis ?? ""}
              name="rightsBasis"
              required
            >
              <option disabled value="">Select a basis</option>
              {MEDIA_RIGHTS_BASES.map((basis) => (
                <option key={basis} value={basis}>{basis.replaceAll("_", " ")}</option>
              ))}
            </select>
          </Field>
          <Field label="Creator / photographer">
            <input className={inputClass} defaultValue={rights?.creator ?? ""} name="creator" />
          </Field>
          <Field label="Rights holder / supplier">
            <input className={inputClass} defaultValue={rights?.rightsHolder ?? ""} name="rightsHolder" />
          </Field>
          <Field label="Evidence URL or internal reference">
            <input className={inputClass} defaultValue={rights?.evidenceReference ?? ""} name="evidenceReference" required />
          </Field>
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-3 text-sm font-semibold">
            <input defaultChecked={rights?.attributionRequired} name="attributionRequired" type="checkbox" />
            Attribution is required
          </label>
          <Field label="Required attribution text">
            <input className={inputClass} defaultValue={rights?.attributionText ?? ""} name="attributionText" />
          </Field>
          <Field fullWidth label="Internal rights notes">
            <textarea className={inputClass} defaultValue={rights?.rightsNotes ?? ""} name="rightsNotes" rows={4} />
          </Field>
          <p className="text-xs leading-5 text-text-secondary sm:col-span-2">
            Saving a material change removes any previous verification and requires a publisher to verify the rights again.
          </p>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button className="button-primary min-h-11 px-5" type="submit">Save rights metadata</button>
          </div>
        </form>
      ) : (
        <RightsSummary rights={rights} />
      )}

      <dl className="mt-6 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-2">
        <Meta label="Verified at" value={rights?.verifiedAt?.toLocaleString("en") ?? "Not verified"} />
        <Meta label="Verified by" value={rights?.verifiedByUserId ?? "Not verified"} mono />
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        {canVerify && rights && rightsStatus !== "verified" ? (
          <form action={verifyAction}>
            <button className="button-primary min-h-11 px-5" type="submit">Verify rights</button>
          </form>
        ) : null}
        {canManage && rights ? (
          <form action={deleteAction}>
            <ConfirmSubmitButton
              className="min-h-11 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700"
              confirmation="Delete this asset's rights metadata? The media asset itself will not be deleted."
            >
              Delete rights metadata
            </ConfirmSubmitButton>
          </form>
        ) : null}
      </div>
    </section>
  );
}

function RightsStatus({ status }: Readonly<{ status: MediaRightsStatus }>) {
  const color = status === "verified"
    ? "bg-emerald-50 text-emerald-700"
    : status === "incomplete"
      ? "bg-amber-50 text-amber-800"
      : "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${color}`}>
      Rights {status}
    </span>
  );
}

function RightsSummary({ rights }: Readonly<{ rights?: MediaAssetRightsRow }>) {
  if (!rights) {
    return <p className="mt-5 text-sm text-text-secondary">No rights provenance has been recorded.</p>;
  }
  return (
    <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
      <Meta label="Rights basis" value={rights.rightsBasis.replaceAll("_", " ")} />
      <Meta label="Creator / photographer" value={rights.creator ?? "Not recorded"} />
      <Meta label="Rights holder / supplier" value={rights.rightsHolder ?? "Not recorded"} />
      <Meta label="Attribution" value={rights.attributionRequired ? rights.attributionText ?? "Required but missing" : "Not required"} />
      <Meta label="Evidence" value={rights.evidenceReference ?? "Not recorded"} />
      <Meta label="Internal notes" value={rights.rightsNotes ?? "None"} />
    </dl>
  );
}

function Field({
  children,
  fullWidth,
  label,
}: Readonly<{ children: ReactNode; fullWidth?: boolean; label: string }>) {
  return (
    <label className={`grid gap-2 text-sm font-semibold ${fullWidth ? "sm:col-span-2" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Meta({
  label,
  mono,
  value,
}: Readonly<{ label: string; mono?: boolean; value: string }>) {
  return (
    <div>
      <dt className="font-semibold text-text-secondary">{label}</dt>
      <dd className={`mt-1 break-words ${mono ? "font-mono text-xs" : "font-medium"}`}>{value}</dd>
    </div>
  );
}

const inputClass = "min-h-11 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-blue-100";
import type { ReactNode } from "react";
