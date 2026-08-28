# TickLens independent verification 4 — PASS

**Date:** 2026-08-28  
**Candidate:** `8dbfb8c92db16d8652c696a03f74ec8af6f27f57`  
**Live URL:** https://multiplayer-update-lens.sociobot.in/

## Verdict

**PASS.** Fresh, independent evidence shows that the deployed site is the exact production build of the requested candidate and that the npm library works end to end for the brief's job: a 500-player, high-fanout room is identified from a self-contained local report. The clean checkout gates, packed-consumer ESM/CommonJS API checks, normal/boundary/recovery cases, desktop and 390 px browser checks, offline-update path, privacy behavior, headers, caching, budgets, and accessibility checks passed.

## Clean checkout and package gates

All commands ran in an independent detached worktree at the candidate SHA (`/tmp/ticklens-verify-4-Wyuxwn/candidate`) on Node `v22.23.2` and npm `10.9.8`:

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

- Clean install audited 128 packages with **0 vulnerabilities**.
- `npm test`: **4 files / 18 tests passed**.
- `npm run check` (`tsc --noEmit`) passed. There is no separate lint script.
- Exact production build passed, producing ESM, CommonJS, declarations and `dist/site`.
- Package dry run passed: 7 publish files, **11.5 kB** tarball / **47.8 kB** unpacked.
- The repository browser suite passed both locally and against production. It covers axe, console errors, keyboard sample activation, 390 px legal targets, paid license/import validation and recovery, current offline reload, and the combined v1 install → v2 online update → offline-v2 reload/cache regression.

An actual `npm pack` tarball was installed in a new empty npm consumer. Both the documented ESM and CommonJS imports exercised the public package and passed. The ESM scenario recorded a 500-player room with two broadcasts, reported exactly **1,000 recipient sends**, and its generated self-contained HTML named that room as the finding.

## Functional, boundary, and performance evidence

- Independent public-API probe checks passed: default room-ID redaction, report generation and `writeReport`, two-sample retention rollover, zero sampling, invalid `maxTicks`/`sampleRate`, and blank room-ID recovery.
- The site’s keyboard-only 500-client sample identified `marsh-260` as highest fanout with **1,622,400 recipient sends**. Invalid/mixed report imports are rejected atomically, corrupt saved reports are removed safely, and a later valid import recovers.
- A fresh five-run, 500,000-cycle benchmark (start tick + outbound record + end tick, after warm-up) had a median **0.685 microseconds/cycle**, or **0.0041%** of a 16.667 ms tick—below the brief's 2% overhead constraint.
- `dist/site` budgets: JS **21,753 B** (8.69 kB gzip), CSS **13,858 B** (3.93 kB gzip), fonts **0 B**, responsive mobile hero **43,548 B**, full hero **159,642 B**.

## Live browser, accessibility, privacy, and offline evidence

Fresh independent Playwright checks covered `/`, `/privacy/`, and `/terms/` at both 1440×900 and 390×844:

- All six responses were HTTP 200, with a title, `lang=en`, exactly one `h1`, exactly one `main`, no horizontal overflow, no console/page/request errors, no failed requests, and **zero axe violations** (therefore zero serious or critical findings).
- Each fresh free session had no cookies, local storage, or session storage and made only same-origin requests. Static/source inspection found no analytics, telemetry, CDN fonts, or third-party scripts. Billing verification is only requested after a license is supplied.
- Keyboard focus reached the skip link first and showed the designed 3 px ochre ring. Enter activated the sample. With reduced motion, control transition duration was `0.00001s` and the sample remained operable.
- `/opt/fleet/lib/verify-url.sh` independently passed production in 906 ms: zero browser errors, title/lang/H1/main present, no missing image alt text, and no unnamed buttons.
- The service-worker test passed the meaningful update case: v1 install → v2 online reload → Cache Storage contains v2 HTML/JS/CSS → origin offline → v2 reload. This rechecks the earlier deployment-only failure from fresh candidate evidence.

Fresh Lighthouse 13.4.1 mobile output was written before its known post-report Chromium tab-crash exit: Performance **99**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP **1.0 s**, LCP **1.7 s**, Speed Index **1.0 s**, TBT **80 ms**, CLS **0**, transfer **173 KiB**.

## Deployment identity and response policies

The local production build and live deployment have identical SHA-256 values for all checked delivery files, including home, privacy, terms, service worker, both hashed assets, both hero images, and favicon. Core hashes:

| File | SHA-256 |
| --- | --- |
| `index.html` | `c8361f3f2fa5ceb9696655ccc85f3ac2511c073fe1883fe8e9d167fec15452fd` |
| `sw.js` | `404501dee83e11245d0981afa38db7cefd0fa49d553b2507b89cf777615fd2ba` |
| `assets/index-DRxbhq7K.js` | `b0304f09a7a6124f13a17503dd29e8a7a4481cd20e9cfa59744e0281d54b587a` |
| `assets/styles-B5NXcKw2.css` | `9727d48e4ea0f73e461be3294387feea87b485995931290d9a6bf906f3c904d4` |

Live HTML and `sw.js` use `Cache-Control: public, max-age=30, must-revalidate`; content-hashed JS/CSS use `public, max-age=31536000, immutable`. HTTPS also returns HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and restrictive camera/microphone/geolocation permissions.

## Defects and follow-up

No release-blocking defects were found.

- **P0/P1/P2: none.**
- **P3 hardening (non-blocking):** production does not currently send a CSP or anti-framing header, and unknown routes fall back to the home document with HTTP 200. These do not violate the supplied product acceptance contract or affect the verified library/report workflow, but should be addressed by the static-host deployment configuration in a future hardening pass.
