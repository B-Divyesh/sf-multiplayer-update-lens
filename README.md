# TickLens

TickLens is a zero-dependency TypeScript probe for indie browser-game servers. It shows which room is multiplying the most outbound work when updates lag before CPU looks busy. It records tick duration, room size, messages, estimated bytes, and fanout—never payload contents—and exports a self-contained HTML trace you can open or share offline.

It is designed for Node.js game servers using Socket.IO or `ws`, and also works with custom transports through its tiny core API.

## Install

```sh
npm install multiplayer-update-lens
```

TickLens ships ESM, CommonJS, and TypeScript declarations. It requires Node 18 or newer.

## Usage

Wrap the work for each room, and count outbound updates where you send them:

```ts
import { createProbe, writeReport } from "multiplayer-update-lens";

const lens = createProbe({ serverName: "eu-west-1" });

await lens.tick("room-42", { roomSize: players.length }, async () => {
  const update = JSON.stringify(buildUpdate(players));
  broadcast(update);
  lens.recordOutbound("room-42", {
    messages: 1,
    bytes: Buffer.byteLength(update),
    recipients: players.length,
  });
});

await writeReport(lens, "ticklens-trace.html");
```

Room IDs are replaced with stable session-scoped labels such as `room-a13f2c` by default. Set `redactRoomIds: false` only when the real IDs are safe to include.

### Socket.IO

The adapter observes adapter broadcasts and estimates encoded packet size. It does not inspect or store packet contents.

```ts
import { createProbe, instrumentSocketIO, writeReport } from "multiplayer-update-lens";

const lens = createProbe();
const stop = instrumentSocketIO(io, lens);

await lens.tick(match.id, { roomSize: match.players.length }, () => match.step());
await writeReport(lens, "trace.html");
stop(); // restores the original adapter method
```

### WebSocket (`ws`)

Provide the room and room-size lookup used by your game. Each server-side `send` is counted without capturing its payload.

```ts
import { createProbe, instrumentWebSocketServer } from "multiplayer-update-lens";

const lens = createProbe();
const stop = instrumentWebSocketServer(wss, lens, {
  roomOf: (client) => client.roomId,
  roomSize: (roomId) => rooms.get(roomId)?.size ?? 0,
});
```

### Custom transports and snapshots

```ts
const lens = createProbe({ maxTicks: 10_000, sampleRate: 1 });
const end = lens.startTick("lobby", { roomSize: 500 });
lens.recordOutbound("lobby", { bytes: 280, messages: 1, recipients: 500 });
end();

const trace = lens.snapshot();       // plain serializable data
const html = lens.toHTML();          // complete offline HTML document
lens.clear();
```

Fanout is `messages × recipients`; wire bytes are `bytes × recipients`. Byte counts are estimates based on strings, buffers, typed arrays, or JSON encoding—not packet capture.

## Report guide

Open the exported file directly. “Highest fanout” identifies the room doing the most cumulative recipient sends. The room table also shows p95 tick time and bytes per player, which helps distinguish a heavy simulation from an outbound update that grows with the room.

## Local development

```sh
npm install
npm test
npm run build
npm pack --dry-run
```

- `npm run build` creates the publishable library and the static site at `dist/site/index.html`.
- `npm run dev` runs the documentation/demo site.
- `npm test` runs the documented examples and core/adapter/report tests.

## Privacy and scope

TickLens has no telemetry and makes no network requests. Traces stay in memory until your code exports them. Payload bodies are never stored. The documentation site's optional Field Kit stores a license and saved comparisons in your browser only; see the site’s privacy and terms pages.

Non-goals for v1 are hosting, packet capture, matchmaking, and engine-specific state inspection.

## License

MIT © 2026 Sociobot (Param Factory). See [LICENSE](LICENSE).
