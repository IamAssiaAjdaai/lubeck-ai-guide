import { describe, expect, it, vi } from "vitest";
vi.mock("react-native", () => ({ useWindowDimensions: () => ({ width: 390, fontScale: 1 }) }));
import { textLayout } from "../src/design/responsiveText";
import { layout, spacing } from "../src/design/tokens";
describe("text-driven layout budgets (not native text measurements)", () => {
  it.each([320, 390, 430])("retains four normal quick actions at width %s and reduces columns for accessibility", width => {
    expect(textLayout(width, 1).quickColumns).toBe(4);
    expect(textLayout(width, 1.1).quickColumns).toBe(2);
    expect(textLayout(width, 1.3).quickColumns).toBe(2);
    expect(textLayout(width, 3).quickColumns).toBe(1);
    expect(textLayout(width, 1.3).expanded).toBe(true);
    expect(textLayout(width, 3).quickWidth).toBeGreaterThan(textLayout(width, 1).quickWidth);
  });
  it.each([320, 390, 430, 768])("fits three City Hub actions without changing other layouts at width %s", width => {
    const contentWidth = Math.min(width, layout.contentWidth) - 2 * (width <= layout.smallPhone ? spacing.md : spacing.lg);
    const normal = textLayout(width, 1, 3);
    expect(normal.quickColumns).toBe(3);
    expect(normal.quickWidth * 3 + spacing.sm * 2).toBeCloseTo(contentWidth);
    expect(normal.quickWidth).toBeGreaterThan(textLayout(width, 1).quickWidth);
    for (const scale of [1.1, 1.3, 2, 3]) {
      const accessible = textLayout(width, scale, 3);
      expect(accessible.quickColumns).toBeLessThan(3);
      expect(accessible.quickWidth).toBeGreaterThan(0);
      expect(accessible.quickWidth * accessible.quickColumns + spacing.sm * (accessible.quickColumns - 1)).toBeCloseTo(contentWidth);
      expect(accessible.expanded).toBe(textLayout(width, scale).expanded);
      expect(accessible.categoryColumns).toBe(textLayout(width, scale).categoryColumns);
    }
  });
});
