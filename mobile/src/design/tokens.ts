export const colors = {
  background: "#FAFAF8",
  surface: "#FFFFFF",
  primary: "#2563EB",
  primaryPressed: "#1D4ED8",
  violet: "#7C3AED",
  teal: "#14B8A6",
  text: "#171717",
  textMuted: "#5F6368",
  border: "#E5E7EB",
  danger: "#B91C1C",
  mapMarker: "#2563EB",
  userMarker: "#14B8A6",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const typography = {
  hero: { fontSize: 38, lineHeight: 44, fontWeight: "800" as const },
  title: { fontSize: 28, lineHeight: 34, fontWeight: "800" as const },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: "700" as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
  label: { fontSize: 15, lineHeight: 20, fontWeight: "700" as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "500" as const },
} as const;
