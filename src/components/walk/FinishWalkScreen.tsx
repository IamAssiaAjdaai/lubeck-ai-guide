"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { SavedRoute } from "@citywalk/traveler-core";
import { authClient } from "@/lib/auth/client";
import type { DiscoveryPlace } from "@/components/travel/PlaceDiscovery";
import { formatMessage, type Locale } from "@/lib/i18n";
import { formatDistance } from "@/lib/distance";
import { walkCopy } from "@/lib/walk/copy";
import { Itinerary } from "./RouteSummary";
import { buildSharedWalkHandoffPath } from "@/lib/nativeAppHandoff";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const messages = {
  en: {
    create: "Create share link", creating: "Creating link…", shareLink: "Share link",
    copy: "Copy link", copied: "Link copied", ready: "Public link ready. Only the ordered route is shared.",
    signIn: "Sign in to create a link. Save your walk before leaving this screen.",
    unavailable: "Couldn't create or verify a public link. Please try again.",
    secure: "Sharing requires an HTTPS connection.",
    noRoute: "No complete route is available to share.",
    copyFailed: "Copy isn't available. Select the link below to copy it manually.",
    sheetFailed: "Share sheet wasn't completed. You can copy the link below.",
  },
  de: {
    create: "Freigabelink erstellen", creating: "Link wird erstellt…", shareLink: "Link teilen",
    copy: "Link kopieren", copied: "Link kopiert", ready: "Öffentlicher Link bereit. Nur die Reihenfolge der Route wird geteilt.",
    signIn: "Melde dich an, um einen Link zu erstellen. Speichere vorher deinen Spaziergang.",
    unavailable: "Der öffentliche Link konnte nicht erstellt oder geprüft werden. Bitte erneut versuchen.",
    secure: "Teilen ist nur über HTTPS möglich.",
    noRoute: "Es ist keine vollständige Route zum Teilen verfügbar.",
    copyFailed: "Kopieren nicht möglich. Du kannst den Link unten manuell kopieren.",
    sheetFailed: "Teilen wurde nicht abgeschlossen. Du kannst den Link unten kopieren.",
  },
  fr: {
    create: "Créer un lien de partage", creating: "Création du lien…", shareLink: "Partager le lien",
    copy: "Copier le lien", copied: "Lien copié", ready: "Lien public prêt. Seul l'itinéraire ordonné est partagé.",
    signIn: "Connectez-vous pour créer un lien. Enregistrez d'abord votre balade.",
    unavailable: "Impossible de créer ou vérifier le lien. Réessayez.",
    secure: "Le partage nécessite HTTPS.",
    noRoute: "Aucun itinéraire complet à partager.",
    copyFailed: "Copie indisponible. Sélectionnez le lien ci-dessous.",
    sheetFailed: "Partage non terminé. Vous pouvez copier le lien ci-dessous.",
  },
  ar: {
    create: "إنشاء رابط المشاركة", creating: "جارٍ إنشاء الرابط…", shareLink: "مشاركة الرابط",
    copy: "نسخ الرابط", copied: "تم نسخ الرابط", ready: "الرابط العام جاهز. تتم مشاركة المسار المرتب فقط.",
    signIn: "سجّل الدخول لإنشاء رابط. احفظ جولتك أولاً.",
    unavailable: "تعذّر إنشاء الرابط أو التحقق منه. حاول مجدداً.",
    secure: "تتطلب المشاركة اتصال HTTPS.",
    noRoute: "لا يوجد مسار مكتمل للمشاركة.",
    copyFailed: "النسخ غير متاح. يمكنك تحديد الرابط ونسخه يدوياً.",
    sheetFailed: "لم تكتمل المشاركة. يمكنك نسخ الرابط أدناه.",
  },
} as const;

