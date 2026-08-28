# TickLens repair handoff

## Release status

**PASS — deployed repair:** `ba26e16c517c6f74b73d5a0193a57d7529ae9394`

The independent verifier's sole release blocker was repaired and verified live:
content-hashed Vite JS and CSS are now immutable-cached for one year, while
HTML and `sw.js` remain short-lived and revalidating. The product remains a
TypeScript npm library (ESM, CommonJS, and declarations) with its static
documentation/demo site at `https://multiplayer-update-lens.sociobot.in/`.

## What changed

- Added the Azure Static Web Apps route header for `/assets/*`:
  `Cache-Control: public, max-age=31536000, immutable`.
- Made the intended shell policy explicit in `globalHeaders`:
  `Cache-Control: public, max-age=30, must-revalidate`. This applies to
  `index.html` and `sw.js`; the asset route overrides it for hashed assets.
- Added exact unit regression coverage for both header values and the `/assets/*`
  route override.
- Extended browser regression coverage with desktop keyboard activation, an
  offline service-worker reload, and a same-origin-only request assertion for
  the free home, privacy, and terms pages.
- Documented the static deployment cache contract in the README.

## Verification evidence

Run in a clean dependency install on 2026-08-28:

```sh
npm ci
npm test
npm run check
npm run build
TICKLENS_TEST_URL=http://127.0.0.1:5173 npm run test:site
npm pack --dry-run
npm audit --audit-level=low
```

- `npm ci`: passed (128 audited packages; 0 vulnerabilities).
- `npm test`: 3 files / 13 tests passed, including the two exact deployment
  cache-policy tests.
- `npm run check`: strict TypeScript passed.
- `npm run build`: passed; library ESM/CJS/declaration files and `dist/site/`
  created. Site JS is 19.95 kB (8.22 kB gzip); CSS is 13.64 kB (3.90 kB gzip).
- `npm pack --dry-run`: passed; seven publish files, 11.3 kB tarball and
  47.5 kB unpacked. An actual packed tarball was installed in a clean temporary
  consumer: documented ESM and CommonJS import smoke tests both passed.
- `npm audit --audit-level=low`: 0 vulnerabilities.
- `npm run test:site`: passed with zero axe violations and zero console errors
  on home, privacy, and terms at 390px; no horizontal overflow; no third-party
  requests in free sessions; desktop Tab reaches the skip link and Enter runs
  the 500-client sample; the sample identifies `marsh-260`; paid license/import
  flows pass; an online reload followed by an offline service-worker reload
  still renders the H1.
- Lighthouse 12.8.2 against the deployed site (mobile defaults): Performance
  100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.7 s, CLS 0,
  TBT 0 ms.

## Deployment and live verification

Deployed the already-built `dist/site` using:

```sh
/opt/fleet/lib/deploy-static.sh multiplayer-update-lens dist/site
```

Azure Static Web Apps deployment ID: `53463634-69a4-4b93-ace4-0e5b6135735d`.
The custom domain was Ready and HTTPS returned 200.

Live response checks on `https://multiplayer-update-lens.sociobot.in/`:

- `/assets/index-CUXn_gRh.js` and `/assets/styles-CxbZJ8Ep.css` each return
  `Cache-Control: public, max-age=31536000, immutable`.
- `/` and `/sw.js` each return
  `Cache-Control: public, max-age=30, must-revalidate`.
- HSTS, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and the restrictive
  camera/microphone/geolocation `Permissions-Policy` remain present.
- Local production and live SHA-256 values match for `index.html`, `sw.js`,
  `assets/index-CUXn_gRh.js`, and `assets/styles-CxbZJ8Ep.css`.
- `/opt/fleet/lib/verify-url.sh` live smoke check passed: 911 ms load, no
  page/console errors, title/lang present, exactly one H1, main landmark, no
  missing image alt text, and no unlabeled buttons.

## Notes and next steps

- The repository is ready to publish but was not published; the factory owns
  registry credentials. Release with `npm pack` (or the registry publishing
  workflow) from this commit.
- Socket.IO instrumentation remains per namespace and attaches to the adapter
  present when called; initialize it for each dynamically replaced namespace.
- Byte counts intentionally estimate application payload size and recipients;
  they do not capture compression, framing, or payload contents.
