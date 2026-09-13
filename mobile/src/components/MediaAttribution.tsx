import { Fragment } from "react";
import { Linking, StyleSheet, Text } from "react-native";

import type { PublicMediaAttribution } from "../lib/api/contracts";
import { formatMediaAttribution } from "../lib/mediaAttribution";
import { colors, spacing } from "../design/tokens";
import { AppText } from "./ui";

export function MediaAttribution({
  attribution,
}: Readonly<{ attribution?: PublicMediaAttribution }>) {
  if (!attribution) return null;

  const segments = formatMediaAttribution(attribution);
  if (segments.length === 0) return null;

  return (
    <AppText variant="caption" style={styles.attribution}>
      {segments.map((segment, index) => (
        <Fragment key={`${segment.label}-${segment.url ?? "text"}-${index}`}>
          {index > 0 ? " · " : null}
          {segment.url ? (
            <Text
              accessibilityRole="link"
              onPress={() => void Linking.openURL(segment.url!)}
              style={styles.link}
              suppressHighlighting={false}
            >
              {segment.label}
            </Text>
          ) : segment.label}
        </Fragment>
      ))}
    </AppText>
  );
}

const styles = StyleSheet.create({
  attribution: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  link: {
    color: colors.textMuted,
    textDecorationLine: "underline",
  },
});
