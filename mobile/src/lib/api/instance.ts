import { nativeAuthClient } from "../auth/client";
import { getNativeVisitorId } from "../visitorIdentity";
import { createCitywalkApiClient } from "./client";

export const citywalkApi = createCitywalkApiClient({
  getAuthCookie: () => nativeAuthClient.getCookie(),
  getVisitorId: getNativeVisitorId,
});
