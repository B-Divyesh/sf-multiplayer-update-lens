import type { ReportOptions, TickSample, TickTrace } from "./types.js";

interface RoomSummary {
  room: string;
  ticks: number;
  roomSize: number;
  p95Ms: number;
  fanout: number;
  wireBytes: number;
  messages: number;
  failed: number;
}

export function summarizeRooms(samples: TickSample[]): RoomSummary[] {
  const groups = new Map<string, TickSample[]>();
  for (const sample of samples) {
    const group = groups.get(sample.room) ?? [];
    group.push(sample);
    groups.set(sample.room, group);
  }

  return [...groups.entries()].map(([room, ticks]) => {
    const durations = ticks.map((tick) => tick.durationMs).sort((a, b) => a - b);
    return {
      room,
      ticks: ticks.length,
      roomSize: Math.max(...ticks.map((tick) => tick.roomSize)),
      p95Ms: percentile(durations, 0.95),
      fanout: sum(ticks, "fanout"),
      wireBytes: sum(ticks, "wireBytes"),
      messages: sum(ticks, "messages"),
      failed: ticks.filter((tick) => tick.failed).length,
    };
  }).sort((a, b) => b.fanout - a.fanout || b.wireBytes - a.wireBytes);
}

export function renderTraceHtml(trace: TickTrace, options: ReportOptions = {}): string {
  const rooms = summarizeRooms(trace.samples);
  const title = options.title ?? "TickLens room trace";
  const top = rooms[0];
  const maxFanout = Math.max(1, ...rooms.map((room) => room.fanout));
  const rows = rooms.map((room, index) => `
    <tr>
      <th scope="row"><span class="rank">${index + 1}</span>${escapeHtml(room.room)}</th>
      <td>${formatNumber(room.roomSize)}</td>
      <td>${formatNumber(room.ticks)}</td>
      <td>${room.p95Ms.toFixed(2)} ms</td>
      <td>${formatNumber(room.messages)}</td>
      <td><strong>${formatNumber(room.fanout)}</strong></td>
      <td>${formatBytes(room.wireBytes)}</td>
      <td>${room.failed ? `${room.failed} failed` : "None"}</td>
    </tr>`).join("");
  const bars = rooms.slice(0, 12).map((room) => `
    <li><span class="bar-label">${escapeHtml(room.room)} <b>${formatNumber(room.fanout)}</b></span>
      <span class="track"><span class="bar" style="width:${Math.max(2, room.fanout / maxFanout * 100).toFixed(1)}%"></span></span>
    </li>`).join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>${reportCss}</style></head>
<body><a class="skip" href="#report">Skip to report</a><header><div class="brand"><i></i> TICKLENS / FIELD NOTE</div><div>${escapeHtml(trace.serverName ?? "Local trace")}</div></header>
<main id="report"><p class="eyebrow">Multiplayer update specimen · ${escapeHtml(new Date(trace.generatedAt).toLocaleString("en"))}</p>
<h1>${escapeHtml(title)}</h1>
${top ? `<section class="finding" aria-labelledby="finding-title"><div><p class="label">Highest fanout room</p><h2 id="finding-title">${escapeHtml(top.room)}</h2><p>It produced <strong>${formatNumber(top.fanout)} recipient sends</strong> across ${formatNumber(top.ticks)} sampled ticks. Inspect this room's broadcast loop first.</p></div><dl><div><dt>Peak room size</dt><dd>${formatNumber(top.roomSize)}</dd></div><div><dt>p95 tick</dt><dd>${top.p95Ms.toFixed(2)} ms</dd></div><div><dt>Estimated wire</dt><dd>${formatBytes(top.wireBytes)}</dd></div></dl></section>
<section aria-labelledby="fanout-title"><p class="index">01 / FANOUT</p><h2 id="fanout-title">Outbound growth by room</h2><p class="measure">Fanout is messages × recipients. A long bar can reveal duplicated room-wide work even while CPU remains quiet.</p><ol class="bars">${bars}</ol></section>
<section aria-labelledby="rooms-title"><p class="index">02 / SPECIMENS</p><h2 id="rooms-title">Room measurements</h2><div class="table-wrap" tabindex="0" aria-label="Room measurements"><table><caption>Aggregated measurements sorted by fanout</caption><thead><tr><th>Room</th><th>Peak players</th><th>Ticks</th><th>p95 tick</th><th>Messages</th><th>Fanout</th><th>Est. wire</th><th>Errors</th></tr></thead><tbody>${rows}</tbody></table></div></section>` : `<section class="empty"><span aria-hidden="true">⌁</span><h2>No room samples yet</h2><p>Run at least one <code>lens.tick()</code>, then export the report again.</p></section>`}
<aside><strong>Privacy note.</strong> ${trace.roomIdsRedacted ? "Room IDs were replaced with session-scoped labels." : "Room IDs were included without redaction."} TickLens stores measurements, never payload bodies.</aside>
</main><footer>Generated locally by TickLens · schema v${trace.version}</footer><script id="ticklens-data" type="application/json">${safeJson(trace)}</script></body></html>`;
}

const reportCss = `
:root{color-scheme:light;--paper:#f3eedd;--surface:#fffdf5;--ink:#17352b;--muted:#52645c;--moss:#356b4e;--ochre:#b86a22;--line:#a9c8a7}*{box-sizing:border-box}html{background:var(--paper);color:var(--ink);font:16px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}body{margin:0;background-image:repeating-linear-gradient(90deg,transparent 0,transparent 31px,rgba(53,107,78,.045) 32px)}a{color:var(--moss)}.skip{position:absolute;left:-999px;top:8px;background:var(--ink);color:white;padding:10px;z-index:2}.skip:focus{left:8px}header,footer{display:flex;justify-content:space-between;gap:16px;padding:20px max(24px,calc((100vw - 1120px)/2));border-bottom:1px solid var(--line);font-size:13px;letter-spacing:.06em}.brand{font-weight:800}.brand i{display:inline-block;width:9px;height:17px;margin-right:8px;border:2px solid var(--moss);border-radius:100% 0;transform:rotate(-24deg);vertical-align:middle}main{max-width:1120px;margin:auto;padding:72px 24px}.eyebrow,.label,.index{color:var(--moss);font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}h1,h2{font-family:Georgia,Cambria,serif;line-height:1.08;margin:.2em 0 .5em}h1{font-size:clamp(42px,7vw,72px);max-width:14ch}h2{font-size:clamp(28px,4vw,40px)}.finding{display:grid;grid-template-columns:1.2fr 1fr;gap:48px;background:var(--surface);border:1px solid var(--line);border-left:8px solid var(--ochre);padding:32px;margin:48px 0 88px;box-shadow:7px 7px 0 rgba(53,107,78,.12)}.finding h2{font-size:36px}.finding p{max-width:60ch}.finding dl{display:grid;grid-template-columns:repeat(3,1fr);margin:0;gap:16px}.finding dl div{border-left:1px solid var(--line);padding-left:14px}.finding dt{font-size:12px;color:var(--muted)}.finding dd{font:bold 20px Georgia,serif;margin:8px 0}.measure{max-width:68ch;color:var(--muted)}section{margin:0 0 88px}.bars{list-style:none;padding:0;margin:32px 0}.bars li{display:grid;grid-template-columns:minmax(140px,240px) 1fr;align-items:center;gap:20px;margin:14px 0}.bar-label{display:flex;justify-content:space-between;gap:8px}.track{height:18px;background:rgba(169,200,167,.35);border-left:2px solid var(--ink)}.bar{display:block;height:100%;background:var(--moss)}.table-wrap{overflow:auto;border-top:2px solid var(--ink)}table{width:100%;border-collapse:collapse;min-width:800px;font-variant-numeric:tabular-nums}caption{text-align:left;color:var(--muted);padding:12px 0}th,td{text-align:right;padding:14px 12px;border-bottom:1px solid var(--line);white-space:nowrap}th:first-child,td:first-child{text-align:left}.rank{color:var(--ochre);display:inline-block;width:28px}tbody tr:first-child{background:rgba(184,106,34,.08)}aside{border-top:1px solid var(--line);padding:24px 0;color:var(--muted);max-width:75ch}.empty{background:var(--surface);border:1px dashed var(--moss);padding:48px;text-align:center}.empty span{font-size:56px}code{background:#25302b;color:#fffdf5;padding:.15em .35em}footer{border-top:1px solid var(--line);border-bottom:0;color:var(--muted)}:focus-visible{outline:3px solid var(--ochre);outline-offset:3px}@media(max-width:700px){header{align-items:flex-start;flex-direction:column}.finding{grid-template-columns:1fr;padding:24px}.finding dl{grid-template-columns:1fr}.bars li{grid-template-columns:1fr;gap:4px}main{padding-top:48px}}@media(prefers-reduced-motion:no-preference){.bar{animation:grow .24s ease-out both;transform-origin:left}@keyframes grow{from{transform:scaleX(0)}}}@media print{body{background:white}.finding{box-shadow:none}main{padding:32px 0}header,footer{padding:12px 0}}
`;

function percentile(sorted: number[], value: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1)] ?? 0;
}

function sum<T extends keyof TickSample>(samples: TickSample[], key: T): number {
  return samples.reduce((total, sample) => total + (sample[key] as number), 0);
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
