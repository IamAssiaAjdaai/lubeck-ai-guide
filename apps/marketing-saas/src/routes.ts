/** Only this finite product destination can survive login. No arbitrary URL redirects. */
export const workspaceViews = ["overview", "campaigns", "contents", "projects", "media", "usage"] as const;
export function safeWorkspaceDestination(value: string | null): string {
  if (!value || /[\\\r\n]/.test(value) || !value.startsWith("/workspace") || value.startsWith("//")) return "/workspace";
  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid" || url.pathname !== "/workspace" || url.hash) return "/workspace";
    const view = url.searchParams.get("view");
    return workspaceViews.includes(view as typeof workspaceViews[number]) ? `/workspace?view=${view}` : "/workspace";
  } catch { return "/workspace"; }
}
export function workspaceView(value: string): typeof workspaceViews[number] {
  const view = new URL(value, "https://local.invalid").searchParams.get("view");
  return workspaceViews.includes(view as typeof workspaceViews[number]) ? view as typeof workspaceViews[number] : "overview";
}
