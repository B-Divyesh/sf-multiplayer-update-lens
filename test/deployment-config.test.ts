import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type StaticWebAppConfig = {
  globalHeaders: Record<string, string>;
  routes: Array<{ route: string; headers?: Record<string, string>; redirect?: string; statusCode?: number }>;
  responseOverrides: Record<string, { rewrite: string }>;
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

  it("keeps unknown paths as HTTP 404s while sending the designed page", () => {
    expect(config.responseOverrides["404"]).toEqual({ rewrite: "/404.html" });
    expect(config.routes).toContainEqual({ route: "/demo", redirect: "/demo/", statusCode: 301 });
  });

  it("sends a content policy and denies framing from response headers", () => {
    expect(config.globalHeaders["X-Frame-Options"]).toBe("DENY");
    expect(config.globalHeaders["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(config.globalHeaders["Content-Security-Policy"]).toContain("connect-src 'self' https://api.sociobot.in");
  });
});
