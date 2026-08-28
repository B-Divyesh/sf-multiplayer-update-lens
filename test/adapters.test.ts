import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { createProbe, instrumentSocketIO, instrumentWebSocketServer } from "../src/index.js";

describe("Socket.IO adapter", () => {
  it("counts a room broadcast and restores the adapter", () => {
    const broadcast = vi.fn();
    const adapter = { broadcast, rooms: new Map([["lobby", new Set([1, 2, 3])]]) };
    const namespace = { adapter, sockets: new Map() };
    const io = { of: vi.fn(() => namespace) };
    const lens = createProbe({ redactRoomIds: false });
    const stop = instrumentSocketIO(io, lens);

    adapter.broadcast({ type: 2, data: ["state", { x: 1 }] }, { rooms: new Set(["lobby"]) });
    expect(broadcast).toHaveBeenCalledOnce();
    expect(lens.snapshot().samples[0]).toMatchObject({ room: "lobby", messages: 1, recipients: 3, fanout: 3 });
    stop();
    expect(adapter.broadcast).toBe(broadcast);
  });

  it("rejects an incompatible object", () => {
    expect(() => instrumentSocketIO({}, createProbe())).toThrow(/Socket.IO/);
  });
});

describe("WebSocket adapter", () => {
  it("observes send without changing behavior and tears down cleanly", () => {
    class Server extends EventEmitter { clients = new Set<Client>(); }
    const originalSend = vi.fn((..._args: unknown[]) => "sent");
    const client = { roomId: "arena", send: originalSend };
    type Client = typeof client;
    const server = new Server();
    server.clients.add(client);
    const lens = createProbe({ redactRoomIds: false });
    const stop = instrumentWebSocketServer(server, lens, {
      roomOf: (socket) => socket.roomId,
    });

    expect(client.send("hello")).toBe("sent");
    expect(originalSend).toHaveBeenCalledWith("hello");
    expect(lens.snapshot().samples[0]).toMatchObject({ room: "arena", bytes: 5, recipients: 1, fanout: 1 });
    stop();
    expect(client.send).toBe(originalSend);
    expect(server.listenerCount("connection")).toBe(0);
  });
});
