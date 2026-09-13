import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { formatAudioTime } from "../lib/audio";
import { colors, spacing } from "../design/tokens";
import { useNativeLocale } from "../localization/LocaleProvider";
import { AppText, Card, PrimaryButton, StatusMessage } from "./ui";

type NativeAudioPlayerProps = Readonly<{
  source: string;
  title: string;
  durationSeconds?: number;
}>;

export function NativeAudioPlayer({
  source,
  title,
  durationSeconds,
}: NativeAudioPlayerProps) {
  const { messages } = useNativeLocale();
  const player = useAudioPlayer({ uri: source }, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [actionError, setActionError] = useState(false);
  const duration = positiveDuration(status.duration) ??
    positiveDuration(durationSeconds) ?? 0;
  const currentTime = Math.min(Math.max(status.currentTime, 0), duration || Infinity);
  const ended = status.didJustFinish || (duration > 0 && currentTime >= duration - 0.25);

  async function togglePlayback() {
    setActionError(false);
    try {
      if (status.playing) {
        player.pause();
        return;
      }
      if (ended) await player.seekTo(0);
      player.play();
    } catch {
      setActionError(true);
    }
  }

  if (status.error || actionError) {
    return <StatusMessage>{messages.audioUnavailable}</StatusMessage>;
  }

  const busy = !status.isLoaded || status.isBuffering;
  const actionLabel = ended
    ? messages.replayAudio
    : status.playing
      ? messages.pauseAudio
      : messages.playAudio;

  return (
    <Card>
      <View accessible accessibilityLabel={title} style={styles.row}>
        <AppText variant="heading">{messages.audioGuide}</AppText>
        <AppText variant="caption" style={styles.time}>
          {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
        </AppText>
      </View>
      <PrimaryButton
        label={busy ? messages.loadingAudio : actionLabel}
        accessibilityLabel={`${actionLabel}: ${title}`}
        accessibilityState={{ busy, disabled: busy }}
        busy={busy}
        onPress={() => void togglePlayback()}
      />
    </Card>
  );
}

function positiveDuration(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  time: { color: colors.textMuted },
});
