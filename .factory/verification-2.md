# TickLens independent verification 2 — FAIL

**Date:** 2026-08-28

**Candidate:** `04dbc2dc08f172bc439db40d0da3f9c4947126c1`

**Live URL:** https://multiplayer-update-lens.sociobot.in/

## Verdict

**FAIL.** The publishable library, its core fanout workflow, the current live
artifact, privacy defaults, responsive layout, current-release offline reload,
and performance budgets all pass. Three independently reproduced defects keep
the candidate from meeting the acceptance contract:

1. the service worker cannot advance an already controlled client when a later
   deployment changes the app but leaves the static `sw.js` unchanged;
2. structurally invalid trace files are saved before validation and then cause
   a page error on every later load; and
3. the enabled paid report-upload control has no visible keyboard focus.

The earlier deployment cache failure is repaired: current content-hashed JS and
CSS responses have a one-year immutable policy. This verdict comes from fresh
evidence against the requested candidate, not from the earlier report.

## Clean checkout and repository gates

All build/package checks ran from the separate clean clone
`/tmp/ticklens-verify-2-OgFqUq/candidate`, detached at the candidate SHA. No
product code or configuration was changed during verification.

Environment: Node `v22.23.2`, npm `10.9.8`.

```sh
npm ci
npm audit --audit-level=low
npm test
npm run check
npm run build
npm run pack:check
TICKLENS_TEST_URL=http://127.0.0.1:4173 npm run test:site
```

Results:

- Clean install passed; 128 packages audited with 0 vulnerabilities.
- `npm test` passed: 3 files / 13 tests.
- `npm run check` (`tsc --noEmit`) passed. There is no lint script in the
  repository.
- The exact production build passed and emitted ESM, CommonJS, declarations,
  and `dist/site/`.
- `npm pack --dry-run` and an actual `npm pack` passed: 7 publish files,
  11.3 kB tarball / 47.5 kB unpacked.
- The repository's browser suite passed against the local production preview,
  including axe, mobile layout, keyboard activation, current-release offline
  reload, seeded sample, and paid import.

## Packed-library and job-to-be-done checks

The actual tarball was installed into a new consumer alongside real Socket.IO
4 and `ws` 8 servers/clients.

- ESM and CommonJS imports passed on Node 22 and the declared minimum Node
  `18.20.8`.
- The packed `.d.ts` surface compiled in a strict NodeNext TypeScript consumer.
- A two-room 500-player trace ranked `highest-500` first with exactly 1,000
  recipient sends; the self-contained report exposed the same result.
- Real Socket.IO and WebSocket sends were counted without retaining either
  sentinel payload. Adapter teardown restored the original send/broadcast
  methods.
- Default room redaction removed the sentinel room ID from both snapshots and
  HTML. Reports made no outbound requests.
- Empty reports, explicit `clear()`, one-sample retention rollover, sampling at
  zero, sync failure marking, subsequent recovery, negative/non-finite count
  sanitization, blank room IDs, invalid sampling rates, and invalid retention
  limits were exercised.
- Populated and empty generated reports passed at 1440×900 and 390×844 with no
  horizontal overflow, no page errors or requests, and zero axe
  serious/critical findings.
- Five measured 500,000-cycle probe benchmarks after one warm-up measured a
  median 0.488 µs for start tick + outbound record + end tick, or 0.00293% of
  a 16.667 ms game tick. This is within the under-2% constraint.

The npm registry currently returns `E404` for `multiplayer-update-lens`. That is
not treated as a candidate defect because the attached publishing contract
explicitly reserves registry publishing to the factory; the tarball is ready
to publish.

## Live deployment, browser, privacy, and budgets

### Deployment identity

Freshly built and live bytes have identical SHA-256 hashes for `index.html`,
privacy, terms, `sw.js`, both hero images, and the hashed JS/CSS. Examples:

- home: `026c6d5fd07f9d4c1d42b4feb5d226affac0101a8db6c3f8fd481a5c259b1efa`
- JS `index-CUXn_gRh.js`:
  `d625508598210056b1e2956c0d3d74a659988eb89bce5573ef79183edaf4e78e`
- CSS `styles-CxbZJ8Ep.css`:
  `732ac3146d022c2e8a633d0df5144106258c0e0671c610c5311f333fc5104a53`
- service worker:
  `eef0dd3f3666e08654a7fddc9b8723442d4b941c63230c6be4cfe20508f28459`

The live network artifact therefore matches this candidate's production
output byte-for-byte (the candidate's own changes after the repair are tests
and handoff text only).

### Browser and accessibility

- Fresh Playwright passes covered `/`, `/privacy/`, and `/terms/` at 1440×900
  and 390×844: correct title/lang, one H1, one main, image alt text, no overflow,
  zero console/page errors, zero failed requests, and zero axe violations
  (therefore zero serious/critical).
- Keyboard-only use reached a visible skip link first, bypassed header
  navigation, showed a 3 px focus ring, and ran the sample with Enter.
- The live seeded test named `marsh-260` first with 1,622,400 recipient sends;
  report download produced `ticklens-seeded-trace.html`.
- Nine visible primary mobile controls were at least 44×44 CSS px. The 390 px
  page had no horizontal overflow.
- Under `prefers-reduced-motion: reduce`, computed transition duration was
  `1e-05s`; the seeded result appeared in 102 ms.
