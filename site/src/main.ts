import type { TickTrace } from "../../src/types";
import { summarizeRooms } from "../../src/report";
import { validateTrace } from "./trace-validation";

const PRODUCT_SLUG = "multiplayer-update-lens";
const BILLING_BASE = document.documentElement.dataset.billingBase ?? "https://api.sociobot.in";
const LICENSE_KEY = `sb_license:${PRODUCT_SLUG}`;
const VERDICT_KEY = `${LICENSE_KEY}:verdict`;
const TRACE_KEY = "ticklens:field-kit:traces";
const DAY = 86_400_000;

type SavedTrace = { id: string; name: string; importedAt: string; trace: TickTrace };
type Verdict = { valid: boolean; checkedAt: number; reason?: string };

const byId = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
};

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-copy], [data-copy-target]")) {
  button.addEventListener("click", async () => {
    const target = button.dataset.copyTarget ? document.getElementById(button.dataset.copyTarget)?.textContent : undefined;
    const value = button.dataset.copy ?? target ?? "";
    try {
      await navigator.clipboard.writeText(value);
      toast("Copied to clipboard.");
    } catch {
      toast("Clipboard access was blocked. Select the text and copy it manually.");
    }
  });
}

const connection = byId("connection-status");
function updateConnection(): void {
  connection.hidden = navigator.onLine;
  connection.textContent = navigator.onLine ? "" : "You’re offline. The sample and saved traces still work; license checks will resume when connected.";
}
window.addEventListener("online", updateConnection);
window.addEventListener("offline", updateConnection);
updateConnection();

const licenseState = byId("license-state");
const licenseForm = byId<HTMLFormElement>("license-form");
const licenseInput = byId<HTMLInputElement>("license-input");
const traceUpload = byId<HTMLInputElement>("trace-upload");
const uploadButton = byId<HTMLButtonElement>("trace-upload-button");
let unlocked = false;

licenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const token = licenseInput.value.trim();
  if (!token) return;
  localStorage.setItem(LICENSE_KEY, token);
  localStorage.removeItem(VERDICT_KEY);
  licenseInput.value = "";
  void verifyLicense(token, true);
});

traceUpload.addEventListener("change", () => void importTraces(traceUpload.files));
uploadButton.addEventListener("click", () => traceUpload.click());

