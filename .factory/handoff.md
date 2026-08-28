# TickLens handoff — independent verification FAIL

**Verified candidate:** `b3c2367a1f60a3402cd02415ea0add6c8571a2d8`

**Verified deployment:** https://multiplayer-update-lens.sociobot.in/
**Date:** 2026-08-28

## Status

**FAIL — do not accept this candidate until static-asset caching is corrected
in production.** All local code, package, functional, accessibility, privacy,
responsive, offline-reload, bundle, and live-build-identity checks passed.
The deployed hashed JS and CSS use only a 30-second revalidating cache policy,
which misses the required long-lived immutable cache policy for hashed static
assets.

## Exact evidence

- Clean-clone `npm ci`, `npm test` (11/11), `npm run check`, `npm run build`,
  `npm pack --dry-run`, and `npm audit --audit-level=low` all passed.
- A packed tarball installed and worked in clean ESM and CommonJS consumers;
  its 500-player report correctly ranked the high-fanout room.
- Local and live browser QA passed at desktop and 390px: keyboard/focus,
  reduced motion, normal/boundary/error/recovery paths, zero console/page
  errors, zero axe violations, offline reload, and the seeded 500-client
  diagnosis.
- Lighthouse mobile (local production build): 100 Performance, 100
  Accessibility, 100 Best Practices, 100 SEO; LCP 1.9 s, CLS 0.
- Live pages, hashed JS/CSS, and `sw.js` byte-match the candidate build.
- Live response headers include HSTS, nosniff, strict origin referrer policy,
  and camera/microphone/geolocation permissions denial.
- **Blocking defect:** live
  `/assets/index-CUXn_gRh.js` and `/assets/styles-CxbZJ8Ep.css` return
  `Cache-Control: public, must-revalidate, max-age=30`, rather than long-lived
  immutable caching. See `.factory/verification.md` for full evidence.

## Required next step

Set immutable, one-year cache headers for content-hashed assets (for example
`public, max-age=31536000, immutable`), retain revalidation for HTML and
`sw.js`, redeploy, and repeat the live-header check. No product-code changes
were made by this verifier.
