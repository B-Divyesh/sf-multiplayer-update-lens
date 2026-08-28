export interface ProbeOptions {
  /** Included in the local report header. */
  serverName?: string;
  /** Maximum samples retained in memory. Oldest samples are discarded. @default 5000 */
  maxTicks?: number;
  /** Fraction of ticks retained, from 0 to 1. @default 1 */
  sampleRate?: number;
  /** Replace room IDs with stable, session-scoped hashes. @default true */
  redactRoomIds?: boolean;
  /** Advanced: provide a monotonic clock for testing or non-Node runtimes. */
  clock?: () => number;
}

export interface TickMeta {
  roomSize: number;
  timestamp?: number;
}

export interface OutboundMeasurement {
  /** Estimated encoded bytes for one message, before recipient multiplication. */
  bytes: number;
  /** Number of logical messages. @default 1 */
  messages?: number;
  /** Number of recipients. @default 1 */
  recipients?: number;
}

export interface TickSample {
  room: string;
  timestamp: number;
  durationMs: number;
  roomSize: number;
  messages: number;
  bytes: number;
  recipients: number;
  fanout: number;
  wireBytes: number;
  failed: boolean;
}

export interface TickTrace {
  schema: "ticklens-trace";
  version: 1;
  generatedAt: string;
  serverName?: string;
  roomIdsRedacted: boolean;
  samples: TickSample[];
}

export interface ReportOptions {
  title?: string;
}

export interface Probe {
  startTick(roomId: string, meta: TickMeta): (error?: unknown) => void;
  tick<T>(roomId: string, meta: TickMeta, work: () => T): T;
  recordOutbound(roomId: string, measurement: OutboundMeasurement): void;
  snapshot(): TickTrace;
  toHTML(options?: ReportOptions): string;
  clear(): void;
}

export interface SocketIOAdapterOptions {
  /** Instrument this namespace; defaults to `/`. */
  namespace?: string;
}

export interface WebSocketAdapterOptions<Client = unknown> {
  roomOf(client: Client): string | undefined;
  roomSize?: (roomId: string) => number;
}
