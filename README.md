# TickLens

TickLens is a zero-dependency TypeScript probe for indie browser-game servers. It shows which room is multiplying the most outbound work when updates lag before CPU looks busy. It records tick duration, room size, messages, estimated bytes, and fanout—never payload contents—and exports a self-contained HTML trace you can open or share offline.

It is designed for Node.js game servers using Socket.IO or `ws`, and also works with custom transports through its tiny core API.

## Install

```sh
npm install multiplayer-update-lens
```

TickLens ships ESM, CommonJS, and TypeScript declarations. It requires Node 18 or newer.

## Try the 500-client sample

Open [the TickLens demo](https://multiplayer-update-lens.sociobot.in/demo/), or
choose **Run 500-client sample** on the site. It loads five seeded rooms and
shows `marsh-260` at 1,622,400 recipient sends. The persistent demo label
explains that the sample is isolated. Resetting clears only `demo:ticklens:`
browser storage and does not change Field Kit data or a stored license.

The demo also includes an editable fanout playground. It uses the same public
probe API as the package and does not send or save the values you enter.

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

Provide the room lookup used by your game. Each server-side `send` is counted as one recipient without capturing its payload; the enclosing tick supplies room size.

```ts
import { createProbe, instrumentWebSocketServer } from "multiplayer-update-lens";

const lens = createProbe();
const stop = instrumentWebSocketServer(wss, lens, {
  roomOf: (client) => client.roomId,
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
npm ci
npm test
npm run build
npm pack --dry-run
npm run test:claims
```

- `npm run build` creates the publishable library and the static site at `dist/site/index.html`.
- `npm run dev` runs the documentation/demo site.
- `npm test` runs the documented examples and core/adapter/report tests.
- `npm run test:site` runs browser accessibility, mobile, demo-isolation,
  offline-update, keyboard, and paid-unlock checks against a running site.
- `npm run test:claims` runs every outcome check listed in
  `.factory/claims.json`. It needs `npm run build` first.

Run the browser suite in a second terminal after starting the site:

```sh
npm run dev -- --host 127.0.0.1 --port 4173
TICKLENS_TEST_URL=http://127.0.0.1:4173 npm run test:site
```

### Static-site deployment

Deploy `dist/site` to the configured static host. The included
`staticwebapp.config.json` gives content-hashed `/assets/*` files a one-year
immutable cache lifetime, while HTML and `sw.js` retain a short revalidating
policy so releases and offline updates become visible promptly. The service
worker uses network-first navigation with a cached offline fallback, so an
already-installed worker cannot hold a client on an earlier HTML deployment.

`staticwebapp.config.json` also sends a content security policy and deny-frame
headers. It preserves an HTTP 404 while rewriting unknown paths to the designed
`/404.html` page.

The factory deploys the built `dist/site` directory to the TickLens static
application. Do not publish the npm package from a local checkout; use
`npm pack` to prepare the factory-owned registry artifact.

## Privacy and scope

TickLens has no telemetry and makes no network requests. Traces stay in memory until your code exports them. Payload bodies are never stored. The documentation site's optional Field Kit stores a license and saved comparisons in your browser only; see the site’s privacy and terms pages.

Non-goals for v1 are hosting, packet capture, matchmaking, and engine-specific state inspection.

## License

MIT © 2026 Sociobot (Param Factory). See [LICENSE](LICENSE).
