import "server-only";

export async function captureVerifiedEntitlementGrant(
  input: Readonly<{
    scopeType: "city" | "feature";
    scopeKey: string;
    durationDays: number | null;
  }>,
  environment: Readonly<Record<string, string | undefined>> = process.env,
  send: typeof fetch = fetch,
): Promise<void> {
  const token = environment.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const rawHost = environment.NEXT_PUBLIC_POSTHOG_HOST;
  if (!token || !rawHost) return;
  let endpoint: URL;
  try {
    endpoint = new URL("/capture/", rawHost);
  } catch {
    return;
  }
  if (endpoint.protocol !== "https:") return;

  try {
    await send(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: token,
        event: "entitlement_granted",
        properties: {
          distinct_id: "citywalk-commerce",
          entitlement_scope: `${input.scopeType}:${input.scopeKey}`,
          pass_duration_hours:
            input.durationDays === null ? "permanent" : input.durationDays * 24,
        },
      }),
    });
  } catch {
    // Analytics delivery must never affect an entitlement transaction.
  }
}

