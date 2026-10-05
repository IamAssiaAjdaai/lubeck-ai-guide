import { describe, expect, it } from "vitest";

import appJson from "../app.json";

describe("CITYWALK app icon pack", () => {
  it("keeps launcher, adaptive, monochrome, and splash surfaces on the approved brand pack", () => {
    expect(appJson.expo.icon).toBe("./assets/images/icon.png");
    expect(appJson.expo.ios.icon).toBe("./assets/images/icon.png");
    expect(appJson.expo.android.adaptiveIcon).toEqual({
      backgroundColor: "#FAFAF8",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    });

    const splash = appJson.expo.plugins.find((entry) =>
      Array.isArray(entry) && entry[0] === "expo-splash-screen",
    );
    expect(splash).toEqual(["expo-splash-screen", {
      backgroundColor: "#FAFAF8",
      image: "./assets/images/icon.png",
      imageWidth: 168,
      resizeMode: "contain",
    }]);
  });

  it("does not reintroduce the legacy Android blue background", () => {
    expect(appJson.expo.android.adaptiveIcon.backgroundColor).not.toBe("#0787BE");
  });
});
