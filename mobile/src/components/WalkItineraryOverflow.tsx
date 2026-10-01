import { useRef, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";

import { uxCopy } from "../design/uxCopy";
import { colors, radius, spacing } from "../design/tokens";
import { refreshCurrentWalk } from "../hooks/useCurrentWalk";
import { removePlaceFromCurrentWalk } from "../lib/walkMembership";
import { useNativeLocale } from "../localization/LocaleProvider";
import {
  AppText,
  PressableSurface,
  PrimaryButton,
  SectionTitle,
  StatusMessage,
} from "./ui";

export function WalkItineraryOverflow({
  citySlug,
  placeSlug,
  placeName,
}: Readonly<{
  citySlug: string;
  placeSlug: string;
  placeName: string;
}>) {
  const { locale, messages } = useNativeLocale();
  const copy = uxCopy(locale);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);

  async function remove() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await removePlaceFromCurrentWalk(citySlug, placeSlug);
      await refreshCurrentWalk(citySlug);
      setOpen(false);
    } catch {
      setError(copy.failed);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <PressableSurface
        accessibilityRole="button"
        accessibilityLabel={copy.remove + ": " + placeName}
        onPress={() => {
          setError("");
          setOpen(true);
        }}
        style={styles.more}
      >
        <AppText variant="heading" style={styles.moreText}>⋯</AppText>
      </PressableSurface>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => !busy && setOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <SectionTitle>{placeName}</SectionTitle>
            {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
            <PressableSurface
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={() => void remove()}
              style={styles.remove}
            >
              <AppText variant="label" style={styles.removeText}>
                {busy ? copy.removing : copy.remove}
              </AppText>
            </PressableSurface>
            <PrimaryButton
              label={messages.close}
              tone="secondary"
              disabled={busy}
              onPress={() => setOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  more: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
  moreText: { color: colors.textMuted, lineHeight: 24 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.32)",
    justifyContent: "flex-end",
    padding: spacing.md,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.hero,
    padding: spacing.lg,
    gap: spacing.md,
  },
  remove: {
    minHeight: 48,
    justifyContent: "center",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.dangerSoft,
  },
  removeText: { color: colors.danger },
});