export default function FinishWalkScreen({
  locale,
  citySlug,
  cityName,
  visited,
  shareRoute,
  historyDistance,
  elapsedMinutes,
  save,
  setMessage,
  feedback,
  customize,
}: {
  locale: Locale;
  citySlug: string;
  cityName: string;
  visited: DiscoveryPlace[];
  shareRoute?: SavedRoute;
  historyDistance: number;
  elapsedMinutes: number;
  save: () => void;
  setMessage: (value: string) => void;
  feedback: (key: string, value: string) => void;
  customize: () => void;
}) {
  const t = walkCopy(locale);
  const c = locale in messages ? messages[locale as keyof typeof messages] : messages.en;
  const [busy, setBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareNotice, setShareNotice] = useState("");

  const createLink = async () => {
    if (busy) return;
    setShareError("");
    setShareNotice("");
    if (!shareRoute) { setShareError(c.noRoute); return; }
    if (window.location.protocol !== "https:") { setShareError(c.secure); return; }
    setBusy(true);
    try {
      const session = await authClient.getSession();
      const userId = session.data?.user?.id;
      if (!userId) { setShareError(c.signIn); return; }
      const response = await fetch("/api/shared-walks", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Citywalk-Account": userId },
        body: JSON.stringify(shareRoute),
      });
      if (response.status === 401) { setShareError(c.signIn); return; }
      if (!response.ok) throw Error("Create failed");
      const data: unknown = await response.json();
      if (!data || typeof data !== "object" || !("id" in data) ||
          typeof data.id !== "string" || !uuid.test(data.id)) throw Error("Invalid share ID");

      // Verify the public endpoint actually serves this exact route, without a session.
      const read = await fetch("/api/shared-walks/" + encodeURIComponent(data.id), {
        cache: "no-store",
        credentials: "omit",
      });
      if (!read.ok) throw Error("Share URL unavailable");
      const confirmed: unknown = await read.json();
      if (!confirmed || typeof confirmed !== "object" || !("route" in confirmed) ||
          !confirmed.route || typeof confirmed.route !== "object" ||
          !("stopSlugs" in confirmed.route) || !("citySlug" in confirmed.route) ||
          confirmed.route.citySlug !== shareRoute.citySlug ||
          JSON.stringify(confirmed.route.stopSlugs) !== JSON.stringify(shareRoute.stopSlugs))
        throw Error("Shared route mismatch");

      const url = new URL(buildSharedWalkHandoffPath(data.id), window.location.origin);
      if (url.protocol !== "https:") throw Error("Insecure URL");
      setShareUrl(url.href);
      setShareNotice(c.ready);
    } catch {
      setShareError(c.unavailable);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      if (!shareUrl || !navigator.clipboard?.writeText) throw Error("Clipboard unavailable");
      await navigator.clipboard.writeText(shareUrl);
      setShareNotice(c.copied);
    } catch { setShareNotice(c.copyFailed); }
  };

  const nativeShare = async () => {
    if (!shareUrl || !navigator.share) return;
    try {
      // Called directly from a tap: Safari requires a fresh user activation.
      await navigator.share({ title: "CITYWALK", url: shareUrl });
      setShareNotice("");
    } catch { setShareNotice(c.sheetFailed); }
  };

  return (
    <>
      <Check size={42} className="finish-check mb-5 text-success" />
      <h2 id="walk-title" className="text-3xl font-bold">
        {formatMessage(t.finished, { city: cityName })}
      </h2>
      <dl className="finish-summary my-6 grid grid-cols-3 gap-3 rounded-2xl bg-surface p-5">
        <div><dt className="text-sm text-text-secondary">{t.placesVisited}</dt><dd className="text-xl font-bold">{visited.length}</dd></div>
        <div><dt className="text-sm text-text-secondary">{t.distance}</dt><dd className="text-xl font-bold">{formatDistance(historyDistance, locale)}</dd></div>
        <div><dt className="text-sm text-text-secondary">{t.timeExplored}</dt><dd className="text-xl font-bold">{formatMessage(t.minutes, { minutes: elapsedMinutes })}</dd></div>
      </dl>
      <h3 className="font-semibold">{t.highlights}</h3>
      {visited.length ? <Itinerary places={visited} /> : <p className="mt-2 text-sm text-text-secondary">{t.noVisited}</p>}
      <button className="button-primary mt-5 w-full" onClick={save}>{t.save}</button>

      {!shareUrl ? (
        <button type="button" className="button-secondary mt-2 w-full" onClick={() => void createLink()} disabled={busy}>
          {busy ? c.creating : c.create}
        </button>
      ) : (
        <section className="mt-3 space-y-2" aria-label={t.share}>
          <label className="block text-sm font-semibold" htmlFor="finished-share-link">{t.share}</label>
          <input id="finished-share-link" className="walk-input w-full" readOnly value={shareUrl}
            onFocus={event => event.currentTarget.select()} />
          {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
            <button type="button" className="button-primary w-full" onClick={() => void nativeShare()}>{c.shareLink}</button>
          ) : null}
          <button type="button" className="button-secondary w-full" onClick={() => void copyLink()}>{c.copy}</button>
        </section>
      )}
      {shareError ? <p role="alert" className="mt-3 text-sm">{shareError}</p> : null}
      {shareNotice ? <p role="status" className="mt-3 text-sm">{shareNotice}</p> : null}

      <fieldset className="mt-6">
        <legend className="font-semibold">{t.rate}</legend>
        <div className="mt-2 flex gap-2">{[1, 2, 3, 4, 5].map(value => (
          <button className="button-secondary min-w-0 flex-1 px-2" key={value}
            onClick={() => feedback("rating", String(value))} aria-label={`${value} / 5`}>{value}</button>
        ))}</div>
      </fieldset>
      <p className="mt-6 font-semibold">{t.fit}</p>
      <div className="mt-3 flex gap-3">
        <button className="button-secondary flex-1" onClick={() => feedback("fit", "yes")}>{t.yes}</button>
        <button className="button-secondary flex-1" onClick={() => feedback("fit", "no")}>{t.no}</button>
      </div>
      <button className="button-secondary mt-5 w-full" onClick={customize}>{t.build}</button>
    </>
  );
}
