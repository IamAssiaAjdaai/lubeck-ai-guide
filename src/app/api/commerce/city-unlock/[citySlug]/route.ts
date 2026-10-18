import { CITYWALK_CITY_PASS_72H } from "@citywalk/traveler-core";
import { hasLaunchCityAccess } from "@/lib/commerce/launchPolicy.server";
import { getAuth } from "@/lib/auth/server";
import { resolveCitywalkPaidAccess } from "@/lib/commerce/premiumAccess.server";
import { NativeBillingError } from "@/lib/commerce/native/config.server";
import { nativeBody, nativeFailure, nativeJson, nativeUser, limitNativeVerification } from "@/lib/commerce/native/http.server";
import { verifyAndDeliver } from "@/lib/commerce/native/service.server";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function GET(request: Request, { params }: { params: Promise<{ citySlug: string }> }) {
  try {
    const { citySlug } = await params;
    const cityPass = citySlug === "lubeck" ? CITYWALK_CITY_PASS_72H.lubeck : undefined;
    if (!cityPass) return json({ error: "UNKNOWN_CITY_PRODUCT" }, 404);
    const session = await getAuth().api.getSession({ headers: request.headers });
    // Expected account is a race guard, never authority for ownership.
    if (request.headers.get("X-Citywalk-Account") !== (session?.user.id ?? null)) return json({ error: "ACCOUNT_CHANGED" }, 401);
    const launchFree = hasLaunchCityAccess(citySlug);
    const access = launchFree ? { tier: "free", premium: false, cityPass: false } : await resolveCitywalkPaidAccess({ userId: session?.user.id, citySlug });
    return json({
      citySlug,
      scopeType: cityPass.scopeType,
      scopeKey: cityPass.scopeKey,
      tier: launchFree && access.tier === "free" ? "launch_free" : access.tier,
      active: launchFree || access.tier !== "free",
    });
  } catch { return json({ error: "ACCESS_UNAVAILABLE" }, 503); }
}
export async function POST(request: Request, { params }: { params: Promise<{ citySlug: string }> }) {
  try {
    if ((await params).citySlug !== "lubeck") throw new NativeBillingError("INVALID_PURCHASE", 404);
    const userId = await nativeUser(request);
    await limitNativeVerification(userId);
    const body = await nativeBody(request);
    if (Object.keys(body).some(key => key !== "store" && key !== "proof") || (body.store !== "apple" && body.store !== "google") || typeof body.proof !== "string" || !body.proof.length || body.proof.length > 24000) throw new NativeBillingError("INVALID_PURCHASE", 400);
    return nativeJson(await verifyAndDeliver(userId, body.store, body.proof));
  } catch (error) { return nativeFailure(error); }
}
