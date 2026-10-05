import { citywalkApi } from "../api/instance";
import { clearDeletedAccountLocalData } from "./accountDeletionStorage";
import { nativeAuthClient } from "./client";

export async function deleteNativeAccount(userId: string, password: string) {
  const response = await citywalkApi.fetchAuthenticated("/api/account/delete", {
    method: "POST", headers: { "Content-Type": "application/json", "X-Citywalk-Account": userId },
    body: JSON.stringify({ password, confirm: true }),
  });
  const result = await response.json();
  if (!response.ok || result.deleted !== true) return { error: { code: result.code ?? "UNAVAILABLE" } };

  // The server deletion is already committed. Local cleanup is therefore best
  // effort and must never turn a successful hard delete into a false failure.
  try { await clearDeletedAccountLocalData(userId); } catch { /* Device storage unavailable. */ }

  // Expo clears SecureStore auth cookies/session cache before signOut sends its
  // request, even when that request fails. The server has revoked every session.
  try { await nativeAuthClient.signOut(); } catch { /* Local auth cleanup already attempted. */ }
  try { await nativeAuthClient.getSession(); } catch { /* Offline after server deletion. */ }
  return {};
}
