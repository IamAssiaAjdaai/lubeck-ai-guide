export function externalRequestOrigin(request: Request) {
  const internal = new URL(request.url);
  const host = request.headers.get("host")?.trim();
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",", 1)[0]
    ?.trim()
    .toLowerCase();

  const protocol =
    forwardedProto === "http" || forwardedProto === "https"
      ? `${forwardedProto}:`
      : internal.protocol;

  if (!host) return internal.origin;

  try {
    return new URL(`${protocol}//${host}`).origin;
  } catch {
    return internal.origin;
  }
}
