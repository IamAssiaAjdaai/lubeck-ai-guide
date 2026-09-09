import { nativeAuthClient } from "../auth/client";
import { createCitywalkApiClient } from "./client";

export const citywalkApi = createCitywalkApiClient({
  getAuthCookie: () => nativeAuthClient.getCookie(),
});
