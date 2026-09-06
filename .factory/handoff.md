# TickLens repair handoff

## Release status

**Implemented and deployed on 2026-09-06.**

- Work order: `multiplayer-update-lens-repair-4`
- Implementation SHA: `897426331a0c566a73dd57702dc3d7f336d8276a`
- Documentation SHA: this report-only handoff commit (reported with delivery)
- Live URL: https://multiplayer-update-lens.sociobot.in/
- Demo URL: https://multiplayer-update-lens.sociobot.in/demo/

The live delivery bytes match the implementation build for home, demo, privacy,
terms, 404, service worker, social image, and each hashed JS/CSS asset.

## What changed

- Rewrote the first screen in plain language. It now states the job, audience,
  and first action: **Run 500-client sample**. The 390 px and 1440 px fresh
  browser checks found the same H1, audience sentence, and action before
  scrolling.
- Added `/demo/`: a one-click, seeded 500-client sandbox with a persistent
  **Demo — sample data, nothing is saved** banner, Reset demo, Start for real,
  an immediately populated `marsh-260` result (1,622,400 recipient sends),
  and an editable live fanout playground. Demo state uses only the
  `demo:ticklens:` namespace. A direct demo visit registers the offline shell,
  so it remains usable after one online demo visit.
- Added `.factory/demo.md`, `.factory/claims.json` (15 outcome claims), and
  claim checks that exercise the built package and the browser sandbox.
- Added an actual `404.html`. Production unknown routes now return HTTP 404,
  the designed page, a route title, and a way back.
- Added static-host CSP, `frame-ancestors 'none'`, and `X-Frame-Options: DENY`
  response headers. The CSP allows only product assets plus the optional
  Sociobot license verification origin.
- Added canonical, Open Graph, Twitter, Apple-touch, favicon, robots, sitemap,
  per-route title, and original 1200×630 social-image coverage. The social
  image is a project-owned crop of the existing original hero art; provenance
  is in `.factory/design.md`.
- Removed remaining mood/metaphor language from the site and generated report.
  `.factory/copy-audit.md` records the landing sentence audit and terminology.
- Kept Field Kit as an optional paid, locked feature. The checkout service is
  not registered yet, so the page no longer sends buyers to a broken checkout.
  `.factory/billing-offer.json` and `/work/.evidence/billing-offer.json` give
  the billing-registration operator the existing $29 one-time offer metadata.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Immutable hashed assets | Resolved; live JS/CSS use `max-age=31536000, immutable`. |
| Existing service-worker clients missed updates | Resolved; v1 → v2 → offline-v2 regression passes. |
| Invalid imported traces could break reload | Resolved; full validation, atomic import, and corrupt-record cleanup remain covered. |
| Field Kit upload had invisible keyboard focus | Resolved; visible Add report button receives focus and opens the picker with Enter. |
| Updated runtime assets were not retained offline | Resolved by the combined update/offline regression. |
| Mobile legal text and targets | Resolved; browser suite verifies 16 px disclosure text and 44 px targets. |
| Soft 404 | Resolved; live `/does-not-exist` is HTTP 404 with the designed page. |
| Missing CSP / anti-framing | Resolved; live headers include CSP, `frame-ancestors 'none'`, and `X-Frame-Options: DENY`. |

## Verification

From the clean clone at the implementation SHA:

```sh
npm ci
npm audit --audit-level=low
npm test
npm run check
npm run build
npm run pack:check
# every command in .factory/claims.json
```

Results:

- `npm audit --audit-level=low`: 0 vulnerabilities.
- `npm test`: 4 files / 20 tests passed.
- `npm run check`, `npm run build`, and `npm run pack:check` passed.
- All 15 declared claim commands passed from the clean clone. The claims cover
  zero runtime dependencies, payload/room-ID privacy, the demo and downloaded
  report, offline standalone report/update behavior, Field Kit retention and
  comparison, license restore, and no library telemetry.
- A packed tarball installed into a new empty consumer. The ESM consumer
  recorded 1,000 recipient sends for a 500-player/two-message room; the
  CommonJS import also passed.
- Local and live `npm run test:site` passed. It includes axe checks on home,
  demo, privacy, and terms; phone layout; fresh demo entry/reset isolation;
  keyboard/focus; invalid-import recovery; paid unlock fixture; service-worker
  current-release home and direct-demo offline reload; and v1 → v2 → offline-v2
  cache retention.
- `/opt/fleet/lib/verify-url.sh` passed live: 200, 675 ms load, no browser
  errors, title/lang/H1/main present, all images labeled, and no unnamed
  buttons.
- Fresh phone and desktop contexts saved first-screen and populated-demo
  evidence in `/work/.evidence/live-*-first-screen.png` and
  `/work/.evidence/live-*-demo.png`.
- Live Lighthouse mobile: Performance 100, Accessibility 100, Best Practices
  100, SEO 100; LCP 0.9 s, CLS 0, total transfer 172 KiB. The initial JS is
  8.25 kB gzip and CSS is 4.43 kB gzip.

## Known gap and next step

The free core, reports, demo, and published package are complete. Field Kit
checkout is not currently registered: a read-only checkout check returned HTTP
404 on 2026-09-06. The product therefore shows the paid deliverables and price
but disables the purchase control rather than presenting a broken paid flow.
The billing-registration operator should register the metadata in
`/work/.evidence/billing-offer.json`; then restore the standard Sociobot
checkout link and run a real entitlement verification. No credentials are
needed in this repository.

## Publishing and deployment

Use `npm pack` to produce the registry artifact; the factory owns publishing.
The static deployment source is `dist/site` and preserves the one-replica
static product configuration. The deployed implementation is the SHA above;
this handoff is a later documentation-only commit.
