# TickLens independent verification — FAIL

**Date:** 2026-08-28

**Candidate:** `b3c2367a1f60a3402cd02415ea0add6c8571a2d8`

**Live URL:** https://multiplayer-update-lens.sociobot.in/

## Verdict

**FAIL.** The library and its deployed companion site work for the core
job-to-be-done, and the live deployment is exactly the candidate build. The
candidate does not meet the required static-asset caching policy in production:
hashed JS and CSS are served with a 30-second, revalidating cache policy rather
than long-lived immutable caching. This is a deployment-visible acceptance
failure, not a source-build failure.

## Environment and reproducibility

A separate clean clone was made from the candidate SHA at
`/tmp/ticklens-verify-1Vz1zM`; all install, build, package, and local browser
checks below ran there. No product source or configuration was changed during
verification.

```sh
npm ci
npm test
npm run check
npm run build
npm pack --dry-run
npm audit --audit-level=low
```

Results:

- `npm ci` succeeded; `npm audit --audit-level=low` reported 0 vulnerabilities.
- `npm test` passed: 2 files, 11 tests.
- `npm run check` (`tsc --noEmit`) passed.
- `npm run build` passed and emitted `dist/index.js`, `dist/index.cjs`,
  `dist/index.d.ts`, and `dist/site/`.
- `npm pack --dry-run` passed: 7 publish files, 11.2 kB tarball / 47.2 kB
  unpacked.

I also ran `npm pack`, installed that tarball into a new `npm init` consumer,
and exercised the documented ESM API through `createProbe`, a 500-player,
two-message tick, and `writeReport`; the generated report identified
`room-500` with `1,000 recipient sends`. A separate CommonJS `require()` smoke
test passed.

## Product and browser evidence

- `npm run test:site` passed. It covered axe on home/privacy/terms, 390px
  layout, seeded sample, license return/storage cleanup, and two-report
  comparison.
- Independent Playwright checks at 1440px and 390px found one `<h1>` and one
  `<main>`, no horizontal overflow, working skip link/focus, no console or page
  errors, and no failed or third-party requests while using the free product.
- Keyboard activation of “Run 500-client sample” produced `marsh-260` as the
  highest-fanout room with `1,622,400 recipient sends`, directly satisfying the
  brief's 500-client identification task.
- With `prefers-reduced-motion: reduce`, the sample completed in 131 ms and
  control transition duration was `0.01ms`.
- License-verification failure presented the actionable recovery message
  “We couldn’t verify that license. Check your connection and try again.” A
  mocked valid license then accepted an invalid report with a visible error and
  successfully recovered by importing a valid report.
- Fresh live-site Playwright/axe runs on `/`, `/privacy/`, and `/terms/` at
  390px found zero axe violations (including zero serious/critical) and zero
  console/page errors.
- Live service-worker smoke test passed: after activation and one online reload,
  an offline reload rendered the TickLens title and H1 without an error. The
  companion site has a service worker but no web-app manifest, so it is not
  evaluated as an installable PWA.
- Lighthouse 12.8.2, local production build, mobile simulated throttling:
  Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.9 s,
  CLS 0.
- Built initial JS is 19,949 bytes (8.22 kB gzip in Vite output), CSS is 13,637
  bytes (3.90 kB gzip), no font payload is shipped, and the largest hero is
  159,642 bytes. These are within the stated budgets.
- A 500,000-cycle probe benchmark (start tick + outbound record + end) measured
  1.316 microseconds/cycle, 0.0079% of a 16.7 ms game tick, below the 2%
  overhead constraint on this worker.

## Privacy, deployment identity, and response policies

- The default redaction, report content, outbound-adapter behavior, invalid
  room/measurement boundaries, and failure recovery were exercised. Generated
  traces contain counts and labels only, not payload contents.
- A fresh free-site session made only same-origin requests. There are no CDN
  fonts, analytics, or third-party scripts. License verification is only
  requested when a license exists, as documented.
- The live `index.html`, privacy page, terms page, hashed JS, hashed CSS, and
  `sw.js` SHA-256 matched the freshly built candidate byte-for-byte. For
  example, both live and local home pages hash to
  `026c6d5fd07f9d4c1d42b4feb5d226affac0101a8db6c3f8fd481a5c259b1efa`.
- Live responses include HTTPS, HSTS, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

## Defects

### Medium — hashed static assets are not immutable cached in production

**Evidence:** On 2026-08-28, live `HEAD` requests for
`/assets/index-CUXn_gRh.js` and `/assets/styles-CxbZJ8Ep.css` both returned:

```http
Cache-Control: public, must-revalidate, max-age=30
```

The same weak 30-second policy is applied to HTML and `sw.js`. The assets have
content hashes, so the production policy should use a long-lived immutable
cache lifetime for the hashed JS/CSS (while keeping HTML and `sw.js`
revalidating). This misses the static-product caching requirement and causes
unnecessary repeat validation/download work. The repository's
`site/public/staticwebapp.config.json` sets security headers but no asset cache
override; the observed deployment confirms the gap.

**Required resolution:** Configure the deployment/static-host rules so hashed
assets receive a long-lived `Cache-Control: public, max-age=31536000,
immutable` policy, retain short/revalidating caching for HTML and `sw.js`, then
redeploy and re-run the live-header check.

## No other blocking defects found

Core library behavior, package consumption, report generation, adapters,
privacy defaults, normal/error/recovery paths, accessibility, responsive
layout, reduced motion, offline reload, production identity, and bundle sizes
all passed the checks above.
