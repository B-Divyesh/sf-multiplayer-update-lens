export { createProbe } from "./probe.js";
export { instrumentSocketIO, instrumentWebSocketServer } from "./adapters.js";
export { renderTraceHtml, summarizeRooms } from "./report.js";
export { estimateBytes } from "./measure.js";
export type {
  OutboundMeasurement,
  Probe,
  ProbeOptions,
  ReportOptions,
  SocketIOAdapterOptions,
  TickMeta,
  TickSample,
  TickTrace,
  WebSocketAdapterOptions,
} from "./types.js";

import type { Probe, ReportOptions, TickTrace } from "./types.js";
import { renderTraceHtml } from "./report.js";

/** Write a self-contained report. Uses a dynamic Node import to keep the core browser-safe. */
export async function writeReport(
  source: Probe | TickTrace,
  filePath: string,
  options?: ReportOptions,
): Promise<void> {
  const trace = "snapshot" in source ? source.snapshot() : source;
  const { writeFile } = await import("node:fs/promises");
  await writeFile(filePath, renderTraceHtml(trace, options), "utf8");
}
