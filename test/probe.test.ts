import { describe, expect, it, vi } from "vitest";
import { createProbe, renderTraceHtml, writeReport } from "../src/index.js";
import { readFile, unlink } from "node:fs/promises";

describe("createProbe", () => {
  it("records the documented tick and outbound measurements", () => {
    let now = 10;
    const lens = createProbe({ serverName: "test", clock: () => now, redactRoomIds: false });
    const end = lens.startTick("lobby", { roomSize: 500, timestamp: 123 });
    lens.recordOutbound("lobby", { bytes: 280, messages: 2, recipients: 500 });
    now = 18.5;
    end();

    expect(lens.snapshot().samples).toEqual([{
      room: "lobby", timestamp: 123, durationMs: 8.5, roomSize: 500,
      messages: 2, bytes: 560, recipients: 500, fanout: 1000,
      wireBytes: 280_000, failed: false,
    }]);
  });

  it("redacts room IDs by default and keeps labels stable", () => {
    const lens = createProbe();
    lens.recordOutbound("secret-match-id", { bytes: 10 });
    lens.recordOutbound("secret-match-id", { bytes: 10 });
    const trace = lens.snapshot();
    expect(trace.roomIdsRedacted).toBe(true);
    expect(trace.samples[0]?.room).toMatch(/^room-[a-f0-9]{8}$/);
    expect(trace.samples[0]?.room).toBe(trace.samples[1]?.room);
    expect(JSON.stringify(trace)).not.toContain("secret-match-id");
  });

  it("wraps sync and async work while preserving values and errors", async () => {
    const lens = createProbe({ redactRoomIds: false });
    expect(lens.tick("a", { roomSize: 1 }, () => 42)).toBe(42);
    await expect(lens.tick("b", { roomSize: 2 }, async () => "done")).resolves.toBe("done");
    await expect(lens.tick("c", { roomSize: 3 }, async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    expect(lens.snapshot().samples.map((sample) => sample.failed)).toEqual([false, false, true]);
  });

  it("caps samples and validates unsafe options", () => {
    const lens = createProbe({ maxTicks: 2, redactRoomIds: false });
    for (const room of ["a", "b", "c"]) lens.recordOutbound(room, { bytes: 1 });
    expect(lens.snapshot().samples.map((sample) => sample.room)).toEqual(["b", "c"]);
    expect(() => createProbe({ sampleRate: 2 })).toThrow(RangeError);
    expect(() => lens.startTick("", { roomSize: 0 })).toThrow(TypeError);
  });

  it("clears retained data", () => {
    const lens = createProbe();
    lens.recordOutbound("a", { bytes: 1 });
    lens.clear();
    expect(lens.snapshot().samples).toHaveLength(0);
  });
});

describe("self-contained report", () => {
  it("identifies the highest-fanout room and escapes labels", () => {
    const lens = createProbe({ redactRoomIds: false });
    lens.recordOutbound("small", { bytes: 5, recipients: 2 });
    lens.recordOutbound("<big>", { bytes: 10, messages: 2, recipients: 50 });
    const html = lens.toHTML({ title: "My trace" });
    expect(html).toContain("Highest fanout room");
    expect(html).toContain("&lt;big&gt;");
    expect(html).not.toContain("<big>");
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("renders a useful empty report", () => {
    const html = renderTraceHtml(createProbe().snapshot());
    expect(html).toContain("No room samples yet");
    expect(html).toContain("lens.tick()");
  });

  it("writes the README-style report to disk", async () => {
    const path = ".ticklens-test-report.html";
    const lens = createProbe();
    lens.recordOutbound("test", { bytes: 20, recipients: 3 });
    await writeReport(lens, path);
    expect(await readFile(path, "utf8")).toContain("ticklens-trace");
    await unlink(path);
  });
});
