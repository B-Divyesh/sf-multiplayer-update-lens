# TickLens independent verification 3 — FAIL

**Date:** 2026-08-28

**Candidate:** `e1f1e50b77487462de6b566c05a5e4e4e6483d16`

**Live URL:** https://multiplayer-update-lens.sociobot.in/

## Verdict

**FAIL.** The candidate is deployed byte-for-byte, and the library, fanout
workflow, malformed-trace recovery, upload focus, accessibility, privacy,
headers, and performance budgets pass. However, the service worker does not
persist successful runtime responses. An online v1→v2 reload displays v2 but
leaves v1 in Cache Storage; the next offline reload therefore regresses to v1.
This reproduces on every fresh origin tested and leaves the prior
update/offline defect only partially repaired.

There is also a medium mobile clarity/target-size defect in the purchase legal
copy. No product code was changed during verification.

## Clean checkout and repository gates

All build/package checks ran in the detached clean checkout
`/tmp/ticklens-verify-3-f3yNFJ/candidate` at the requested SHA. Environment:
Node `v22.23.2`, npm `10.9.8`.

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

Results:

- Clean install passed; 128 packages were audited with 0 vulnerabilities.
- `npm test` passed: 4 files / 18 tests.
- `npm run check` (`tsc --noEmit`) passed. The repository has no lint script.
- The exact production build passed and emitted ESM, CommonJS, declarations,
  source maps, and `dist/site/`.
- `npm pack --dry-run` passed: 7 publish files, 11.4 kB tarball / 47.6 kB
  unpacked.
- Both local and live repository browser suites passed. Their service-worker
  assertions test a current-release offline reload and a separate online
  cross-deployment update, but do not test an offline reload after that update;
  that missing combined state is where the blocker occurs.

## Packed library and core job-to-be-done

An actual tarball was installed into a separate clean npm consumer with real
Socket.IO 4 and `ws` 8 dependencies.

- ESM and CommonJS imports passed on Node 22 and the declared minimum Node
  `18.20.8`.
- The published `.d.ts` surface compiled in a strict NodeNext TypeScript
  consumer.
- A representative two-room, 500-player trace ranked `highest-500` first with
  exactly 1,000 recipient sends. The self-contained report exposed the same
  finding.
- Real Socket.IO and WebSocket sends were counted without retaining the
  sentinel payload. Teardown restored the wrapped methods.
- Default room redaction removed a sentinel room ID from snapshots and HTML.
  The generated report made no network requests.
- Empty output, `clear()`, one-sample retention rollover, sampling at zero,
  synchronous failure and recovery, blank room IDs, invalid sampling/retention
  options, and negative/non-finite measurement sanitization were exercised.
- Five 500,000-cycle measurements after warm-up had a median cost of
  0.438 µs for start tick + outbound record + end tick, or 0.00263% of a
  16.667 ms game tick. This passes the under-2% constraint.

The npm registry still returns `E404` for `multiplayer-update-lens@0.1.0`.
This is not counted as a candidate defect because the publishing contract
explicitly reserves registry credentials and publishing to the factory. The
tarball itself is ready to publish.

## Browser, accessibility, privacy, and paid-flow evidence

- Independent Playwright + axe runs covered `/`, `/privacy/`, and `/terms/` at
  1440×900 and 390×844. All six combinations returned 200, had a title,
  `lang="en"`, exactly one H1 and one main landmark, no horizontal overflow,
  no missing image alt text, no console/page/request failures, and zero axe
  violations (therefore zero serious/critical findings).
- Keyboard-only traversal reached the visible skip link first, showed the 3 px
  ochre focus indicator at every sampled stop, and activated the 500-client
  sample with Enter. `marsh-260` appeared as highest fanout with 1,622,400
  recipient sends in 476 ms.
- The downloaded `ticklens-seeded-trace.html` had one H1/main, identified
  `marsh-260`, made no network requests, emitted no errors, and had zero axe
  violations.
- At 390 px, the viewport and document widths were both 390 px. Primary
  buttons and controls were at least 44 px high. Under reduced motion the
  seeded result appeared in 98–115 ms, transitions were reduced to 0.01 ms,
  and no continuing animation remained.
- The repaired upload control exposes a visible 3 px focus ring on its visible
  label. Mixed valid/invalid imports are atomic, malformed and legacy traces
  no longer cause reload errors, and a following valid import recovers.
- A returned license was stored at
  `sb_license:multiplayer-update-lens`, removed from the URL, and verified once.
  A reload within the daily cache window made no second request. A simulated
  503 produced actionable recovery copy, and a later valid verification
  unlocked successfully.
- A fresh free session had empty local/session storage, no cookies or IndexedDB,
  and made only same-origin requests. It made no billing request. Source and
  package inspection found no analytics, telemetry, CDN font, or third-party
  script.
- `/opt/fleet/lib/verify-url.sh` passed live: HTTP 200, 2,130 ms load, valid
  title/lang/H1/main/alt/button basics, and zero browser errors.

## Deployment identity, policies, and budgets

Fresh local build and live SHA-256 hashes match exactly:

