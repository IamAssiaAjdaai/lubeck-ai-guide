import type { PublicMediaAttribution } from "../lib/api/contracts";
import { colors, spacing } from "../design/tokens";
import { AppText } from "./ui";

export function MediaAttribution({
  attribution,
}: Readonly<{ attribution?: PublicMediaAttribution }>) {
  if (!attribution) return null;
  return (
    <AppText variant="caption" style={{ color: colors.textMuted, marginTop: spacing.xs }}>
      {attribution.text}
    </AppText>
  );
}
