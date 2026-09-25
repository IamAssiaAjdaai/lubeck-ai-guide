export const colors = {
  background: "#FBFDFF",
  surface: "#FFFFFF",
  surfaceMuted: "#F2F7FC",
  surfaceRaised: "#FFFFFF",
  primary: "#155CAF",
  primaryPressed: "#0757A8",
  primarySoft: "#EAF3FC",
  violet: "#0967C8",
  violetSoft: "#EAF3FC",
  teal: "#14B8A6",
  tealSoft: "#E4F7F3",
  text: "#09234D",
  textMuted: "#61748C",
  textSubtle: "#657B98",
  border: "#DCE6F0",
  borderStrong: "#CBD9E7",
  danger: "#B91C1C",
  dangerSoft: "#FEF2F2",
  success: "#218653",
  successSoft: "#ECFDF5",
  warning: "#9A6700",
  warningSoft: "#FFF7E0",
  mapMarker: "#155CAF",
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
  sm: 12,
  md: 16,
  lg: 22,
  hero: 24,
  pill: 999,
} as const;

export const typography = {
  hero: {
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "800" as const,
    letterSpacing: -0.8,
  },
  screenTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700" as const,
    letterSpacing: -0.45,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700" as const,
    letterSpacing: -0.15,
  },
  cardTitle: { fontSize: 18, lineHeight: 23, fontWeight: "700" as const },
  body: { fontSize: 15, lineHeight: 23, fontWeight: "400" as const },
  label: { fontSize: 15, lineHeight: 20, fontWeight: "600" as const },
  metadata: { fontSize: 13, lineHeight: 18, fontWeight: "500" as const },
  caption: { fontSize: 11, lineHeight: 16, fontWeight: "500" as const },
} as const;

export const motion = {
  press: 96,
  component: 220,
  screen: 280,
} as const;

// Mirrors the final V2 CSS cascade in src/app/globals.css.
export const layout = {
  contentWidth: 480,
  smallPhone: 360,
  navigationHeight: 64,
  heroHeight: 180,
  cityHeroHeight: 218,
  timeCardHeight: 150,
  itineraryPhoto: 60,
} as const;
export const shadows = {
  card: {
    shadowColor: colors.text,
    shadowOpacity: 0.045,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
} as const;
