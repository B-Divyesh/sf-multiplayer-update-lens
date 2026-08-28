# TickLens verification handoff

## Release status

**FAIL — do not release candidate
`04dbc2dc08f172bc439db40d0da3f9c4947126c1`.**

Independent verification on 2026-08-28 found three acceptance blockers. Full
evidence and reproduction details are in `.factory/verification-2.md`.

## Blocking defects

1. **High — service-worker updates are stuck.** The worker serves cached `/`
   first from fixed cache `ticklens-shell-v1`. If a later deploy changes the
   app but not the static worker bytes, `registration.update()` installs
   nothing and online reload continues to render the old deployment. A
   controlled two-deployment test rendered `v1` after the origin was serving
   `v2`.
2. **Medium — corrupt trace shapes persist and break later loads.** Two
   schema-labeled traces with nonnumeric duration values were written to local
   storage before rendering failed. Reload then emitted an uncaught
   `.toFixed is not a function` page error.
3. **Medium — paid report upload has invisible keyboard focus.** The enabled
   file input receives focus and a 3 px outline, but both are clipped with
   `clip-path: inset(50%)`; the visible “Add report” label has no focus ring.

The live host also returns a soft HTTP 200 for unknown routes and does not set
CSP/`frame-ancestors`; these are noted as non-blocking hardening items.

## What passed

- Clean `npm ci`, 13/13 unit/integration tests, strict TypeScript, exact
  production build, site browser suite, pack dry run, and 0-vulnerability
  audit.
- The 11.3 kB tarball works in clean ESM/CommonJS consumers on Node 18 and 22;
  packed declarations compile under strict NodeNext TypeScript.
- Real Socket.IO and `ws` integration, teardown, 500-player highest-fanout
  ranking, report generation, redaction/payload privacy, boundaries, errors,
  recovery, empty state, and retention cap passed.
- Median instrumentation cost was 0.488 µs per complete measured cycle,
  0.00293% of a 16.667 ms tick.
- Current live files match the candidate build byte-for-byte. The prior cache
  failure is fixed: hashed JS/CSS are immutable for one year; shell and worker
  revalidate after 30 seconds.
- Live desktop and 390 px audits found no overflow, no free-session third-party
  requests, no console/page errors, and zero axe violations on home, privacy,
  and terms. Reduced motion and the current-release offline reload/sample pass.
- Live Lighthouse: 100 Performance / 100 Accessibility / 100 Best Practices /
  100 SEO; LCP 1.7 s, CLS 0, TBT 0 ms. JS/CSS/images are within budget.

## Commands used

```sh
npm ci
npm audit --audit-level=low
npm test
npm run check
npm run build
npm run pack:check
TICKLENS_TEST_URL=http://127.0.0.1:4173 npm run test:site
npm pack
```

The repository has no lint script. The npm package is ready to publish but was
not published; the registry currently returns 404 and publishing remains the
factory's responsibility.

## Required next steps

Repair all three blockers without weakening the passing privacy or cache
policies. Add regression coverage for two sequential deployments under one
service-worker registration, full trace-shape validation plus reload, and
unlocked keyboard focus. Deploy the repair, then repeat the live identity,
headers, offline, axe, error, and Lighthouse checks before changing status to
PASS.
