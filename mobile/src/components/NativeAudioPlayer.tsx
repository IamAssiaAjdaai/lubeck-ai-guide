import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { formatAudioTime } from "../lib/audio";
import { colors, radius, spacing } from "../design/tokens";
import { useNativeLocale } from "../localization/LocaleProvider";
import { AppText, Card, PrimaryButton, StatusMessage } from "./ui";
import { NativeIcon } from "./NativeIcon";

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
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  return (
    <Card style={styles.player}>
      <View accessible accessibilityLabel={title} style={styles.header}>
        <View style={styles.audioIcon}>
          <NativeIcon ios="waveform" android="graphic_eq" color={colors.violet} size={22} />
        </View>
        <View style={styles.titleBlock}>
          <AppText variant="heading">{messages.audioGuide}</AppText>
          <AppText variant="caption" style={styles.time}>
            {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
          </AppText>
        </View>
      </View>
      <View accessibilityElementsHidden style={styles.track}>
        <View style={[styles.progress, { width: `${progress * 100}%` }]} />
      </View>
      <PrimaryButton
        label={busy ? messages.loadingAudio : actionLabel}
        accessibilityLabel={`${actionLabel}: ${title}`}
        accessibilityState={{ busy, disabled: busy }}
        busy={busy}
        haptic="light"
        leadingIcon={<NativeIcon ios={status.playing ? "pause.fill" : "play.fill"} android={status.playing ? "pause" : "play_arrow"} color={colors.violet} size={19} />}
        onPress={() => void togglePlayback()}
        tone="secondary"
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
  player: { backgroundColor: colors.violetSoft, borderColor: "transparent" },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  audioIcon: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.pill, height: 44, justifyContent: "center", width: 44 },
  titleBlock: { flex: 1 },
  time: { color: colors.textMuted },
  track: { backgroundColor: "#DDD3F7", borderRadius: radius.pill, height: 4, overflow: "hidden" },
  progress: { backgroundColor: colors.violet, borderRadius: radius.pill, height: "100%" },
});
