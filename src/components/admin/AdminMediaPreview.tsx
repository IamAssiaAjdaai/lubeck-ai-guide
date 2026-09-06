"use client";

import type { MediaKind } from "@/lib/media/types";

export function AdminMediaPreview({
  externalProvider,
  externalVideoId,
  kind,
  previewUrl,
}: Readonly<{
  externalProvider?: "youtube" | "vimeo";
  externalVideoId?: string;
  kind: MediaKind;
  previewUrl?: string;
}>) {
  if (!previewUrl) return <p className="text-sm text-text-secondary">Preview becomes available after upload finalization.</p>;
  if (externalProvider && externalVideoId) {
    const src = externalProvider === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${externalVideoId}`
      : `https://player.vimeo.com/video/${externalVideoId}`;
    return <iframe allow="fullscreen; picture-in-picture" className="aspect-video w-full rounded-xl border-0" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation" src={src} title="Approved external video preview" />;
  }
  if (kind === "image") {
    // Signed, short-lived admin URLs cannot be enumerated in static Next image configuration.
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="Admin media preview" className="max-h-[32rem] w-full rounded-xl object-contain" src={previewUrl} />;
  }
  if (kind === "audio") return <audio className="w-full" controls preload="metadata" src={previewUrl}>Audio preview is unavailable.</audio>;
  if (kind === "video") return <video className="max-h-[32rem] w-full rounded-xl bg-black" controls preload="metadata" src={previewUrl}>Video preview is unavailable.</video>;
  return <a className="font-bold text-primary" href={previewUrl} rel="noreferrer" target="_blank">Open PDF preview</a>;
}
