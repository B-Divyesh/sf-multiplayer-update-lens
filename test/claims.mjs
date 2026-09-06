import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, readdir, stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, normalize, resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const execFileAsync = promisify(execFile);
const root = resolve(new URL("..", import.meta.url).pathname);
const dist = join(root, "dist");
const site = join(dist, "site");
const grep = process.argv.includes("--grep") ? process.argv[process.argv.indexOf("--grep") + 1] : undefined;

try {
  await stat(join(dist, "index.js"));
  await stat(join(site, "index.html"));
} catch {
  throw new Error("Build the library and site before claim checks: npm run build");
}

const library = await import(pathToFileURL(join(dist, "index.js")).href);
const server = await serveSite();
const browser = await chromium.launch({ headless: true });

const claims = {
  "@claim:zero-dependencies": async () => {
    const { stdout } = await execFileAsync("npm", ["pack", "--json", "--dry-run"], { cwd: root });
    const packed = JSON.parse(stdout);
    assert.equal(packed.length, 1, "the package must produce one publishable tarball");
    const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    assert.deepEqual(packageJson.dependencies ?? {}, {}, "a packed TickLens install must not require runtime dependencies");
  },
  "@claim:payloads-never-captured": async () => {
    const secret = "STATE_PAYLOAD_SHOULD_NOT_APPEAR";
    const broadcasts = [];
    const adapter = { broadcast: (packet) => broadcasts.push(packet), rooms: new Map([["match", new Set([1, 2, 3])]]) };
    const io = { of: () => ({ adapter, sockets: new Map() }) };
    const lens = library.createProbe({ redactRoomIds: false });
    const stop = library.instrumentSocketIO(io, lens);
    adapter.broadcast({ event: "state", data: secret }, { rooms: new Set(["match"]) });
    stop();
    assert.equal(broadcasts[0].data, secret, "instrumentation must preserve the original outbound payload");
    assert.doesNotMatch(JSON.stringify(lens.snapshot()), new RegExp(secret));
    assert.doesNotMatch(lens.toHTML(), new RegExp(secret));
  },
  "@claim:room-ids-redacted": async () => {
    const privateId = "private-room-473";
    const lens = library.createProbe();
    lens.recordOutbound(privateId, { bytes: 20, recipients: 4 });
    lens.recordOutbound(privateId, { bytes: 20, recipients: 4 });
    const trace = lens.snapshot();
    assert.equal(trace.roomIdsRedacted, true);
    assert.match(trace.samples[0].room, /^room-[a-f0-9]{8}$/);
    assert.equal(trace.samples[0].room, trace.samples[1].room, "one room must retain a stable label during its session");
    assert.doesNotMatch(JSON.stringify(trace), new RegExp(privateId));
  },
  "@claim:sample-export-ranking": async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${server.origin}/demo/`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "marsh-260" }).waitFor();
    const pageResult = await page.locator("#sample-report").textContent();
    assert.match(pageResult ?? "", /1,622,400/);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download self-contained report" }).click();
    const file = await download;
    const filePath = await file.path();
    assert.ok(filePath, "the sample must download its report");
    const report = await readFile(filePath, "utf8");
    assert.match(report, /marsh-260/);
    assert.match(report, /1,622,400 recipient sends/);
    await context.close();
  },
  "@claim:demo-playground-private": async () => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const requests = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(`${server.origin}/demo/`, { waitUntil: "networkidle" });
    await page.getByLabel("Room label").fill("private-playground-room");
    await page.getByLabel("Players in room").fill("7");
    await page.getByLabel("Updates per tick").fill("3");
    await page.getByLabel("Bytes per update").fill("20");
    await page.getByText("private-playground-room: 3 updates × 7 players = 21 recipient sends per tick.").waitFor();
    const stored = await page.evaluate(() => JSON.stringify(localStorage));
    assert.doesNotMatch(stored, /private-playground-room/);
    assert.ok(requests.every((url) => new URL(url).origin === server.origin), "playground input must not be sent to another origin");
    await context.close();
  },
  "@claim:standalone-report-offline": async () => {
    const lens = library.createProbe({ redactRoomIds: false });
    lens.recordOutbound("room-500", { bytes: 280, messages: 2, recipients: 500 });
    const context = await browser.newContext();
    const page = await context.newPage();
    const url = `data:text/html;charset=utf-8,${encodeURIComponent(lens.toHTML({ title: "Offline trace" }))}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Offline trace" }).waitFor();
    await page.getByText("1,000 recipient sends").waitFor();
    await context.close();
  },
  "@claim:outbound-content-not-stored": async () => {
    class Server extends EventEmitter { clients = new Set(); }
    const secret = "PLAYER_MESSAGE_SOCKET_FRAME_SECRET";
    const originalSend = (data) => data;
    const client = { roomId: "private-room", send: originalSend };
    const websocket = new Server();
    websocket.clients.add(client);
    const lens = library.createProbe();
    const stop = library.instrumentWebSocketServer(websocket, lens, { roomOf: (socket) => socket.roomId });
    assert.equal(client.send(secret), secret, "instrumentation must not alter a socket frame");
    stop();
    assert.doesNotMatch(JSON.stringify(lens.snapshot()), new RegExp(secret));
    assert.doesNotMatch(lens.toHTML(), new RegExp(secret));
  },
  "@claim:session-scoped-labels": async () => {
    const roomId = "production-west-match";
    const first = library.createProbe();
    first.recordOutbound(roomId, { bytes: 1 });
    const second = library.createProbe();
    second.recordOutbound(roomId, { bytes: 1 });
    const firstLabel = first.snapshot().samples[0].room;
    const secondLabel = second.snapshot().samples[0].room;
    assert.match(firstLabel, /^room-[a-f0-9]{8}$/);
    assert.match(secondLabel, /^room-[a-f0-9]{8}$/);
    assert.notEqual(firstLabel, secondLabel, "a new probe session must use a new room label");
    assert.doesNotMatch(first.toHTML(), new RegExp(roomId));
  },
  "@claim:field-kit-browser-local": async () => {
    const context = await licensedContext();
    const page = await context.newPage();
    const requests = [];
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(`${server.origin}/?license=claim-license`, { waitUntil: "networkidle" });
    await page.getByText("Field Kit active · local retention and compare unlocked").waitFor();
    await page.locator("#trace-upload").setInputFiles(traceFile("local-only", 11));
    await page.getByText("local-only", { exact: true }).waitFor();
    const stored = await page.evaluate(() => localStorage.getItem("ticklens:field-kit:traces"));
    assert.ok(stored?.includes("local-only"), "an imported report must be retained in browser storage");
    assert.ok(requests.every((url) => new URL(url).origin === server.origin || url.startsWith("https://api.sociobot.in/")), "the free flow must not send traces to another origin");
    await context.close();
  },
  "@claim:field-kit-thirty-traces": async () => {
    const context = await licensedContext();
    const page = await context.newPage();
    await page.goto(`${server.origin}/?license=claim-license`, { waitUntil: "networkidle" });
    await page.getByText("Field Kit active · local retention and compare unlocked").waitFor();
    const files = Array.from({ length: 31 }, (_, index) => traceFile(`trace-${index + 1}`, index + 1));
    await page.locator("#trace-upload").setInputFiles(files);
    await page.locator(".trace-item").first().waitFor();
    assert.equal(await page.locator(".trace-item").count(), 30, "the local library must retain no more than 30 traces");
    await context.close();
  },
  "@claim:field-kit-comparison": async () => {
    const context = await licensedContext();
    const page = await context.newPage();
    await page.goto(`${server.origin}/?license=claim-license`, { waitUntil: "networkidle" });
    await page.getByText("Field Kit active · local retention and compare unlocked").waitFor();
    await page.locator("#trace-upload").setInputFiles([traceFile("previous", 30), traceFile("newest", 70)]);
    await page.getByText("Newest vs previous").waitFor();
    const comparison = await page.locator("#comparison").textContent();
    assert.match(comparison ?? "", /newest/);
    assert.match(comparison ?? "", /previous/);
    assert.match(comparison ?? "", /Highest-room fanout changed by/);
    await context.close();
  },
  "@claim:license-other-device": async () => {
    for (const device of [1, 2]) {
      const context = await licensedContext();
      const page = await context.newPage();
      await page.goto(`${server.origin}/`, { waitUntil: "networkidle" });
      await page.getByLabel("Have a license? Paste it here").fill("shared-valid-license");
      await page.getByRole("button", { name: "Verify license" }).click();
      await page.getByText("Field Kit active · local retention and compare unlocked").waitFor();
      assert.equal(await page.evaluate(() => localStorage.getItem("sb_license:multiplayer-update-lens")), "shared-valid-license", `device ${device} must retain the pasted license locally`);
      await context.close();
    }
  },
  "@claim:traces-memory-until-export": async () => {
    const temporary = await mkdtemp(join(tmpdir(), "ticklens-claim-"));
    const output = join(temporary, "trace.html");
    const lens = library.createProbe();
    lens.recordOutbound("room", { bytes: 12, recipients: 3 });
    assert.deepEqual(await readdir(temporary), [], "recording a trace must not create a file");
    await library.writeReport(lens, output);
    assert.deepEqual(await readdir(temporary), ["trace.html"], "export must create the requested report file");
    await unlink(output);
  },
  "@claim:library-no-telemetry": async () => {
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async () => { calls += 1; throw new Error("Unexpected network call"); };
    try {
      const lens = library.createProbe();
      lens.recordOutbound("room", { bytes: 10, recipients: 2 });
      lens.toHTML();
      assert.equal(calls, 0, "measuring and rendering must not make a network request");
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
  "@claim:offline-update": async () => {
    const update = await startUpdateServer();
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(update.origin, { waitUntil: "domcontentloaded" });
      await page.evaluate(async () => { await navigator.serviceWorker.register("/sw.js"); await navigator.serviceWorker.ready; });
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "TickLens deployment v1" }).waitFor();
      update.deploy("v2");
      await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
      await page.reload({ waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "TickLens deployment v2" }).waitFor();
      await context.setOffline(true);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByRole("heading", { name: "TickLens deployment v2" }).waitFor();
      await context.close();
    } finally {
      await update.close();
    }
  },
};

