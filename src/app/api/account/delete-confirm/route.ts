import { lifecycleBody, lifecycleFailure, lifecycleJson } from "@/lib/auth/lifecycle/http.server";
import { LifecycleError } from "@/lib/auth/lifecycle/rateLimit.server";
import { confirmWebAccountDeletion } from "@/lib/auth/lifecycle/webDeletionRequest.server";

export async function POST(request: Request) {
  try {
    const body = await lifecycleBody(request);
    if (body.confirm !== true || typeof body.token !== "string") {
      throw new LifecycleError("INVALID_REQUEST", 400);
    }
    await confirmWebAccountDeletion(body.token);
    return lifecycleJson({ deleted: true });
  } catch (error) {
    return lifecycleFailure(error);
  }
}
