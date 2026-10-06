import { citywalkApi } from "../api/instance";
import { purgeDeletedAccountLocalData } from "./accountLocalData";
import { nativeAuthClient } from "./client";

export async function deleteNativeAccount(userId: string, password?: string) {
  const response = await citywalkApi.fetchAuthenticated("/api/account/delete", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Citywalk-Account": userId },
    body: JSON.stringify({ ...(password ? { password } : {}), confirm: true }),
  });
  const result = await response.json();
  if (!response.ok || result.deleted !== true) return { error: { code: result.code ?? "UNAVAILABLE" } };

  // The server deletion is already committed. Clear traveler state from this
  // device before auth cleanup, but never misreport a committed deletion as a
  // failed account delete if device storage is temporarily unavailable.
  try { await purgeDeletedAccountLocalData(userId); } catch { /* Account remains deleted; auth cleanup still must run. */ }

  // Better Auth's Expo integration clears SecureStore auth cookies/session cache
  // before signOut sends its request, even when that request fails. The server
  // has already revoked every session, so cleanup here is best effort only.
  try { await nativeAuthClient.signOut(); } catch { /* Retry local auth cleanup below. */ }
  try { await nativeAuthClient.getSession(); } catch { /* Offline after server deletion. */ }
  return {};
}
