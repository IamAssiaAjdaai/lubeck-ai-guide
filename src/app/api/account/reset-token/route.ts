import { getAuth } from "@/lib/auth/server";
import { lifecycleBody, lifecycleFailure, lifecycleJson } from "@/lib/auth/lifecycle/http.server";
import { limitLifecycle } from "@/lib/auth/lifecycle/rateLimit.server";
export async function POST(request: Request) {
  try {
    const { token } = await lifecycleBody(request);
    if (typeof token !== "string" || !/^[a-zA-Z0-9]{24}$/.test(token)) return lifecycleJson({ valid: false }, 400);
    await limitLifecycle("validate", token);
    const context = await getAuth().$context;
    const record = await context.internalAdapter.findVerificationValue(`reset-password:${token}`);
    const valid = !!record && record.expiresAt > new Date() && !!(await context.internalAdapter.findUserById(record.value));
    return lifecycleJson({ valid }, valid ? 200 : 400);
  } catch (error) { return lifecycleFailure(error); }
}
