import { describe, expect, it } from "vitest";
import { cityHubBundledPhoto } from "../src/lib/cityHubPhotography";
describe("city hub licensed asset identity", () => {
  it("maps the existing licensed photograph only to its own city and place", () => {
    const photo = cityHubBundledPhoto("lubeck", "holstentor");
    expect(photo?.source).toBeTruthy();
    expect(photo?.credit.credit).toContain("Christian Wolf");
    expect(photo?.credit.licenseName).toBe("CC BY-SA 3.0 DE");
    expect(photo?.credit.source).toContain("Holstentor");
  });
  it("does not use the launch city photo for another city or place", () => {
    expect(cityHubBundledPhoto("hamburg")).toBeUndefined();
    expect(cityHubBundledPhoto("lubeck", "marienkirche")).toBeUndefined();
    expect(cityHubBundledPhoto("unavailable")).toBeUndefined();
  });
});
