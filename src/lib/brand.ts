export const CITYWALK_BRAND = {
  name: "CITYWALK",
  domain: "getcitywalk.com",
  socialHandle: "@getcitywalk",
  tagline: "Explore more. Plan less.",
  colors: {
    navy: "#0E2C44",
    teal: "#019FA3",
    canvas: "#FAFAF8",
    white: "#FFFFFF",
  },
  assets: {
    mark: "/brand/citywalk-mark.svg",
  },
} as const;

export type CitywalkBrand = typeof CITYWALK_BRAND;
