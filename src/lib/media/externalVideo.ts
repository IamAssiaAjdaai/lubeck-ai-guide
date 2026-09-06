import {
  MediaValidationError,
  type ExternalVideoProvider,
} from "@/lib/media/types";

export type CanonicalExternalVideo = Readonly<{
  provider: ExternalVideoProvider;
  videoId: string;
  canonicalUrl: string;
}>;

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^[0-9]{6,12}$/;

export function parseExternalVideoUrl(value: string): CanonicalExternalVideo {
  if (/[<>]/.test(value)) {
    throw new MediaValidationError("Raw embed HTML is not allowed.");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new MediaValidationError("External video URL is invalid.");
  }
  if (url.protocol !== "https:") {
    throw new MediaValidationError("External video URL must use HTTPS.");
  }
  if (url.username || url.password) {
    throw new MediaValidationError("External video URL must not contain credentials.");
  }
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be") {
    return youtube(url.pathname.slice(1));
  }
  if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) {
    if (url.pathname === "/watch") return youtube(url.searchParams.get("v") ?? "");
    const match = url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/);
    if (match) return youtube(match[1] ?? "");
  }
  if (["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)) {
    const match = url.pathname.match(/^(?:\/video)?\/([0-9]+)\/?$/);
    if (match) return vimeo(match[1] ?? "");
  }
  throw new MediaValidationError("External video provider is not allowed.");
}

function youtube(videoId: string): CanonicalExternalVideo {
  if (!YOUTUBE_ID.test(videoId)) throw new MediaValidationError("YouTube video ID is invalid.");
  return { provider: "youtube", videoId, canonicalUrl: `https://www.youtube.com/watch?v=${videoId}` };
}

function vimeo(videoId: string): CanonicalExternalVideo {
  if (!VIMEO_ID.test(videoId)) throw new MediaValidationError("Vimeo video ID is invalid.");
  return { provider: "vimeo", videoId, canonicalUrl: `https://vimeo.com/${videoId}` };
}
