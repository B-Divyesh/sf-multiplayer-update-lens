# TickLens independent QA handoff

## Release status

**FAIL — candidate `e1f1e50b77487462de6b566c05a5e4e4e6483d16` at
https://multiplayer-update-lens.sociobot.in/.**

The deployed files match the candidate exactly. The library and normal product
workflow pass, but the service-worker repair does not persist online updates to
Cache Storage. A client that sees v2 online can revert to cached v1 on its next
offline reload. Mobile purchase legal copy also misses the supplied text-size
and 44×44 target contract.

Full evidence and reproduction details are in
`.factory/verification-3.md`.

## What was verified

- Detached clean checkout at the exact candidate SHA.
- `npm ci`, `npm audit --audit-level=low`, `npm test` (18/18),
  `npm run check`, exact `npm run build`, and `npm run pack:check` all pass.
  There is no lint script.
- An actual 11.4 kB tarball was installed into a clean consumer. ESM,
  CommonJS, strict declarations, Node 18/22, core API boundaries/recovery,
  self-contained reports, and real Socket.IO/`ws` adapters pass.
- The 500-player case ranks the 1,000-send room first. Median probe cost is
  0.438 µs/cycle (0.00263% of a 16.667 ms tick).
- Local and live browser checks cover desktop/390 px, keyboard-only use,
  visible focus, reduced motion, malformed import recovery, paid-license cache
  and recovery, current-release offline reload, downloaded reports, and all
  public routes. Axe found zero violations; there were no console/page errors
  or free-session third-party requests.
- Live candidate hashes match for HTML, service worker, hashed JS/CSS, images,
  and favicon. Security headers and the intended 30-second HTML / one-year
  immutable asset policies are present.
- Fresh Lighthouse mobile report: Performance 98, Accessibility 100, Best
  Practices 100, SEO 100; LCP 1.7 s, CLS 0, TBT 160 ms, 173 KiB transfer.

## Release-blocking defect

`cacheResponse()` clones the network response only after awaiting the cache
open. Chromium has already consumed that response through `respondWith()`, so
the cache write silently fails. In five fresh v1→v2 origins, v2 rendered online
while `caches.match("/")` remained v1; with the origin stopped, offline reload
rendered v1. Live Cache Storage likewise contained only the four install-time
shell entries and no runtime hashed JS/CSS.

Clone before the first `await`, reliably await the write, cover runtime assets,
and add a combined v1 install → v2 online → offline-v2 regression. The current
tests split online update and offline reload into separate contexts, which is
why they pass.

## Additional defect

At 390 px, purchase merchant/legal prose is 11.52 px and its inline legal links
have 13 px-high hit areas, below the supplied legibility and 44×44 touch-target
contract. Increase the prose size and usable link hit areas.

## Re-run commands

```sh
npm ci
npm audit --audit-level=low
npm test
npm run check
npm run build
npm run pack:check
npx vite preview --config site/vite.config.ts --host 127.0.0.1 --port 4173
TICKLENS_TEST_URL=http://127.0.0.1:4173 npm run test:site
TICKLENS_TEST_URL=https://multiplayer-update-lens.sociobot.in npm run test:site
```

Do not publish yet. Registry publishing remains factory-owned; after the two
defects are repaired and independently reverified, publish the ready tarball
through the factory registry workflow.

## Non-blocking hardening

The host still serves soft-200 unknown routes and does not set CSP or an
anti-framing policy.
