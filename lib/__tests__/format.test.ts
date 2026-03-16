import { describe, expect, test } from "bun:test";
import { formatDuration, formatTimestamp, formatDateTime, computeDuration } from "../format";

describe("formatDuration", () => {
  test("returns milliseconds for values under 1 second", () => {
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(1)).toBe("1ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  test("returns seconds with milliseconds for values under 1 minute", () => {
    const result = formatDuration(1500);
    expect(result).toMatch(/1.*500.*s/);
  });

  test("returns minutes and seconds for values 1 minute or above", () => {
    const result = formatDuration(90_000);
    expect(result).toMatch(/1.*m.*30.*s/);
  });

  test("handles exactly 1 second", () => {
    const result = formatDuration(1000);
    expect(result).toMatch(/1.*s/);
  });

  test("handles exactly 1 minute", () => {
    const result = formatDuration(60_000);
    expect(result).toMatch(/1.*m/);
  });
});

describe("formatTimestamp", () => {
  test("returns dash for null", () => {
    expect(formatTimestamp(null)).toBe("—");
  });

  test("returns dash for invalid ISO string", () => {
    expect(formatTimestamp("not-a-date")).toBe("—");
  });

  test("formats valid ISO timestamp to HH:mm:ss.SSS", () => {
    const result = formatTimestamp("2026-03-15T14:30:45.123Z");
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
  });
});

describe("formatDateTime", () => {
  test("returns dash for null", () => {
    expect(formatDateTime(null)).toBe("—");
  });

  test("returns dash for invalid ISO string", () => {
    expect(formatDateTime("garbage")).toBe("—");
  });

  test("formats valid ISO to MMM d, HH:mm", () => {
    const result = formatDateTime("2026-03-15T14:30:00Z");
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/15/);
  });
});

describe("computeDuration", () => {
  test("returns dash when startedAt is null", () => {
    expect(computeDuration(null, null, false)).toBe("—");
  });

  test("returns dash when startedAt is invalid", () => {
    expect(computeDuration("bad", null, false)).toBe("—");
  });

  test("computes duration between startedAt and completedAt", () => {
    const result = computeDuration(
      "2026-03-15T14:00:00.000Z",
      "2026-03-15T14:00:02.500Z",
      false,
    );
    expect(result).toMatch(/2.*500.*s/);
  });

  test("returns zero duration when not live and no completedAt", () => {
    const result = computeDuration("2026-03-15T14:00:00.000Z", null, false);
    expect(result).toBe("0ms");
  });

  test("returns live duration when isLive is true and no completedAt", () => {
    const start = new Date(Date.now() - 5000).toISOString();
    const result = computeDuration(start, null, true);
    // Should be roughly 5 seconds, not 0
    expect(result).not.toBe("0ms");
  });

  test("uses completedAt over live when both available", () => {
    const result = computeDuration(
      "2026-03-15T14:00:00.000Z",
      "2026-03-15T14:00:01.000Z",
      true,
    );
    expect(result).toMatch(/1.*s/);
  });
});