try {
  const selected = Object.entries(claims).filter(([tag]) => !grep || tag.includes(grep));
  if (grep) assert.equal(selected.length, 1, `Expected exactly one claim test for ${grep}`);
  for (const [tag, run] of selected) {
    await run();
    console.log(`${tag} passed`);
  }
} finally {
  await browser.close();
  await server.close();
}

async function licensedContext() {
  const context = await browser.newContext();
  await context.route("https://api.sociobot.in/api/v1/products/multiplayer-update-lens/verify**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ valid: true, reason: "ok", expires_at: null }) }));
  return context;
}

function traceFile(name, fanout) {
  return {
    name: `${name}.json`,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      schema: "ticklens-trace", version: 1, generatedAt: new Date().toISOString(), roomIdsRedacted: true,
      samples: [{ room: `${name}-room`, timestamp: Date.now(), durationMs: 4, roomSize: 20, messages: 1, bytes: 10, recipients: fanout, fanout, wireBytes: fanout * 10, failed: false }],
    })),
  };
}

async function serveSite() {
  const http = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    const candidate = pathname === "/" ? "index.html" : pathname.endsWith("/") ? `${pathname.slice(1)}index.html` : pathname.slice(1);
    const file = normalize(join(site, candidate));
    if (!file.startsWith(site)) {
      response.writeHead(400).end();
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, { "content-type": contentType(file), "cache-control": "no-store" });
      response.end(body);
    } catch {
      const body = await readFile(join(site, "404.html"));
      response.writeHead(404, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      response.end(body);
    }
  });
  await new Promise((resolvePromise, reject) => { http.once("error", reject); http.listen(0, "127.0.0.1", resolvePromise); });
  const address = http.address();
  if (!address || typeof address === "string") throw new Error("Could not start claim site server");
  return { origin: `http://127.0.0.1:${address.port}`, close: () => new Promise((resolvePromise, reject) => http.close((error) => error ? reject(error) : resolvePromise())) };
}

