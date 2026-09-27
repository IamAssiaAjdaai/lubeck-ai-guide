import { describe, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ useWindowDimensions: () => ({ width: 390, fontScale: 1 }) }));
import { textLayout } from "../src/design/responsiveText";
describe("text-driven layout budgets (not native text measurements)", () => {
  it.each([320, 390, 430])("retains four normal quick actions at width %s and reduces columns for accessibility", width => {
    expect(textLayout(width, 1).quickColumns).toBe(4);
    expect(textLayout(width, 1.1).quickColumns).toBe(2);
    expect(textLayout(width, 1.3).quickColumns).toBe(2);
    expect(textLayout(width, 3).quickColumns).toBe(1);
    expect(textLayout(width, 1.3).expanded).toBe(true);
    expect(textLayout(width, 3).quickWidth).toBeGreaterThan(textLayout(width, 1).quickWidth);
  });
});
