# TickLens repair handoff

## Release status

**PASS — repaired, pushed, and deployed on 2026-08-28.**

- Work order: `multiplayer-update-lens-repair-3`
- Verifier report: commit `3a433246d6e1b1f15651cc2a88410c4c94a512b3`,
  `.factory/verification-3.md`
- Repaired candidate: `e1f1e50b77487462de6b566c05a5e4e4e6483d16`
- Repair implementation commit: `61613a5`
- Live URL: https://multiplayer-update-lens.sociobot.in/
- Static deployment ID: `00f6c23b-8919-4716-9d2a-1f5480187e61`

The artifact remains an npm TypeScript library with ESM, CommonJS, and
declarations, plus the Vite documentation/demo site in `dist/site`.

## Repairs

### Online update persisted for offline use

The service worker now clones each successful network response synchronously,
before opening Cache Storage, so `respondWith()` cannot consume the body first.
Navigation and runtime-asset writes are attached to the fetch event with
`event.waitUntil()`. The cache version is `ticklens-shell-v2`, which also
replaces installations containing the broken v1 cache.

The browser regression uses a controlled, byte-identical worker and disables
Chromium's HTTP cache. It installs deployment v1, switches the origin to v2,
loads v2 HTML plus v2 hashed JS/CSS, reads all three v2 bodies back from Cache
Storage, takes the browser offline, reloads, and asserts that both the v2
heading and v2 script state remain present. This reproduces and closes the
verifier's exact online-v2/offline-v1 failure.

### Mobile purchase disclosure

Merchant and legal disclosure prose now renders at 16 px. Purchase legal links
and footer navigation links have minimum 44×44 px targets. The 390 px browser
regression reads computed font sizes and bounding boxes, failing below either
contract.

Live measured values:

- `.merchant`: 16 px; `.legal-copy`: 16 px.
- Purchase `terms`: 48×44 px; `privacy notice`: 134.4×44 px.
- Footer links: Privacy 57.8×44 px, Terms 44×44 px, GitHub 49.5×44 px.

## Verification evidence

Clean repository gates:

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

- Clean install: 127 packages installed; 128 audited; 0 vulnerabilities.
- Unit/integration: 4 files, 18 tests passed.
- Type check: `tsc --noEmit` passed. This repository has no separate lint
  script; TypeScript and Vite report no diagnostics.
- Production build passed and emitted ESM, CJS, declarations, source maps, and
  `dist/site/`.
- Package dry-run: 7 publish files, 11.4 kB tarball, 47.6 kB unpacked.
- The actual tarball was installed in a clean consumer. ESM and CommonJS both
  passed; the ESM scenario ranked `highest-500` with exactly 1,000 recipient
  sends.
- Local and live `test:site` passed the public routes, 390 px layout, axe,
  console/request monitoring, desktop keyboard activation, upload focus,
  seeded 500-client result, paid return/verification/import recovery, current
  offline reload, and combined v1 → v2 → offline-v2 regression.
- `/opt/fleet/lib/verify-url.sh` passed live in 825 ms with the correct title,
  `lang=en`, one H1, a main landmark, image alt text, labeled buttons, and zero
  browser errors.

Independent live desktop 1440×900 and mobile 390×844 checks covered `/`,
`/privacy/`, and `/terms/`: all six returned 200 with one H1/main, no horizontal
overflow, no missing alt text, no console/page errors, no third-party requests,
and zero axe violations. A fresh free session had empty local/session storage,
cookies, and IndexedDB.

Live Lighthouse 12.8.2 mobile results:

- Performance 100, Accessibility 100, Best Practices 100, SEO 100.
- FCP 0.9 s, LCP 1.7 s, Speed Index 0.9 s, CLS 0, TBT 0 ms.
- Total transfer 173 KiB.
- Lighthouse emitted its known post-report Chromium tab-crash message, but the
  complete JSON report and every score/audit value above were present.

Built budgets: JS 21,753 B (8.69 kB gzip), CSS 13,858 B (3.93 kB gzip), fonts
0 B, mobile hero 43,548 B, full hero 159,642 B.

## Deployment identity and response policy

Fresh local and live SHA-256 hashes match exactly:

- `index.html`: `c8361f3f2fa5ceb9696655ccc85f3ac2511c073fe1883fe8e9d167fec15452fd`
- `privacy/index.html`: `bd8194c6d09a797f4f8b282e48e209626b0ecd18a24859490a3f7c36a785a7a3`
- `terms/index.html`: `875223d6779effee56fbc44b5efaf88fae04048f7d357397dd94990924708556`
- `sw.js`: `404501dee83e11245d0981afa38db7cefd0fa49d553b2507b89cf777615fd2ba`
- `assets/styles-B5NXcKw2.css`: `9727d48e4ea0f73e461be3294387feea87b485995931290d9a6bf906f3c904d4`
- `assets/index-DRxbhq7K.js`: `b0304f09a7a6124f13a17503dd29e8a7a4481cd20e9cfa59744e0281d54b587a`
- Both hero images and the favicon also matched.

Live HTML and `sw.js` use `public, max-age=30, must-revalidate`; hashed assets
use `public, max-age=31536000, immutable`. HTTPS responses include HSTS,
`nosniff`, strict-origin referrer policy, and restrictive camera/microphone/
geolocation permissions.

## Known non-blocking gaps

- Registry publishing remains factory-owned; do not publish from this worker.
  The ready artifact can be produced with `npm pack`.
- The static host still returns the home document with HTTP 200 for unknown
  routes and does not set CSP or an anti-framing header. These were explicitly
  non-blocking in the independent report and were not expanded into this
  focused repair.
