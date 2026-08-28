import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type StaticWebAppConfig = {
  globalHeaders: Record<string, string>;
  routes: Array<{ route: string; headers?: Record<string, string> }>;
};

const config = JSON.parse(
  readFileSync(new URL("../site/public/staticwebapp.config.json", import.meta.url), "utf8"),
) as StaticWebAppConfig;

describe("static deployment cache policy", () => {
  it("keeps the HTML shell and service worker revalidating", () => {
    expect(config.globalHeaders["Cache-Control"]).toBe("public, max-age=30, must-revalidate");
  });

  it("gives Vite's content-hashed assets a one-year immutable cache policy", () => {
    expect(config.routes).toContainEqual({
      route: "/assets/*",
      headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    });
  });
});
