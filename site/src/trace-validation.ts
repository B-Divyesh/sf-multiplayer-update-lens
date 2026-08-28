import type { TickSample, TickTrace } from "../../src/types";

/**
 * Checks the complete, portable trace format before the Field Kit retains it.
 * Imported reports are untrusted local files, even when their schema label is
 * correct, so every value used by the comparison renderer is checked here.
 */
export function validateTrace(value: unknown): TickTrace {
  if (!isRecord(value) || value.schema !== "ticklens-trace" || value.version !== 1) {
    throw new Error("This file is not a TickLens trace (schema version 1 is required).");
  }
  if (!isDateString(value.generatedAt)) throw new Error("This TickLens trace has an invalid generated date.");
  if (value.serverName !== undefined && typeof value.serverName !== "string") {
    throw new Error("This TickLens trace has an invalid server name.");
  }
  if (typeof value.roomIdsRedacted !== "boolean") {
    throw new Error("This TickLens trace is missing its room-redaction setting.");
  }
  if (!Array.isArray(value.samples)) throw new Error("This TickLens trace has no sample list.");

  const samples = value.samples.map((sample, index) => validateSample(sample, index));
  return {
    schema: "ticklens-trace",
    version: 1,
    generatedAt: value.generatedAt,
    ...(value.serverName === undefined ? {} : { serverName: value.serverName }),
    roomIdsRedacted: value.roomIdsRedacted,
    samples,
  };
}

function validateSample(value: unknown, index: number): TickSample {
  if (!isRecord(value)) throw new Error(`Sample ${index + 1} is not an object.`);
  if (typeof value.room !== "string" || !value.room.trim()) {
    throw new Error(`Sample ${index + 1} has an invalid room name.`);
  }
  for (const key of ["timestamp", "durationMs", "roomSize", "messages", "bytes", "recipients", "fanout", "wireBytes"] as const) {
    if (!isNonNegativeFiniteNumber(value[key])) {
      throw new Error(`Sample ${index + 1} has an invalid ${key} value.`);
    }
  }
  if (typeof value.failed !== "boolean") throw new Error(`Sample ${index + 1} has an invalid failed value.`);

  // The checks above establish the complete TickSample contract. Keeping the
  // cast here avoids widening individually validated Record properties.
  return value as unknown as TickSample;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDateString(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
