import { createProbe } from "../../src/probe";
import { summarizeRooms } from "../../src/report";

const DEMO_PREFIX = "demo:ticklens:";

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
};

const sampleReport = byId("sample-report");
const sampleEmpty = byId("sample-empty");
const sampleLoading = byId("sample-loading");

for (const button of document.querySelectorAll<HTMLButtonElement>("#run-sample, [data-run-sample]")) {
  button.addEventListener("click", () => void runSample(true));
}

byId<HTMLButtonElement>("reset-demo").addEventListener("click", resetDemo);
byId<HTMLButtonElement>("start-real").addEventListener("click", () => {
  clearDemoStorage();
  location.assign("/");
});

async function runSample(moveFocus: boolean): Promise<void> {
  sampleEmpty.hidden = true;
  sampleReport.hidden = true;
  sampleLoading.hidden = false;
  for (const button of document.querySelectorAll<HTMLButtonElement>("#run-sample, [data-run-sample]")) button.disabled = true;
  await new Promise((resolve) => window.setTimeout(resolve, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 180));

  let clock = 0;
  const lens = createProbe({ serverName: "Seeded 500-client sample", redactRoomIds: false, clock: () => clock });
  const rooms = [
    { name: "atrium-46", size: 46, ms: 2.2, messages: 1, bytes: 340 },
    { name: "canopy-74", size: 74, ms: 3.1, messages: 2, bytes: 410 },
    { name: "estuary-80", size: 80, ms: 3.5, messages: 1, bytes: 620 },
    { name: "marsh-260", size: 260, ms: 7.4, messages: 260, bytes: 96 },
    { name: "nursery-40", size: 40, ms: 1.8, messages: 3, bytes: 260 },
  ];
  for (let tick = 0; tick < 24; tick += 1) {
    for (const room of rooms) {
      const end = lens.startTick(room.name, { roomSize: room.size, timestamp: Date.now() + tick * 50 });
      lens.recordOutbound(room.name, { bytes: room.bytes, messages: room.messages, recipients: room.size });
      clock += room.ms + (tick % 4) * 0.12;
      end();
    }
  }
  const summaries = summarizeRooms(lens.snapshot().samples);
  const top = summaries[0];
  if (!top) return;
  sampleReport.innerHTML = `
    <div class="finding-card"><div><span class="tag">Highest fanout</span><h2>${escapeHtml(top.room)}</h2><p>The 260-player room broadcasts one update per player to the whole room. Start with its nested send loop.</p></div><div class="finding-number">${format(top.fanout)}<small>recipient sends</small></div></div>
    <div class="table-scroll" tabindex="0" aria-label="Seeded room measurements"><table class="data-table"><caption>120 sampled ticks, sorted by total fanout</caption><thead><tr><th scope="col">Room</th><th scope="col">Players</th><th scope="col">p95 tick</th><th scope="col">Messages</th><th scope="col">Fanout</th><th scope="col">Est. wire</th></tr></thead><tbody>${summaries.map((room) => `<tr><th scope="row">${escapeHtml(room.room)}</th><td>${room.roomSize}</td><td>${room.p95Ms.toFixed(2)} ms</td><td>${format(room.messages)}</td><td><strong>${format(room.fanout)}</strong></td><td>${formatBytes(room.wireBytes)}</td></tr>`).join("")}</tbody></table></div>
    <div class="report-actions"><button id="download-sample" class="button secondary" type="button">Download self-contained report</button><button class="button primary" type="button" data-run-sample>Run sample again</button></div>`;
  sampleReport.tabIndex = -1;
  sampleLoading.hidden = true;
  sampleReport.hidden = false;
  localStorage.setItem(`${DEMO_PREFIX}session`, "sample-active");
  for (const button of document.querySelectorAll<HTMLButtonElement>("#run-sample, [data-run-sample]")) button.disabled = false;
  byId("download-sample").addEventListener("click", () => downloadSample(lens.toHTML({ title: "Seeded 500-client trace" })));
  sampleReport.querySelector<HTMLButtonElement>("[data-run-sample]")?.addEventListener("click", () => void runSample(true));
  if (moveFocus) {
    sampleReport.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    sampleReport.focus({ preventScroll: true });
  }
}

function resetDemo(): void {
  clearDemoStorage();
  sampleReport.replaceChildren();
  sampleReport.hidden = true;
  sampleEmpty.hidden = false;
  for (const button of document.querySelectorAll<HTMLButtonElement>("#run-sample, [data-run-sample]")) button.disabled = false;
  sampleEmpty.querySelector<HTMLButtonElement>("[data-run-sample]")?.focus();
}

function clearDemoStorage(): void {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(DEMO_PREFIX)) localStorage.removeItem(key);
  }
}

function downloadSample(html: string): void {
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "ticklens-seeded-trace.html";
  anchor.click();
  URL.revokeObjectURL(url);
  toast("Report downloaded. It opens offline in any browser.");
}

function updatePlayground(): void {
  const room = byId<HTMLInputElement>("playground-room").value.trim() || "unnamed-room";
  const players = boundedNumber(byId<HTMLInputElement>("playground-players"), 1, 5000);
  const messages = boundedNumber(byId<HTMLInputElement>("playground-messages"), 1, 5000);
  const bytes = boundedNumber(byId<HTMLInputElement>("playground-bytes"), 0, 1_000_000);
  const lens = createProbe({ redactRoomIds: false });
  lens.recordOutbound(room, { bytes, messages, recipients: players });
  const summary = summarizeRooms(lens.snapshot().samples)[0];
  const output = byId<HTMLOutputElement>("playground-output");
  if (!summary) return;
  output.textContent = `${summary.room}: ${format(summary.messages)} updates × ${format(players)} players = ${format(summary.fanout)} recipient sends per tick. Estimated wire: ${formatBytes(summary.wireBytes)}.`;
}

function boundedNumber(input: HTMLInputElement, minimum: number, maximum: number): number {
  const value = Number(input.value);
  return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, Math.floor(value))) : minimum;
}

for (const input of byId<HTMLFormElement>("playground-form").elements) {
  if (input instanceof HTMLInputElement) input.addEventListener("input", updatePlayground);
}

function toast(message: string): void {
  const element = byId("toast");
  element.textContent = message;
  element.hidden = false;
  window.setTimeout(() => { element.hidden = true; }, 2800);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function format(value: number): string { return Math.round(value).toLocaleString("en-US"); }
function formatBytes(bytes: number): string { return bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`; }

updatePlayground();
void runSample(false);