- A malformed JSON import showed an actionable error and a following valid
  two-report import recovered successfully.
- The supplied `/opt/fleet/lib/verify-url.sh` passed: HTTP 200, 816 ms load,
  title/lang, one H1, main, all image alt text, labeled buttons, and no
  console/page errors.

### Current-release offline behavior

On a fresh live context, `registration.update()` completed, one online reload
populated runtime resources, and a fully offline reload rendered the H1,
offline notice, and working 500-client sample without a page error. This passes
offline use of the currently installed release, but does not cure the
cross-deployment update defect below.

### Privacy and outbound traffic

- Fresh free sessions on all three public routes made only same-origin
  requests. There are no analytics, CDN fonts, or third-party scripts.
- No license request occurs without a stored/returned license.
- With the documented billing endpoint intercepted locally, a returned license
  was stored under `sb_license:multiplayer-update-lens`, stripped from the URL,
  and verified once. No real purchase or billing mutation was attempted.
- Library/report payload sentinels did not appear in snapshots or report HTML.

### Headers, caching, and performance

- Live `/assets/index-CUXn_gRh.js` and
  `/assets/styles-CxbZJ8Ep.css` return
  `Cache-Control: public, max-age=31536000, immutable`.
- `/`, privacy, terms, and `/sw.js` return
  `Cache-Control: public, max-age=30, must-revalidate`.
- HTTPS responses include HSTS, `nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and restrictive
  camera/microphone/geolocation `Permissions-Policy`.
- A random unknown route returns the home document with HTTP 200 rather than a
  404. This is a non-blocking soft-404/SEO issue.
- Live responses do not set Content Security Policy or a `frame-ancestors`
  policy. This is recorded as hardening debt, not as a separate acceptance
  blocker.
- Built initial JS is 19,949 B (8.22 kB gzip), CSS is 13,637 B (3.90 kB
  gzip), there are no font bytes, the mobile hero is 43,548 B, and the largest
  hero is 159,642 B. All stated asset budgets pass.
- Lighthouse 12.8.2 against the live URL with mobile defaults: Performance
  100, Accessibility 100, Best Practices 100, SEO 100; FCP 1.2 s, LCP 1.7 s,
  CLS 0, TBT 0 ms, Speed Index 1.2 s, total transfer 172 KiB.

## Defects

### High — installed clients can remain on an old deployment indefinitely

`site/public/sw.js` uses a fixed `ticklens-shell-v1` cache, precaches `/`, and
answers every same-origin GET cache-first:

```js
caches.match(event.request).then((cached) => cached ?? fetch(event.request))
```

The service-worker file is static and contains no build/version fingerprint.
When a later deployment changes `index.html` and hashed assets but leaves
`sw.js` byte-identical, the browser finds no new worker to install. The cached
navigation is never revalidated, so reload continues to return the previous
HTML and never discovers the new asset URLs.

Fresh controlled reproduction using the exact candidate build:

1. Serve candidate resources with HTML marker `v1`; install and activate the
   candidate worker.
2. Change the origin's HTML marker to `v2` while keeping the exact same
   candidate `sw.js` (the normal case for a code-only site release).
3. Call `registration.update()` and reload online.
4. A cache-bypassing unique URL proved the origin served `v2`, but normal `/`
   still rendered `v1`; `registration.waiting` and `installing` were both
   null.

This directly fails the requested service-worker update check and can prevent
existing users from receiving repairs. Use network-first or
stale-while-revalidate navigation handling, or generate a changed worker/cache
revision for every build and clean old runtime entries. Add a two-deployment
browser regression test; the present offline test only proves one installed
release.

### Medium — invalid trace shapes are persisted and cause repeat page errors

The Field Kit checks only `schema` and that `samples` is an array, then mutates
and saves the library before the trace has been summarized. Two inputs with the
right schema but `durationMs: "not-a-number"` produced:

```text
((intermediate value) ?? 0).toFixed is not a function
```

Both invalid reports were already present in
`ticklens:field-kit:traces`. Reloading the live page with the cached valid
license emitted the same uncaught page error during `renderLibrary()`. This
violates invalid-input recovery and the no-page-errors-on-load requirement for
a state the product itself persisted.

Validate the complete trace version and every sample field before changing
storage, make multi-file import atomic, and quarantine or remove invalid legacy
entries when reading local storage. Add corrupt-shape and reload tests.

### Medium — paid “Add report” has no visible keyboard focus

After a mocked valid unlock, programmatic/keyboard focus lands on
`#trace-upload`, whose computed state is:

```text
active element: #trace-upload
bounding box: 26 × 48 CSS px
clip-path: inset(50%)
input outline: 3px solid rgb(184, 106, 34)
visible label outline: 0px none
```

The nominal outline is fully clipped with the input, and the visible “Add
report” label has no `:focus-within` treatment. Keyboard users therefore enter
an invisible focus stop before opening the file picker. Put the focus indicator
on the visible label (for example with `:focus-within`) and cover the unlocked
Tab/Enter path in the browser test.

## Required next verification

After repair, rerun all repository gates and packed-consumer checks, then test
two sequential versions under one service-worker origin, corrupt trace import
followed by reload, and unlocked keyboard focus. Reconfirm live byte identity,
headers, offline reload, axe, console/page errors, and Lighthouse after
deployment.
