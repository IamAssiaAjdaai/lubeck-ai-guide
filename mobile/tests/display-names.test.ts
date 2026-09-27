import { describe, expect, it } from "vitest";
import { nativeCityName, nativePlaceName } from "../src/lib/displayNames";
import { isolateLatinRuns } from "../src/lib/bidi";

describe("native-only Arabic display names", () => {
  it.each([
    ["lubeck", "Lübeck", "لوبيك"], ["hamburg", "Hamburg", "هامبورغ"], ["duesseldorf", "Düsseldorf", "دوسلدورف"],
  ])("localizes %s while preserving English/German", (slug, name, arabic) => {
    expect(nativeCityName(slug, name, "ar")).toBe(arabic);
    expect(nativeCityName(slug, name, "en")).toBe(name);
    expect(nativeCityName(slug, name, "de")).toBe(name);
  });
  it("localizes known places without crossing city identities or overriding authored Arabic", () => {
    expect(nativePlaceName("lubeck", "holstentor", "Holstentor", "ar")).toBe("هولستنتور");
    expect(nativePlaceName("lubeck", "lubecker-altstadt", "Lübeck Old Town", "ar")).toBe("البلدة القديمة في لوبيك");
    expect(nativePlaceName("lubeck", "holstentor", "بوابة هولشتن", "ar")).toBe("بوابة هولشتن");
    expect(nativePlaceName("other-city", "holstentor", "Local venue", "ar")).toBe("\u2068Local venue\u2069");
    expect(nativePlaceName("lubeck", "holstentor", "Holstentor", "de")).toBe("Holstentor");
  });
  it("isolates unknown Latin names and brand runs exactly once", () => {
    const name = nativePlaceName("lubeck", "new-place", "Café Alice", "ar");
    expect(isolateLatinRuns(`اسأل CITYWALK عن ${name}`)).toBe("اسأل \u2068CITYWALK\u2069 عن \u2068Café Alice\u2069");
    expect(isolateLatinRuns("هولستنتور")).toBe("هولستنتور");
  });
});
