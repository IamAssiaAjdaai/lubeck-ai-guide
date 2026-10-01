import { sandboxContext } from "@/lib/commerce/native/config.server";
import { nativeUser, nativeJson, nativeFailure } from "@/lib/commerce/native/http.server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { return nativeJson(sandboxContext(await nativeUser(request))); }
  catch (error) { return nativeFailure(error); }
}
