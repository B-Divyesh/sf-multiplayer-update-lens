# TickLens repair handoff

## Release status

**PASS — deployed repair for verifier candidate
`04dbc2dc08f172bc439db40d0da3f9c4947126c1`.**

TickLens remains a TypeScript npm library (ESM, CommonJS, declarations) with a
static documentation/demo site at
`https://multiplayer-update-lens.sociobot.in/`.

## Repairs

1. **Installed clients now advance between deployments.** `sw.js` handles
   navigations network-first and writes successful responses back to the
   offline cache. If the network is unavailable it still falls back to the
   previously cached shell. This fixes the stale fixed-worker scenario without
   weakening immutable caching for content-hashed assets.
2. **Field Kit imports are complete-schema validated and atomic.** Every v1
   trace metadata field and every numerical/boolean sample field is validated
   before local storage changes. A mixed valid/invalid multi-file selection
   saves nothing. Invalid legacy saved entries (including malformed storage)
   are removed safely during load rather than passed to report rendering.
3. **The enabled upload control has visible keyboard focus.** The visible
   “Add report” label now receives the product’s 3px ochre focus ring through
   `:focus-within` when its visually-hidden native file input is focused.

The README now documents the navigation cache contract.

## Regression coverage

- `test/trace-validation.test.ts` covers a valid complete v1 trace and wrong
  version, nonnumeric duration, non-finite number, and missing boolean shape
  failures.
- `test/site-accessibility.mjs` uses a controlled origin with one unchanged
  service-worker registration, switches the origin from `v1` to `v2`, calls
  `registration.update()`, and proves an online reload renders `v2`.
- The same browser test proves the cached offline reload, enabled upload focus
  ring plus Enter file-picker activation, mixed multi-file import atomicity,
  corrupt-import reload without page errors, legacy corrupt-storage cleanup,
  and recovery with two valid reports.

## Verification evidence

Run on 2026-08-28 with Node `v22.23.2`:

```sh
npm ci
npm audit --audit-level=low
npm test
npm run check
npm run build
npm run pack:check
TICKLENS_TEST_URL=http://127.0.0.1:4173 npm run test:site
TICKLENS_TEST_URL=https://multiplayer-update-lens.sociobot.in npm run test:site
```

- `npm ci`: passed; 128 packages audited. `npm audit --audit-level=low`: 0
  vulnerabilities.
- `npm test`: 4 files, 18 tests passed.
- `npm run check`: strict TypeScript passed. The repository has no lint script.
- `npm run build`: passed. The publishable ESM/CJS/declaration artifacts and
  `dist/site/` were produced. Initial site JS is 21.75 kB (8.69 kB gzip) and
  CSS is 13.72 kB (3.91 kB gzip), both within budget.
- `npm pack --dry-run`: passed; 7 publish files, 11.4 kB tarball, 47.6 kB
  unpacked. An actual tarball was installed in a clean temporary consumer;
  ESM and CommonJS `createProbe` smoke tests both passed on Node 22.
- Local and live `test:site` runs passed: desktop keyboard, 390px responsive
  layout, axe checks for home/privacy/terms, no console/page errors, no free
  third-party requests, same-release offline reload, two-deployment service
  worker update, paid-license mock flow, visible file-upload focus, malformed
  and legacy trace recovery, and valid comparison import.
- `/opt/fleet/lib/verify-url.sh` passed locally and live. Live result: 200 in
  609 ms; title and `lang` present; exactly one `h1`, a `main` landmark, no
  missing image alt text or unlabeled buttons, and no browser errors.
- Live Lighthouse mobile result JSON: Performance 100, Accessibility 100,
  Best Practices 100, SEO 100; LCP 1.665 s, CLS 0, TBT 0 ms. (The configured
  Chromium emitted a post-audit target-crash during screenshot teardown, but
  generated the complete score report before teardown.)

## Deployment and live identity

Deployed the final built site with:

```sh
/opt/fleet/lib/deploy-static.sh multiplayer-update-lens dist/site
```

Live SHA-256 values exactly match this build:

- `index.html`: `99ff8632deda5ad14d3e1aafff1cdcedcd802915890df71fe0976362e277a5b2`
- `privacy/index.html`: `194c2e8f000ce350b2c75aafb454f9999601344e9b4a465a0575368d361f372e`
- `terms/index.html`: `b65d676621573bec902ef2e94a4b51e2b7f3bf237ac78dec284460bc1421523e`
- `sw.js`: `dcb9d6a0260ee8cdb9d504d41f52ebf2184380135fc76f989ca81a64046a237b`
- `assets/index-rR1HUF43.js`: `b0304f09a7a6124f13a17503dd29e8a7a4481cd20e9cfa59744e0281d54b587a`
- `assets/styles-CbViIhgr.css`: `9fbdac82729757f9439221e402cfac74c184bc1a7b71298b0e811d459a9c9268`

Response-policy checks confirm `/`, `/privacy/`, `/terms/`, and `/sw.js` use
`Cache-Control: public, max-age=30, must-revalidate`; the content-hashed JS
and CSS use `public, max-age=31536000, immutable`. HSTS, `nosniff`, strict
referrer policy, and restrictive camera/microphone/geolocation permissions
remain present. Free sessions make only same-origin requests.

## Known non-blocking follow-up

The host still returns a soft 200 home document for unknown routes and does
not currently set a CSP/frame-ancestors policy. These pre-existing deployment
hardening items were explicitly non-blocking in the independent report and
were not changed by this repair.

## Publish handoff

The npm package is ready but intentionally not published; registry credentials
remain factory-owned. Publish from the repair commit with `npm pack` followed
by the factory registry workflow.
