import { AxeBuilder } from "@axe-core/playwright";
import { chromium } from "playwright";

const baseUrl = process.env.TICKLENS_TEST_URL ?? "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
try {
  for (const path of ["/", "/privacy/", "/terms/"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page }).analyze();
    if (results.violations.length) {
      throw new Error(`${path} axe violations:\n${results.violations.map((item) => `${item.id}: ${item.help} [${item.nodes.map((node) => node.target.join(" ")).join(", ")}]`).join("\n")}`);
    }
    if (errors.length) throw new Error(`${path} console errors:\n${errors.join("\n")}`);
    if (await page.locator("h1").count() !== 1) throw new Error(`${path} must have exactly one h1`);
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Run 500-client sample" }).click();
  await page.getByText("marsh-260", { exact: true }).first().waitFor();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) throw new Error("Home page has horizontal overflow at 390px");
  await context.close();

  const paidContext = await browser.newContext();
  await paidContext.route("https://api.sociobot.in/api/v1/products/multiplayer-update-lens/verify**", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ valid: true, reason: "ok", expires_at: null }) }));
  const paidPage = await paidContext.newPage();
  await paidPage.goto(`${baseUrl}/?license=test-license`, { waitUntil: "networkidle" });
  await paidPage.getByText("Field Kit active · local retention and compare unlocked").waitFor();
  const storedLicense = await paidPage.evaluate(() => localStorage.getItem("sb_license:multiplayer-update-lens"));
  if (storedLicense !== "test-license" || new URL(paidPage.url()).searchParams.has("license")) throw new Error("Returned license was not stored and stripped correctly");
  const trace = (room, fanout) => JSON.stringify({ schema: "ticklens-trace", version: 1, generatedAt: new Date().toISOString(), roomIdsRedacted: true, samples: [{ room, timestamp: Date.now(), durationMs: 4, roomSize: 20, messages: 1, bytes: 10, recipients: fanout, fanout, wireBytes: fanout * 10, failed: false }] });
  await paidPage.locator("#trace-upload").setInputFiles([
    { name: "new.json", mimeType: "application/json", buffer: Buffer.from(trace("room-new", 40)) },
    { name: "old.json", mimeType: "application/json", buffer: Buffer.from(trace("room-old", 20)) },
  ]);
  await paidPage.getByText("Newest vs previous").waitFor();
  await paidContext.close();
  console.log("Site accessibility, console, seeded sample, paid unlock/import, and 390px layout checks passed.");
} finally {
  await browser.close();
}
