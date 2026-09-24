import "server-only";
import { getAuth } from "./server";

/** Optional personalization never grants access on failed session verification. */
export async function getPublicSession(headers: Headers) {
  const cookie = headers.get("cookie") ?? "";
  if (!/(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=/.test(cookie) && !headers.has("authorization")) {
    return null;
  }
  try {
    return await getAuth().api.getSession({ headers });
  } catch {
    console.warn("CITYWALK optional session unavailable; premium access remains locked.");
    return null;
  }
}
