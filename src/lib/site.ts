export const CITYWALK_PUBLIC_ORIGIN = "https://getcitywalk.com" as const;

export function citywalkPublicUrl(pathname = "/"): string {
  return new URL(pathname, CITYWALK_PUBLIC_ORIGIN).toString();
}
