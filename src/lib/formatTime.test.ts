import { describe, expect, it } from "vitest";
import { formatTime } from "./formatTime";

describe("formatTime", () => {
  it("formats zero seconds", () => {
    expect(formatTime(0)).toBe("0:00");
  });

  it("formats seconds below one minute", () => {
    expect(formatTime(5)).toBe("0:05");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(90)).toBe("1:30");
  });

  it("formats longer durations", () => {
    expect(formatTime(125)).toBe("2:05");
  });

  it("returns 0:00 for negative numbers", () => {
    expect(formatTime(-10)).toBe("0:00");
  });

  it("returns 0:00 for invalid numbers", () => {
    expect(formatTime(Number.NaN)).toBe("0:00");
    expect(formatTime(Infinity)).toBe("0:00");
  });
});