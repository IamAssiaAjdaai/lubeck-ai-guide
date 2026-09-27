import { AUTH_MAX_PASSWORD_LENGTH } from "@citywalk/traveler-core";
import { getAuth } from "@/lib/auth/server";
import { deleteTravelerAccount } from "@/lib/auth/lifecycle/deleteAccount.server";
import { lifecycleBody, lifecycleFailure, lifecycleJson } from "@/lib/auth/lifecycle/http.server";
import { limitLifecycle, LifecycleError } from "@/lib/auth/lifecycle/rateLimit.server";

export async function POST(request: Request) {
  try {
    const body = await lifecycleBody(request);
    const auth = getAuth();
    const current = await auth.api.getSession({ headers: request.headers });
    if (!current || request.headers.get("X-Citywalk-Account") !== current.user.id) throw new LifecycleError("REAUTH_REQUIRED", 401);
    await limitLifecycle("delete", current.user.id);
    if (body.confirm !== true || typeof body.password !== "string" || !body.password || body.password.length > AUTH_MAX_PASSWORD_LENGTH) throw new LifecycleError("INVALID_REQUEST", 400);
    const context = await auth.$context;
    await deleteTravelerAccount({ userId: current.user.id, sessionId: current.session.id, password: body.password, verify: context.password.verify });
    // Return only after commit. The native client then uses the existing Expo
    // signOut hook to clear authentication cookies/cache, never AsyncStorage data.
    return lifecycleJson({ deleted: true });
  } catch (error) { return lifecycleFailure(error); }
}
