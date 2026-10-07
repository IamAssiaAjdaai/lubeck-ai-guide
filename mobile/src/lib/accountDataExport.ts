import { citywalkApi } from "./api/instance";

export async function fetchNativeAccountDataExport(userId: string): Promise<string> {
  const response = await citywalkApi.fetchAuthenticated("/api/account/export", {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Citywalk-Account": userId,
    },
  });
  if (!response.ok) throw new Error("CITYWALK account data export unavailable.");

  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error("CITYWALK account data export unavailable.");
  }
  if (!value || typeof value !== "object" ||
      (value as { format?: unknown }).format !== "citywalk-account-data" ||
      (value as { version?: unknown }).version !== 1) {
    throw new Error("CITYWALK account data export unavailable.");
  }
  return JSON.stringify(value, null, 2) + "\n";
}
