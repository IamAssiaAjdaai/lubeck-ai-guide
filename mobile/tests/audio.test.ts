import { describe, expect, it } from "vitest";

import { formatAudioTime } from "../src/lib/audio";

describe("native audio playback formatting", () => {
  it.each([
    [0, "0:00"],
    [38, "0:38"],
    [87.9, "1:27"],
    [124, "2:04"],
    [Number.NaN, "0:00"],
  ])("formats %s seconds as %s", (seconds, expected) => {
    expect(formatAudioTime(seconds)).toBe(expected);
  });
});
