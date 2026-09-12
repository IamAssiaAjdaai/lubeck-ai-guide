/**
 * Application media is already authorized and streamed by CITYWALK route
 * handlers. Sending those URLs back through Next's image optimizer adds a
 * second server-side fetch and breaks authenticated media because request
 * credentials are not forwarded.
 */
export function isApplicationMediaPath(source: string): boolean {
  return (
    source.startsWith("/api/media/") ||
    source.startsWith("/api/commerce/media/")
  );
}
