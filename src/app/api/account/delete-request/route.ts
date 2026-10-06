import { lifecycleBody, lifecycleFailure, lifecycleJson } from "@/lib/auth/lifecycle/http.server";
import { LifecycleError } from "@/lib/auth/lifecycle/rateLimit.server";
import { requestWebAccountDeletion } from "@/lib/auth/lifecycle/webDeletionRequest.server";

export async function POST(request: Request) {
  try {
    const body = await lifecycleBody(request);
    if (typeof body.email !== "string") throw new LifecycleError("INVALID_REQUEST", 400);
    await requestWebAccountDeletion(body.email);
    // The response is deliberately identical whether or not the address belongs
    // to an account. Only a real account receives a verification email.
    return lifecycleJson({ accepted: true });
  } catch (error) {
    return lifecycleFailure(error);
  }
}