- `index.html`:
  `99ff8632deda5ad14d3e1aafff1cdcedcd802915890df71fe0976362e277a5b2`
- `privacy/index.html`:
  `194c2e8f000ce350b2c75aafb454f9999601344e9b4a465a0575368d361f372e`
- `terms/index.html`:
  `b65d676621573bec902ef2e94a4b51e2b7f3bf237ac78dec284460bc1421523e`
- `sw.js`:
  `dcb9d6a0260ee8cdb9d504d41f52ebf2184380135fc76f989ca81a64046a237b`
- `assets/index-rR1HUF43.js`:
  `b0304f09a7a6124f13a17503dd29e8a7a4481cd20e9cfa59744e0281d54b587a`
- `assets/styles-CbViIhgr.css`:
  `9fbdac82729757f9439221e402cfac74c184bc1a7b71298b0e811d459a9c9268`

Both hero images and the favicon also matched. The live deployment is the
candidate production artifact.

- `/`, privacy, terms, and `/sw.js` use
  `Cache-Control: public, max-age=30, must-revalidate`.
- Hashed JS/CSS use `public, max-age=31536000, immutable`.
- HTTPS responses include HSTS, `nosniff`, strict-origin referrer policy, and
  restrictive camera/microphone/geolocation permissions.
- Built JS is 21,753 B (8.69 kB gzip), CSS is 13,715 B (3.91 kB gzip), font
  payload is 0 B, mobile hero is 43,548 B, and the largest hero is 159,642 B.
  All asset budgets pass.
- Fresh Lighthouse 12.8.2 mobile output: Performance 98, Accessibility 100,
  Best Practices 100, SEO 100; FCP 1.0 s, LCP 1.7 s, CLS 0, TBT 160 ms, Speed
  Index 1.1 s, total transfer 173 KiB. Lighthouse emitted a Chromium tab-crash
  after writing the complete report, so the CLI exit was nonzero; the report
  and all category/audit values were present.

## Defects

### High — online updates are not written to the offline cache

The worker's `cacheResponse()` waits for `caches.open()` before cloning the
network `Response`:

```js
async function cacheResponse(request, response) {
  if (response.ok) await (await caches.open(CACHE)).put(request, response.clone());
}
```

The same response is concurrently returned by `respondWith()`. By the time the
cache opens, Chromium has consumed the body and `response.clone()` cannot
produce the cache entry. The navigation path swallows that rejection; the
asset path starts it with `void`, so both fail silently.

Fresh controlled reproduction using the exact built `sw.js`:

1. Serve v1 with `Cache-Control: no-store`, install/activate the worker, and
   confirm the v1 shell is cached.
2. Change only the origin HTML to v2, leaving `sw.js` byte-identical.
3. Reload online and wait for the v2 heading.
4. Read `caches.match("/")`.

Across five isolated origins the result was identical:

```text
online heading: v2
cached heading: v1
```

After stopping the origin and reloading, the page cleanly rendered v1 again:

```json
{"onlineBefore":"v2","cachedBefore":"v1","offlineHeading":"v1","reloadError":""}
```

The live site confirms the related asset failure. After activation and a
controlled online reload, `ticklens-shell-v1` contained only the four install
entries (`/`, full hero, privacy, terms); hashed JS, CSS, and the mobile hero
were not added at runtime. Its apparent offline success therefore depends on
ordinary HTTP cache state rather than the declared service-worker cache.

**Impact:** an installed client can display a repaired/new release online and
then silently revert to an older application when offline. Updated JS/CSS are
also not reliably retained by the service worker. This violates the requested
service-worker update/offline path and the product's stated offline behavior.

**Required resolution:** clone the successful response synchronously before
the first `await`, await the cache write via `event.waitUntil`, and cover both
navigations and runtime assets. Add one regression that performs v1 install →
v2 online update → origin unavailable/Browser HTTP cache unavailable → v2
offline reload, and asserts the cached HTML and hashed assets are v2.

### Medium — purchase legal text and links miss the mobile clarity/target contract

At 390 px, `.merchant` and `.legal-copy` render at 11.52 px, below the visual
thesis's 14 px minimum scale and the attached 16 px body-text baseline. The
inline `terms` and `privacy notice` links have measured hit boxes of
34.6×13 px and 96.8×13 px; the footer Terms link is 41.3×44 px. These are below
the stated 44×44 CSS px touch target. Axe does not flag conventional inline
link exceptions, but the supplied product/design contract is stricter and the
affected text explains purchase terms and privacy.

**Required resolution:** render purchase disclosure prose at a legible mobile
size and expand the legal-link hit areas without obscuring surrounding text.

## Non-blocking deployment hardening

- Unknown routes return the home document with HTTP 200 (soft 404).
- No CSP or anti-framing (`frame-ancestors`/`X-Frame-Options`) policy is set.

## Required next verification

After repair and deployment, rerun all clean repository and packed-consumer
gates. Most importantly, test the combined v1 → v2 online → offline sequence
and verify Cache Storage contains v2 HTML plus its hashed assets. Recheck the
390 px legal copy/targets, live byte identity, axe, console/page errors,
headers, caching, and Lighthouse.
