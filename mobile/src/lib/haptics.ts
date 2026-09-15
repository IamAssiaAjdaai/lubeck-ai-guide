import * as Haptics from "expo-haptics";

export type CitywalkHaptic = "light" | "medium" | "success" | "error";

export async function triggerCitywalkHaptic(kind: CitywalkHaptic): Promise<void> {
  try {
    if (kind === "light") {
      await Haptics.selectionAsync();
      return;
    }
    if (kind === "medium") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }
    await Haptics.notificationAsync(
      kind === "success"
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
  } catch {
    // Haptics are enhancement-only and may be unavailable in system settings.
  }
}
