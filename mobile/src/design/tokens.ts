export const colors = {
  background: "#FAFAF8",
  surface: "#FFFFFF",
  surfaceMuted: "#F0F2EE",
  surfaceRaised: "#FCFCFA",
  primary: "#2563EB",
  primaryPressed: "#1D4ED8",
  primarySoft: "#E8F0FF",
  violet: "#7C3AED",
  violetSoft: "#F1EAFE",
  teal: "#14B8A6",
  tealSoft: "#E4F7F3",
  text: "#171717",
  textMuted: "#5F6368",
  textSubtle: "#7A7F85",
  border: "#E5E7EB",
  borderStrong: "#CDD2D8",
  danger: "#B91C1C",
  dangerSoft: "#FEF2F2",
  success: "#087F5B",
  successSoft: "#E7F6EF",
  warning: "#9A6700",
  warningSoft: "#FFF7E0",
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
  sm: 8,
  md: 14,
  lg: 22,
  hero: 28,
  pill: 999,
} as const;

export const typography = {
  hero: { fontSize: 40, lineHeight: 45, fontWeight: "800" as const, letterSpacing: -0.8 },
  screenTitle: { fontSize: 30, lineHeight: 36, fontWeight: "700" as const, letterSpacing: -0.45 },
  title: { fontSize: 27, lineHeight: 33, fontWeight: "700" as const, letterSpacing: -0.3 },
  heading: { fontSize: 21, lineHeight: 27, fontWeight: "700" as const, letterSpacing: -0.15 },
  cardTitle: { fontSize: 18, lineHeight: 23, fontWeight: "700" as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
  label: { fontSize: 15, lineHeight: 20, fontWeight: "600" as const },
  metadata: { fontSize: 14, lineHeight: 19, fontWeight: "500" as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: "500" as const },
} as const;

export const motion = {
  press: 96,
  component: 220,
  screen: 280,
} as const;
