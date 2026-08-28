# TickLens handoff

## What shipped

- Publish-ready `multiplayer-update-lens@0.1.0` TypeScript package with ESM, CommonJS, and `.d.ts` outputs.
- Small probe API for timed room ticks and outbound byte/message/recipient measurements, capped in-memory retention, error marking, sampling, and session-scoped room ID redaction by default.
- Socket.IO adapter for room broadcasts and a WebSocket server adapter that observes individual sends. Neither captures payload contents.
- Self-contained, offline HTML report with embedded trace data, highest-fanout finding, p95 tick timing, wire-byte estimates, accessible tables, print styling, empty state, and no runtime dependencies.
- Botanical field-guide documentation site with an interactive seeded 500-client test. Its deliberately quadratic `marsh-260` room is immediately identified as the highest-fanout room.
- $29 one-time Field Kit flow using the Sociobot checkout/verify contract: returned-license storage and URL cleanup, daily verdict cache, optimistic offline unlock, restore field, inactive-license state, and a browser-local 30-report library with two-report comparison.
- `/privacy/` and `/terms/`, offline messaging, versioned service-worker shell cache, static-host headers config, robots/sitemap, keyboard and 390px layouts.
- Original factory-generated herbarium hero plus 720px responsive derivative. Full prompt and provenance are in `.factory/design.md`.

## Run and verify

```sh
npm install
npm test
npm run check
npm run build
npm pack --dry-run
```

`npm run build` is the work-order build command. It writes the deployable static entry to `dist/site/index.html` and library artifacts to `dist/index.js`, `dist/index.cjs`, and `dist/index.d.ts`.

For the browser suite, serve the build with `npx vite preview --config site/vite.config.ts`, then run `npm run test:site`. It checks all three pages with axe, captures console errors, exercises the 390px seeded sample, verifies the license-return flow against a mocked Sociobot response, imports two reports, and confirms comparison output.

Verification completed on 2026-08-28:

- `npm test`: 11/11 tests passed across core math, redaction, async errors, capped retention, report output, ESM-style documented flow, and both adapters.
- `npm run check`: strict TypeScript passed.
- `npm run build`: passed; site JS 19.95 KB (8.22 KB gzip), CSS 13.64 KB (3.90 KB gzip), mobile hero 43 KB, largest hero 156 KB, no font payload.
- `npm pack --dry-run`: passed; 11.2 KB tarball, 47.3 KB unpacked, seven publish files.
- `npm audit --audit-level=low`: zero vulnerabilities (an override pins the patched esbuild used by build-only tooling).
- Browser/axe suite: zero violations and zero console errors on home, privacy, and terms; seeded and paid flows passed; no 390px document overflow.
- Lighthouse 12.8.2 mobile, simulated throttling: Performance 99, Accessibility 100, Best Practices 100, SEO 100; LCP 2.0 s, FCP 0.9 s, CLS 0, TBT 0 ms. INP is unavailable for a synthetic no-user-input navigation; Playwright covers the main interaction.
- Probe microbenchmark: 500,000 tick + outbound + end cycles averaged 1.20 μs each, approximately 0.0072% of a 16.7 ms game tick (well under the 2% budget on this worker).
- CJS and ESM consumption smoke tests passed.

## Known gaps and next steps

- The factory must register the `multiplayer-update-lens` paid product before checkout/verification can succeed in production. No product ID or payment-provider integration is embedded here.
- Socket.IO instrumentation is per namespace and attaches to the adapter that exists when called; applications with multiple or dynamically replaced namespaces should call it for each namespace after initialization.
- Byte counts are deliberate estimates based on serialized packets or outgoing buffers, not network-layer packet capture, compression, or protocol framing.
- Browser-local Field Kit data is device-specific by design; hosted team sync/retention remains a paid-tier future direction, not a hidden v1 dependency.
- The npm package is named `multiplayer-update-lens` because the shorter unscoped `ticklens` name is already owned by an unrelated registry package.
