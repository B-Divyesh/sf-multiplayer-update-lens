import { AxeBuilder } from "@axe-core/playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.TICKLENS_TEST_URL ?? "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
try {
  for (const path of ["/", "/demo/", "/privacy/", "/terms/"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("request", (request) => requests.push(request.url()));
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).analyze();
    if (results.violations.length) {
      throw new Error(`${path} axe violations:\n${results.violations.map((item) => `${item.id}: ${item.help} [${item.nodes.map((node) => node.target.join(" ")).join(", ")}]`).join("\n")}`);
    }
    if (errors.length) throw new Error(`${path} console errors:\n${errors.join("\n")}`);
    const thirdPartyRequests = requests.filter((url) => new URL(url).origin !== new URL(baseUrl).origin);
    if (thirdPartyRequests.length) throw new Error(`${path} made third-party requests:\n${thirdPartyRequests.join("\n")}`);
    if (await page.locator("h1").count() !== 1) throw new Error(`${path} must have exactly one h1`);
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.setItem("ticklens:field-kit:traces", "real-traces-remain-untouched"));
  await page.getByRole("link", { name: "Run 500-client sample" }).click();
  await page.getByText("Demo — sample data, nothing is saved").waitFor();
  await page.getByText("marsh-260", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await page.getByText("The sample was reset.").waitFor();
  const demoResetState = await page.evaluate(() => ({
    real: localStorage.getItem("ticklens:field-kit:traces"),
    demoKeys: Object.keys(localStorage).filter((key) => key.startsWith("demo:")),
  }));
  if (demoResetState.real !== "real-traces-remain-untouched" || demoResetState.demoKeys.length) {
    throw new Error(`Reset demo changed real storage or left demo data behind: ${JSON.stringify(demoResetState)}`);
  }
  await page.getByRole("button", { name: "Run the 500-client sample" }).click();
  await page.getByText("marsh-260", { exact: true }).first().waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) throw new Error("Demo page has horizontal overflow at 390px");
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const purchaseDisclosure = await page.locator(".merchant, .legal-copy").evaluateAll((elements) => elements.map((element) => ({
    className: element.className,
    fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
  })));
  if (purchaseDisclosure.some(({ fontSize }) => fontSize < 16)) {
    throw new Error(`Purchase disclosure text is smaller than 16px at 390px: ${JSON.stringify(purchaseDisclosure)}`);
  }
  const mobileLegalTargets = await page.locator(".legal-copy a, .site-footer nav a").evaluateAll((links) => links.map((link) => {
    const box = link.getBoundingClientRect();
    return { text: link.textContent?.trim(), width: box.width, height: box.height };
  }));
  if (mobileLegalTargets.some(({ width, height }) => width < 44 || height < 44)) {
    throw new Error(`Legal links are smaller than 44x44px at 390px: ${JSON.stringify(mobileLegalTargets)}`);
  }
  await context.close();

  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto(baseUrl, { waitUntil: "networkidle" });
  await desktopPage.keyboard.press("Tab");
  if (!await desktopPage.locator(".skip-link").evaluate((element) => element === document.activeElement)) {
    throw new Error("Skip link is not the first desktop keyboard target");
  }
  await desktopPage.getByRole("link", { name: "Run 500-client sample" }).focus();
  await desktopPage.keyboard.press("Enter");
  await desktopPage.waitForURL(/\/demo\/$/);
  await desktopPage.getByText("marsh-260", { exact: true }).first().waitFor();
  await desktopContext.close();

  const offlineContext = await browser.newContext();
  const offlinePage = await offlineContext.newPage();
  await offlinePage.goto(baseUrl, { waitUntil: "networkidle" });
  await offlinePage.evaluate(() => navigator.serviceWorker.ready);
  await offlinePage.reload({ waitUntil: "networkidle" });
  await offlineContext.setOffline(true);
  await offlinePage.reload({ waitUntil: "domcontentloaded" });
  await offlinePage.getByRole("heading", { level: 1 }).waitFor();
  await offlineContext.close();

  const updateServer = await startUpdateServer();
  try {
    const updateContext = await browser.newContext();
    const updatePage = await updateContext.newPage();
    const cdp = await updateContext.newCDPSession(updatePage);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await updatePage.goto(updateServer.origin, { waitUntil: "domcontentloaded" });
    await updatePage.evaluate(async () => {
      await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
    });
    await updatePage.reload({ waitUntil: "networkidle" });
    await updatePage.getByRole("heading", { name: "TickLens deployment v1" }).waitFor();
    await updatePage.waitForFunction(() => navigator.serviceWorker.controller !== null);
    updateServer.deploy("v2");
    await updatePage.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
    await updatePage.reload({ waitUntil: "networkidle" });
    await updatePage.getByRole("heading", { name: "TickLens deployment v2" }).waitFor();
    await updatePage.waitForFunction(() => document.documentElement.dataset.release === "v2");
    await updatePage.waitForFunction(async () => {
      const [html, script, style] = await Promise.all([
        caches.match("/").then((response) => response?.text()),
        caches.match("/assets/app-v2.js").then((response) => response?.text()),
        caches.match("/assets/app-v2.css").then((response) => response?.text()),
      ]);
      return html?.includes("deployment v2") && script?.includes('release = "v2"') && style?.includes("release-v2");
    });
    const cachedV2 = await updatePage.evaluate(async () => {
      const paths = ["/", "/assets/app-v2.js", "/assets/app-v2.css"];
      const entries = await Promise.all(paths.map(async (path) => {
        const response = await caches.match(path);
        return [path, response ? await response.text() : null];
      }));
      return Object.fromEntries(entries);
    });
    if (!cachedV2["/"]?.includes("deployment v2") || !cachedV2["/assets/app-v2.js"]?.includes('release = "v2"') || !cachedV2["/assets/app-v2.css"]?.includes("release-v2")) {
      throw new Error(`The online v2 deployment was not persisted completely: ${JSON.stringify(cachedV2)}`);
    }
    await updateContext.setOffline(true);
    await updatePage.reload({ waitUntil: "domcontentloaded" });
    await updatePage.getByRole("heading", { name: "TickLens deployment v2" }).waitFor();
    await updatePage.waitForFunction(() => document.documentElement.dataset.release === "v2");
    await updateContext.close();
  } finally {
    await updateServer.close();
  }

  const paidContext = await browser.newContext();
  await paidContext.route("https://api.sociobot.in/api/v1/products/multiplayer-update-lens/verify**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ valid: true, reason: "ok", expires_at: null }) }));
  const paidPage = await paidContext.newPage();
  await paidPage.goto(`${baseUrl}/?license=test-license`, { waitUntil: "networkidle" });
  await paidPage.getByText("Field Kit active · local retention and compare unlocked").waitFor();
  const storedLicense = await paidPage.evaluate(() => localStorage.getItem("sb_license:multiplayer-update-lens"));
  if (storedLicense !== "test-license" || new URL(paidPage.url()).searchParams.has("license")) throw new Error("Returned license was not stored and stripped correctly");
  const trace = (room, fanout) => JSON.stringify({ schema: "ticklens-trace", version: 1, generatedAt: new Date().toISOString(), roomIdsRedacted: true, samples: [{ room, timestamp: Date.now(), durationMs: 4, roomSize: 20, messages: 1, bytes: 10, recipients: fanout, fanout, wireBytes: fanout * 10, failed: false }] });
  const pageErrors = [];
  paidPage.on("pageerror", (error) => pageErrors.push(error.message));
  await paidPage.locator("#trace-upload-button").focus();
  const uploadFocus = await paidPage.locator(".upload-button").evaluate((label) => ({
    activeId: document.activeElement?.id,
    outline: getComputedStyle(label).outline,
  }));
  if (uploadFocus.activeId !== "trace-upload-button" || !uploadFocus.outline.includes("rgb(184, 106, 34)")) {
    throw new Error("The unlocked Add report control has no visible keyboard focus indicator");
  }
  const chooser = paidPage.waitForEvent("filechooser");
  await paidPage.locator("#trace-upload-button").press("Enter");
  await chooser;
  await paidPage.locator("#trace-upload").setInputFiles([
    { name: "valid-but-not-saved.json", mimeType: "application/json", buffer: Buffer.from(trace("room-valid", 20)) },
    { name: "invalid-duration.json", mimeType: "application/json", buffer: Buffer.from(trace("room-invalid", 20).replace('"durationMs":4', '"durationMs":"not-a-number"')) },
  ]);
  await paidPage.locator("#library-error:not([hidden])").waitFor();
  const importedAfterFailure = await paidPage.evaluate(() => localStorage.getItem("ticklens:field-kit:traces"));
  if (importedAfterFailure !== null) throw new Error("A multi-file import saved traces before validating every file");
  await paidPage.reload({ waitUntil: "networkidle" });
  if (pageErrors.length) throw new Error(`Corrupt trace import caused page errors after reload: ${pageErrors.join("\n")}`);
  await paidPage.evaluate(() => localStorage.setItem("ticklens:field-kit:traces", JSON.stringify([
    { id: "legacy-corrupt", name: "legacy", importedAt: new Date().toISOString(), trace: { schema: "ticklens-trace", version: 1, generatedAt: new Date().toISOString(), roomIdsRedacted: true, samples: [{ room: "legacy", timestamp: 1, durationMs: "not-a-number" }] } },
  ])));
  await paidPage.reload({ waitUntil: "networkidle" });
  const legacyTraces = await paidPage.evaluate(() => localStorage.getItem("ticklens:field-kit:traces"));
  if (legacyTraces !== null || pageErrors.length) throw new Error("Corrupt legacy traces were not removed safely on reload");
  await paidPage.locator("#trace-upload").setInputFiles([
    { name: "new.json", mimeType: "application/json", buffer: Buffer.from(trace("room-new", 40)) },
    { name: "old.json", mimeType: "application/json", buffer: Buffer.from(trace("room-old", 20)) },
  ]);
  await paidPage.getByText("Newest vs previous").waitFor();
  await paidContext.close();
  console.log("Site accessibility, console, keyboard focus, offline reload, cross-deployment updates, seeded sample, paid unlock/import validation, and 390px layout checks passed.");
} finally {
  await browser.close();
}

async function startUpdateServer() {
  const worker = await readFile(new URL("../dist/site/sw.js", import.meta.url), "utf8");
  let marker = "v1";
  const server = createServer((request, response) => {
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
      response.end(`:root { --release-${marker}: 1; } /* release-${marker} */`);
      return;
    }
    response.writeHead(200, { "content-type": pathname.endsWith(".webp") ? "image/webp" : "text/html" });
    response.end("offline shell");
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not start service-worker update server");
  return {
    origin: `http://127.0.0.1:${address.port}`,
    deploy(nextMarker) { marker = nextMarker; },
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}
