import { describe, expect, it } from "vitest";
import { validateTrace } from "../site/src/trace-validation";

const trace = {
  schema: "ticklens-trace",
  version: 1,
  generatedAt: "2026-08-28T00:00:00.000Z",
  roomIdsRedacted: true,
  samples: [{ room: "room-a", timestamp: 1, durationMs: 2, roomSize: 3, messages: 4, bytes: 5, recipients: 6, fanout: 24, wireBytes: 30, failed: false }],
};

describe("Field Kit trace validation", () => {
  it("accepts the complete version 1 trace shape", () => {
    expect(validateTrace(trace)).toEqual(trace);
  });

  it.each([
    ["wrong version", { ...trace, version: 2 }],
    ["non-numeric duration", { ...trace, samples: [{ ...trace.samples[0], durationMs: "not-a-number" }] }],
    ["non-finite numeric value", { ...trace, samples: [{ ...trace.samples[0], fanout: Infinity }] }],
    ["missing failed state", { ...trace, samples: [{ ...trace.samples[0], failed: undefined }] }],
  ])("rejects %s before it can reach rendering", (_name, invalid) => {
    expect(() => validateTrace(invalid)).toThrowError();
  });
});
