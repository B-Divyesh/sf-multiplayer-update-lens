import { estimateBytes } from "./measure.js";
import type { Probe, SocketIOAdapterOptions, WebSocketAdapterOptions } from "./types.js";

type AnyFunction = (...args: any[]) => any;

export function instrumentSocketIO(io: any, probe: Probe, options: SocketIOAdapterOptions = {}): () => void {
  const namespace = io?.of?.(options.namespace ?? "/");
  const adapter = namespace?.adapter;
  if (!adapter || typeof adapter.broadcast !== "function") {
    throw new TypeError("TickLens expected a Socket.IO server with an initialized namespace adapter");
  }
  const original: AnyFunction = adapter.broadcast;
  const wrapped = function (this: unknown, packet: unknown, broadcastOptions: any): unknown {
    const rooms: unknown[] = broadcastOptions?.rooms ? [...broadcastOptions.rooms] : [];
    const encodedBytes = estimateBytes(packet);
    if (rooms.length) {
      for (const room of rooms) {
        const roomId = String(room);
        const recipients = adapter.rooms?.get?.(room)?.size ?? 0;
        probe.recordOutbound(roomId, { bytes: encodedBytes, messages: 1, recipients });
      }
    } else {
      probe.recordOutbound(options.namespace ?? "/", {
        bytes: encodedBytes,
        messages: 1,
        recipients: namespace.sockets?.size ?? 0,
      });
    }
    return original.call(this, packet, broadcastOptions);
  };
  adapter.broadcast = wrapped;
  return () => {
    if (adapter.broadcast === wrapped) adapter.broadcast = original;
  };
}

export function instrumentWebSocketServer<Client extends { send: AnyFunction }>(
  server: { on: AnyFunction; off?: AnyFunction; removeListener?: AnyFunction; clients?: Iterable<Client> },
  probe: Probe,
  options: WebSocketAdapterOptions<Client>,
): () => void {
  if (!server || typeof server.on !== "function") throw new TypeError("TickLens expected a WebSocket server with an on() method");
  if (!options || typeof options.roomOf !== "function") throw new TypeError("TickLens WebSocket adapter requires roomOf(client)");
  const originals = new Map<Client, AnyFunction>();

  const instrumentClient = (client: Client): void => {
    if (!client || typeof client.send !== "function" || originals.has(client)) return;
    const original = client.send;
    originals.set(client, original);
    client.send = function (this: Client, data: unknown, ...args: unknown[]): unknown {
      const room = options.roomOf(client) ?? "__unassigned__";
      probe.recordOutbound(room, { bytes: estimateBytes(data), messages: 1, recipients: 1 });
      return original.call(this, data, ...args);
    };
  };
  const onConnection = (client: Client): void => instrumentClient(client);
  server.on("connection", onConnection);
  if (server.clients) for (const client of server.clients) instrumentClient(client);

  return () => {
    if (typeof server.off === "function") server.off("connection", onConnection);
    else if (typeof server.removeListener === "function") server.removeListener("connection", onConnection);
    for (const [client, original] of originals) client.send = original;
    originals.clear();
  };
}
