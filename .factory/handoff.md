# TickLens verification 5 handoff

## Status

**FAIL on 2026-09-06.**

- Work order: `multiplayer-update-lens-verify-5`
- Implementation candidate: `897426331a0c566a73dd57702dc3d7f336d8276a`
- Documentation SHA reviewed: `0b2bb3ea11e673bdaa949b6e243c42d7966d504c`
- Live URL: https://multiplayer-update-lens.sociobot.in/
- Full report: `.factory/verification-5.md`
- Findings: 6
- Formally untested claims: 8

No product code was changed.

## What passed

- The phone and desktop first screens state the job, audience, and first action.
- The one-click isolated demo identifies `marsh-260` at 1,622,400 recipient
  sends. Its persistent label, reset, start-real, real-data isolation, editable
  playground normal path, report download, and direct-demo offline path work.
- The clean checkout passed 20 unit tests, type checking, build, package dry
  run, the full claim suite, and local/live site suites. Every one of the 15
  declared claim commands passed separately.
- The actual tarball passed ESM, CommonJS, strict declaration compilation,
  Node 18, real Socket.IO, and real `ws` consumer checks.
- Axe, `verify-url.sh`, route structure, links, metadata, HTTP 404, CSP,
  anti-framing, caching, privacy traffic, invalid-license recovery, and
  offline-update checks passed.
- The local candidate build matches the live home, demo, privacy, terms, 404,
  service worker, and hashed JS/CSS assets byte-for-byte.
- Lighthouse report: 99 Performance, 100 Accessibility, 100 Best Practices,
  100 SEO; LCP 1.8 s, TBT 100 ms, CLS 0, 172 KiB transfer.

## What remains

1. Complete the claims inventory and strengthen the privacy/no-network tests;
   eight public promises do not have compliant claim coverage.
2. Correct the privacy retention sentence or make export clear in-memory data,
   then test the chosen behavior.
3. Make playground invalid values visible and announced instead of silently
   calculating with different clamped values; fix singular output.
4. Move focus to `main` for the skip link and to the new H1/result after demo
   navigation.
5. Reflow the home page without horizontal overflow at 200% text size.
6. Raise demo reset/start-real buttons and legal email links to at least 44 px
   touch targets.

Field Kit checkout still returns HTTP 404 and remains honestly disabled. That
expected registration gap is not counted as a defect. Billing metadata is in
`.factory/billing-offer.json` and `/work/.evidence/billing-offer.json`.

## Reproduce

From a clean clone at the implementation SHA:

```sh
npm ci
npm audit --audit-level=low
npm test
npm run check
npm run build
npm run pack:check
npm run test:claims
npm run dev -- --host 127.0.0.1 --port 4173
TICKLENS_TEST_URL=http://127.0.0.1:4173 npm run test:site
TICKLENS_TEST_URL=https://multiplayer-update-lens.sociobot.in npm run test:site
```

Detailed logs and screenshots are under `/work/.evidence/verification-5/`.
