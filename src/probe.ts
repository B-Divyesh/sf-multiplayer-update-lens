import { safeCount } from "./measure.js";
import { renderTraceHtml } from "./report.js";
import type { OutboundMeasurement, Probe, ProbeOptions, ReportOptions, TickMeta, TickSample, TickTrace } from "./types.js";

interface ActiveTick {
  room: string;
  startedAt: number;
  timestamp: number;
  roomSize: number;
  messages: number;
  bytes: number;
  recipients: number;
  fanout: number;
  wireBytes: number;
  sampled: boolean;
  ended: boolean;
}

export function createProbe(options: ProbeOptions = {}): Probe {
  const maxTicks = integerInRange(options.maxTicks ?? 5000, 1, 1_000_000, "maxTicks");
  const sampleRate = numberInRange(options.sampleRate ?? 1, 0, 1, "sampleRate");
  const redactRoomIds = options.redactRoomIds !== false;
  const clock = options.clock ?? defaultClock;
  const salt = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const aliases = new Map<string, string>();
  const active = new Map<string, ActiveTick[]>();
  let samples: TickSample[] = [];
  let nextSample = 0;

  const labelFor = (roomId: string): string => {
    if (!redactRoomIds) return roomId;
    let label = aliases.get(roomId);
    if (!label) {
      label = `room-${hash(`${salt}:${roomId}`).toString(16).padStart(8, "0").slice(0, 8)}`;
      aliases.set(roomId, label);
    }
    return label;
  };

  const push = (sample: TickSample): void => {
    if (samples.length < maxTicks) {
      samples.push(sample);
      return;
    }
    samples[nextSample] = sample;
    nextSample = (nextSample + 1) % maxTicks;
  };

  const startTick = (roomId: string, meta: TickMeta): ((error?: unknown) => void) => {
    assertRoom(roomId);
    const roomSize = safeCount(meta.roomSize, 0);
    const state: ActiveTick = {
      room: labelFor(roomId),
      startedAt: clock(),
      timestamp: meta.timestamp ?? Date.now(),
      roomSize,
      messages: 0,
      bytes: 0,
      recipients: 0,
      fanout: 0,
      wireBytes: 0,
      sampled: Math.random() < sampleRate,
      ended: false,
    };
    const stack = active.get(roomId) ?? [];
    stack.push(state);
    active.set(roomId, stack);

    return (error?: unknown): void => {
      if (state.ended) return;
      state.ended = true;
      const current = active.get(roomId);
      if (current) {
        const index = current.indexOf(state);
        if (index >= 0) current.splice(index, 1);
        if (!current.length) active.delete(roomId);
      }
      if (!state.sampled) return;
      push({
        room: state.room,
        timestamp: state.timestamp,
        durationMs: Math.max(0, clock() - state.startedAt),
        roomSize: state.roomSize,
        messages: state.messages,
        bytes: state.bytes,
        recipients: state.recipients,
        fanout: state.fanout,
        wireBytes: state.wireBytes,
        failed: error !== undefined && error !== null,
      });
    };
  };

  const recordOutbound = (roomId: string, measurement: OutboundMeasurement): void => {
    assertRoom(roomId);
    const bytes = safeCount(measurement.bytes, 0);
    const messages = safeCount(measurement.messages, 1);
    const recipients = safeCount(measurement.recipients, 1);
    const stack = active.get(roomId);
    const state = stack?.[stack.length - 1];
    if (state) {
      if (!state.sampled) return;
      state.bytes += bytes * messages;
      state.messages += messages;
      state.recipients += recipients;
      state.fanout += messages * recipients;
      state.wireBytes += bytes * messages * recipients;
      return;
    }
    if (Math.random() >= sampleRate) return;
    push({
      room: labelFor(roomId), timestamp: Date.now(), durationMs: 0, roomSize: recipients,
      messages, bytes: bytes * messages, recipients, fanout: messages * recipients,
      wireBytes: bytes * messages * recipients, failed: false,
    });
  };

  const tick = <T>(roomId: string, meta: TickMeta, work: () => T): T => {
    const end = startTick(roomId, meta);
    try {
      const result = work();
      if (result && typeof (result as unknown as PromiseLike<unknown>).then === "function") {
        return Promise.resolve(result).then(
          (value) => { end(); return value; },
          (error) => { end(error); throw error; },
        ) as T;
      }
      end();
      return result;
    } catch (error) {
      end(error);
      throw error;
    }
  };

  const snapshot = (): TickTrace => ({
    schema: "ticklens-trace",
    version: 1,
    generatedAt: new Date().toISOString(),
    ...(options.serverName ? { serverName: options.serverName } : {}),
    roomIdsRedacted: redactRoomIds,
    samples: (samples.length === maxTicks && nextSample > 0
      ? [...samples.slice(nextSample), ...samples.slice(0, nextSample)]
      : samples).map((sample) => ({ ...sample })),
  });

  return {
    startTick,
    tick,
    recordOutbound,
    snapshot,
    toHTML: (reportOptions?: ReportOptions) => renderTraceHtml(snapshot(), reportOptions),
    clear: () => { samples = []; nextSample = 0; active.clear(); },
  };
}

function defaultClock(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function hash(value: string): number {
  let result = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}

function assertRoom(roomId: string): void {
  if (typeof roomId !== "string" || !roomId.trim()) throw new TypeError("TickLens roomId must be a non-empty string");
}

function numberInRange(value: number, min: number, max: number, name: string): number {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`TickLens ${name} must be between ${min} and ${max}`);
  return value;
}

function integerInRange(value: number, min: number, max: number, name: string): number {
  if (!Number.isInteger(value)) throw new RangeError(`TickLens ${name} must be an integer`);
  return numberInRange(value, min, max, name);
}
