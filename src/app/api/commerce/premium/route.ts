import { CITYWALK_PREMIUM_ENTITLEMENT } from "@citywalk/traveler-core";

import { getAuth } from "@/lib/auth/server";
import { hasPremiumAccess } from "@/lib/commerce/premiumAccess.server";

export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, {
  status,
  headers: { "Cache-Control": "private, no-store" },
});

export async function GET(request: Request) {
  try {
    const session = await getAuth().api.getSession({ headers: request.headers });
    const expectedAccount = request.headers.get("X-Citywalk-Account");
    if (!session?.user.id || expectedAccount !== session.user.id) {
      return json({ error: "ACCOUNT_CHANGED" }, 401);
    }

    return json({
      scopeType: CITYWALK_PREMIUM_ENTITLEMENT.scopeType,
      scopeKey: CITYWALK_PREMIUM_ENTITLEMENT.scopeKey,
      active: await hasPremiumAccess({ userId: session.user.id }),
    });
  } catch {
    return json({ error: "ACCESS_UNAVAILABLE" }, 503);
  }
}