async function initializeLicense(): Promise<void> {
  const url = new URL(location.href);
  const returnedLicense = url.searchParams.get("license");
  if (returnedLicense) {
    localStorage.setItem(LICENSE_KEY, returnedLicense);
    localStorage.removeItem(VERDICT_KEY);
    url.searchParams.delete("license");
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
  const token = returnedLicense ?? localStorage.getItem(LICENSE_KEY);
  if (!token) {
    setUnlocked(false, "Free edition · reports are fully enabled");
    return;
  }
  const cached = readJson<Verdict>(localStorage.getItem(VERDICT_KEY));
  if (cached?.valid) setUnlocked(true, "Field Kit active · using the saved license");
  if (cached && Date.now() - cached.checkedAt < DAY) {
    if (!cached.valid) setUnlocked(false, "License no longer active. Restore another license or purchase Field Kit.", "error");
    return;
  }
  await verifyLicense(token, false);
}

async function verifyLicense(token: string, requested: boolean): Promise<void> {
  licenseState.className = "license-state warning";
  licenseState.textContent = "Checking the license…";
  try {
    const response = await fetch(`${BILLING_BASE}/api/v1/products/${PRODUCT_SLUG}/verify?license=${encodeURIComponent(token)}`, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Verification returned ${response.status}`);
    const result = await response.json() as { valid: boolean; reason?: string };
    localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: result.valid, reason: result.reason, checkedAt: Date.now() }));
    if (result.valid) setUnlocked(true, "Field Kit active · local retention and compare unlocked");
    else setUnlocked(false, "License no longer active. Restore another license or purchase Field Kit.", "error");
  } catch {
    const cached = readJson<Verdict>(localStorage.getItem(VERDICT_KEY));
    if (cached?.valid) setUnlocked(true, "Offline · Field Kit remains active from the cached verification", "warning");
    else setUnlocked(false, requested ? "We couldn’t verify that license. Check your connection and try again." : "License check is unavailable. Free reports still work.", "warning");
  }
}

function setUnlocked(value: boolean, message: string, tone = ""): void {
  unlocked = value;
  licenseState.className = `license-state ${tone}`.trim();
  licenseState.textContent = message;
  traceUpload.disabled = !value;
  uploadButton.disabled = !value;
  byId("library-help").textContent = value ? "Reports stay on this device. Import the self-contained HTML file produced by TickLens." : "Unlock Field Kit to retain and compare exported reports in this browser.";
  renderLibrary();
}

async function importTraces(files: FileList | null): Promise<void> {
  if (!unlocked || !files?.length) return;
  const error = byId("library-error");
  error.hidden = true;
  const saved = getSavedTraces();
  try {
    const imported: SavedTrace[] = [];
    for (const file of [...files]) {
      const text = await file.text();
      const trace = parseTrace(text, file.type);
      imported.push({ id: crypto.randomUUID(), name: file.name.replace(/\.(html|json)$/i, ""), importedAt: new Date().toISOString(), trace });
    }
    localStorage.setItem(TRACE_KEY, JSON.stringify([...imported.reverse(), ...saved].slice(0, 30)));
    toast(`${files.length} report${files.length === 1 ? "" : "s"} added locally.`);
    renderLibrary();
  } catch (cause) {
    error.textContent = cause instanceof Error ? cause.message : "That report could not be read.";
    error.hidden = false;
  } finally {
    traceUpload.value = "";
  }
}

function parseTrace(text: string, type: string): TickTrace {
  if (type.includes("json") || text.trimStart().startsWith("{")) return validateTrace(JSON.parse(text));
  const document = new DOMParser().parseFromString(text, "text/html");
  const data = document.getElementById("ticklens-data")?.textContent;
  if (!data) throw new Error("This HTML file does not contain embedded TickLens trace data.");
  return validateTrace(JSON.parse(data));
}

function renderLibrary(): void {
  const container = byId("saved-traces");
  const comparison = byId("comparison");
  if (!unlocked) {
    container.innerHTML = "";
    comparison.hidden = true;
    return;
  }
  const saved = getSavedTraces();
  if (!saved.length) {
    container.innerHTML = '<div class="empty-state"><p>No saved reports on this device.</p><span>Use “Add report” to begin a local comparison.</span></div>';
    comparison.hidden = true;
    return;
  }
  container.innerHTML = saved.map((item) => `<div class="trace-item"><div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.trace.serverName ?? "Local trace")} · ${new Date(item.importedAt).toLocaleDateString()}</span></div><button class="remove-button" type="button" data-remove="${item.id}" aria-label="Remove ${escapeHtml(item.name)}">Remove</button></div>`).join("");
  for (const button of container.querySelectorAll<HTMLButtonElement>("[data-remove]")) {
    button.addEventListener("click", () => {
      const item = saved.find((entry) => entry.id === button.dataset.remove);
      if (!item || !confirm(`Remove “${item.name}” from this device?`)) return;
      localStorage.setItem(TRACE_KEY, JSON.stringify(saved.filter((entry) => entry.id !== item.id)));
      renderLibrary();
    });
  }
  renderComparison(saved.slice(0, 2));
}

function renderComparison(items: SavedTrace[]): void {
  const comparison = byId("comparison");
  if (items.length < 2) {
    comparison.hidden = false;
    comparison.innerHTML = "<h3>Comparison</h3><p>Add one more report to compare the two newest captures.</p>";
    return;
  }
  const [newest, previous] = items;
  if (!newest || !previous) return;
  const currentTop = summarizeRooms(newest.trace.samples)[0];
  const oldTop = summarizeRooms(previous.trace.samples)[0];
  const delta = (currentTop?.fanout ?? 0) - (oldTop?.fanout ?? 0);
  comparison.hidden = false;
  comparison.innerHTML = `<p class="specimen-index">Newest vs previous</p><h3>${escapeHtml(newest.name)} / ${escapeHtml(previous.name)}</h3><p>Highest-room fanout changed by <span class="${delta > 0 ? "delta-up" : "delta-down"}">${delta > 0 ? "+" : ""}${format(delta)}</span>.</p><div class="table-scroll" tabindex="0" aria-label="Newest and previous report comparison"><table class="data-table"><thead><tr><th>Report</th><th>Top room</th><th>Fanout</th><th>p95 tick</th></tr></thead><tbody><tr><th>${escapeHtml(newest.name)}</th><td>${escapeHtml(currentTop?.room ?? "No samples")}</td><td>${format(currentTop?.fanout ?? 0)}</td><td>${(currentTop?.p95Ms ?? 0).toFixed(2)} ms</td></tr><tr><th>${escapeHtml(previous.name)}</th><td>${escapeHtml(oldTop?.room ?? "No samples")}</td><td>${format(oldTop?.fanout ?? 0)}</td><td>${(oldTop?.p95Ms ?? 0).toFixed(2)} ms</td></tr></tbody></table></div>`;
}

function getSavedTraces(): SavedTrace[] {
  const serialized = localStorage.getItem(TRACE_KEY);
  const raw = readJson<unknown>(serialized);
  if (!Array.isArray(raw)) {
    if (serialized !== null) localStorage.removeItem(TRACE_KEY);
    return [];
  }
  const valid = raw.filter(isSavedTrace);
  if (valid.length !== raw.length) {
    if (valid.length) localStorage.setItem(TRACE_KEY, JSON.stringify(valid));
    else localStorage.removeItem(TRACE_KEY);
  }
  return valid;
}

function isSavedTrace(value: unknown): value is SavedTrace {
  if (!value || typeof value !== "object") return false;
  const saved = value as Partial<SavedTrace>;
  if (typeof saved.id !== "string" || typeof saved.name !== "string" || typeof saved.importedAt !== "string" || !Number.isFinite(Date.parse(saved.importedAt))) return false;
  try {
    validateTrace(saved.trace);
    return true;
  } catch {
    return false;
  }
}

function readJson<T>(value: string | null): T | undefined {
  if (!value) return undefined;
  try { return JSON.parse(value) as T; } catch { return undefined; }
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

void initializeLicense();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => { void navigator.serviceWorker.register("/sw.js"); });
}
