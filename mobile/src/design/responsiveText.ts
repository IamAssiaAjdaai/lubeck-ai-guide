import { useWindowDimensions } from "react-native";
import { layout, spacing } from "./tokens";

// Scale only layout decisions. Native Text applies the system font scale itself.
export function textLayout(width: number, fontScale = 1) {
  const contentWidth = Math.min(width, layout.contentWidth) - 2 * (width <= layout.smallPhone ? spacing.md : spacing.lg);
  const effectiveWidth = contentWidth / fontScale;
  const expanded = fontScale > 1.05 || effectiveWidth < 260;
  const quickColumns = !expanded ? 4 : effectiveWidth >= 135 ? 2 : 1;
  return {
    quickColumns,
    quickWidth: (contentWidth - spacing.sm * (quickColumns - 1)) / quickColumns,
    expanded,
    categoryColumns: expanded ? 2 : 4,
  };
}

export function useResponsiveTextLayout() {
  const { width, fontScale } = useWindowDimensions();
  return textLayout(width, fontScale);
}
