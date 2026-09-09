export type NativePurchasePlatform = "ios" | "android";

export type NativePurchaseAvailability = Readonly<{
  available: false;
  reason: "native-store-billing-pending";
  followUpIssue: 108;
}>;

export function getNativePurchaseAvailability(
  _platform: NativePurchasePlatform,
): NativePurchaseAvailability {
  return {
    available: false,
    reason: "native-store-billing-pending",
    followUpIssue: 108,
  };
}