function contentType(file) {
  if (file.endsWith(".js")) return "application/javascript";
  if (file.endsWith(".css")) return "text/css";
  if (file.endsWith(".webp")) return "image/webp";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".xml")) return "application/xml";
  return "text/html; charset=utf-8";
}

async function startUpdateServer() {
  const worker = await readFile(join(site, "sw.js"), "utf8");
  let marker = "v1";
  const http = createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (pathname === "/sw.js") {
      response.writeHead(200, { "content-type": "application/javascript", "cache-control": "no-cache" });
      response.end(worker);
      return;
    }
    if (pathname === "/") {
      response.writeHead(200, { "content-type": "text/html", "cache-control": "no-store" });
      response.end(`<!doctype html><html lang="en"><head><title>TickLens update check</title><link rel="stylesheet" href="/assets/app-${marker}.css"></head><body><h1>TickLens deployment ${marker}</h1><script src="/assets/app-${marker}.js"></script></body></html>`);
      return;
    }
    if (pathname === `/assets/app-${marker}.js`) {
      response.writeHead(200, { "content-type": "application/javascript", "cache-control": "no-store" });
      response.end(`document.documentElement.dataset.release = "${marker}";`);
      return;
    }
    if (pathname === `/assets/app-${marker}.css`) {
      response.writeHead(200, { "content-type": "text/css", "cache-control": "no-store" });
      response.end(`:root { --release-${marker}: 1; }`);
      return;
    }
    response.writeHead(200, { "content-type": pathname.endsWith(".webp") ? "image/webp" : "text/html" });
    response.end("offline shell");
  });
  await new Promise((resolvePromise, reject) => { http.once("error", reject); http.listen(0, "127.0.0.1", resolvePromise); });
  const address = http.address();
  if (!address || typeof address === "string") throw new Error("Could not start update server");
  return {
    origin: `http://127.0.0.1:${address.port}`,
    deploy(next) { marker = next; },
    close: () => new Promise((resolvePromise, reject) => http.close((error) => error ? reject(error) : resolvePromise())),
  };
}
