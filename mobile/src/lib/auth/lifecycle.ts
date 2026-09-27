import { citywalkApi } from "../api/instance";
import { nativeAuthClient } from "./client";

export async function deleteNativeAccount(userId: string, password: string) {
  const response = await citywalkApi.fetchAuthenticated("/api/account/delete", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Citywalk-Account": userId },
    body: JSON.stringify({ password, confirm: true }),
  });
  const result = await response.json();
  if (!response.ok || result.deleted !== true) return { error: { code: result.code ?? "UNAVAILABLE" } };
  // Expo 1.7.2 clears SecureStore auth cookies/session cache before signOut sends
  // its request, even when that request fails. No traveler storage is touched.
  // The server has already revoked every session; never call that a failed delete.
  try { await nativeAuthClient.signOut(); } catch { /* Retry local auth cleanup below. */ }
  // Refresh is best effort; the Expo signOut hook has already cleared local auth.
  try { await nativeAuthClient.getSession(); } catch { /* Offline after server deletion. */ }
  return {};
}
