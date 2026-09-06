# Verification 5 — identify the multiplayer room causing outbound fanout lag

**Date:** 2026-09-06  
**Verdict:** **FAIL**  
**Finding count:** **6**  
**Untested claim count:** **8**  
**Implementation candidate:** `897426331a0c566a73dd57702dc3d7f336d8276a`  
**Documentation SHA reviewed:** `0b2bb3ea11e673bdaa949b6e243c42d7966d504c`  
**Live URL:** https://multiplayer-update-lens.sociobot.in/

## Job, audience, and first action before scrolling

The job is to identify the multiplayer room causing outbound fanout lag. The
audience is indie browser-game developers. The first action is **Run 500-client
sample**.

Fresh 1440×900 and 390×844 Chromium contexts showed all three before scrolling.
The H1 is “Find the room causing update lag,” the next sentence names indie
browser-game developers, and the sample action was fully visible in both
viewports. Screenshots are in
`/work/.evidence/verification-5/desktop-first-screen.png` and
`phone-first-screen.png`.

## Clean checkout and installed package

All repository and package checks ran from a detached clean clone at the
implementation candidate. Node was `v22.23.2` and npm was `10.9.8`.

- `npm ci` installed 127 packages; `npm audit --audit-level=low` found 0
  vulnerabilities.
- `npm test` passed 4 files and 20 tests. `npm run check`, `npm run build`, and
  `npm run pack:check` passed. The build produced ESM, CommonJS, declarations,
  and `dist/site`.
- Every exact command in `.factory/claims.json` ran separately after the clean
  install. All 15 declared claim commands passed. The combined output is
  `/work/.evidence/verification-5/claim-commands.log`.
- `npm run test:claims` passed all 15 checks together. The documented site
  prerequisite was then started, and `npm run test:site` passed against both
  the local site and the live URL.
- The actual 12.1 kB tarball was installed in an empty consumer. ESM and
  CommonJS scenarios produced the expected 500-player result, and the packed
  declarations compiled in strict NodeNext mode. The same ESM and CommonJS
  checks passed on Node `18.20.8`.
- Real Socket.IO 4 and `ws` 8 servers exercised the packed adapters. Both
  counted their sends, preserved behavior, omitted payload content, and tore
  down cleanly.
- A five-run 500,000-cycle benchmark had a median cost of 0.494 µs, or about
  0.00296% of a 16.667 ms tick. This is below the brief's 2% budget.

## Live product evidence

- The one-click sample populated five realistic rooms and identified
  `marsh-260` at **1,622,400 recipient sends** on phone and desktop. The
  downloaded report named the same room and count.
- The persistent label reads “Demo — sample data, nothing is saved.” Reset
  removed only `demo:ticklens:*`; Start for real also removed demo state. A
  pre-existing Field Kit trace key and stored-license key remained unchanged.
- An edited private playground value was neither stored nor sent. Direct
  `/demo/` entry worked offline after one online visit. The standalone report
  and the v1 → v2 → offline-v2 update checks passed.
- Fresh free sessions emitted no console, page, or failed-request errors and
  made no third-party requests. The live invalid-license path returned a clear
  inactive-license message and kept Field Kit locked.
- The local and live browser suites found zero axe violations on home, demo,
  privacy, and terms. `/opt/fleet/lib/verify-url.sh` passed in 570 ms with a
  title, `lang=en`, one H1, a main landmark, complete image alt text, labeled
  buttons, and no browser errors.
- Every site link returned 2xx, except the two explicit `mailto:` links.
  Unknown paths correctly returned the designed page with HTTP 404. Route
  titles, canonical tags, Open Graph/Twitter metadata, robots, sitemap, and the
  1200×630 share image passed.
- Live responses send CSP with `frame-ancestors 'none'`, `X-Frame-Options:
  DENY`, HSTS, nosniff, referrer policy, and restrictive permissions policy.
  Hashed assets use a one-year immutable cache; HTML and `sw.js` revalidate.
- Freshly built home, demo, privacy, terms, 404, service worker, and all four
  hashed JS/CSS assets match live SHA-256 values exactly. The live runtime is
  the implementation candidate, not a later report-only commit.
- Lighthouse 13 produced a complete report before its known post-report tab
  crash: Performance 99, Accessibility 100, Best Practices 100, SEO 100; LCP
  1.8 s, TBT 100 ms, CLS 0, transfer 172 KiB. Initial JS is 8.25 kB raw / 3.48
  kB gzip, CSS is 16.56 kB raw / 4.44 kB gzip, fonts are 0 B, and the mobile
  hero is 43.55 kB.

This is a static npm library and documentation site. Backend tenant, SQLite,
restart-persistence, health, and 429 checks do not apply.

## Declared claim command results

| Claim ID | Result |
| --- | --- |
| `zero-dependencies` | Pass |
| `payloads-never-captured` | Pass |
| `room-ids-redacted` | Pass |
| `sample-export-ranking` | Pass |
| `demo-playground-private` | Pass, but the test is incomplete; see finding 1 |
| `standalone-report-offline` | Pass |
| `outbound-content-not-stored` | Pass |
| `session-scoped-labels` | Pass |
| `field-kit-browser-local` | Pass, but the test is incomplete; see finding 1 |
| `field-kit-thirty-traces` | Pass |
| `field-kit-comparison` | Pass |
| `license-other-device` | Pass |
| `traces-memory-until-export` | Pass, but the public wording is false; see finding 2 |
| `library-no-telemetry` | Pass, but the test is incomplete; see finding 1 |
| `offline-update` | Pass |

## Findings

### 1. High — the public claims inventory and privacy tests remain incomplete

Eight public claims have no compliant, outcome-level claim test:

1. the landing page and README say the probe records tick duration, room size,
   messages, bytes, and fanout, but this core outcome is not in
   `.factory/claims.json`;
2. the README claims Socket.IO, `ws`, and custom-transport support, but that
   compatibility claim is not listed;
3. the README claims Node 18, ESM, CommonJS, and TypeScript declaration support,
   but that package-compatibility claim is not listed;
4. the privacy page says the site uses no analytics, pixels, or third-party
   scripts, but there is no site-privacy claim entry;
5. `demo-playground-private` accepts every same-origin request, so it would pass
   if the entered value were sent to a same-origin endpoint;
6. `field-kit-browser-local` accepts every request to `api.sociobot.in` and
   never asserts that imported trace content is absent from those requests;
7. `library-no-telemetry` replaces only `fetch`, so it would miss Node
   `http`, `https`, `net`, `dns`, or other network paths; and
8. the retention wording covered by `traces-memory-until-export` is not tested
   after export and is false as written, as finding 2 shows.

The clean consumer, browser traffic log, and source inspection gave supporting
one-off evidence for most current behaviors, but the claims contract requires
each public promise to have its own sandbox command that would fail when the
promise breaks. These eight therefore remain formally untested.

### 2. Medium — the privacy page gives a false export-retention boundary

The privacy page says: “Measurements remain in your server process until you
clear or export them.” Export does not clear measurements. Against the packed
artifact, `snapshot().samples.length` was 1 before `writeReport()` and remained
1 afterward. Only `clear()` removes it. The registered test merely checks that
export creates a file; it does not test the stated retention boundary.

Evidence: `/work/.evidence/verification-5/export-retention.log`.

### 3. Medium — invalid playground values show one number and calculate another

On live `/demo/`, entering 5,001 players leaves **5001** visible and marks the
input invalid, while the output silently calculates with **5,000**. Entering 0
updates or −1 bytes likewise leaves the invalid values visible but calculates
with 1 and 0. No error is shown or announced. The result also reads “1
updates,” “1 players,” and “1 recipient sends.” This makes a boundary result
look valid while using values the developer did not enter.

Evidence: `/work/.evidence/verification-5/finding-evidence.json` and the phone
and desktop demo screenshots.

### 4. Medium — skip and route navigation do not move keyboard focus

The skip link is first in the tab order and has a visible focus ring, but Enter
only changes the hash to `#main`; `document.activeElement` becomes `BODY`.
Activating **Run 500-client sample** loads `/demo/`, but focus again remains on
`BODY` instead of moving to the demo H1 or populated result. Keyboard and
screen-reader users must traverse the header again, contrary to the supplied
focus-management contract.

Evidence: `/work/.evidence/verification-5/finding-evidence.json`.

### 5. Medium — the home page does not reflow at 200% text size

At a 390 px viewport with the root text size set to 200%, the home page grows
to 500 px wide. This creates 110 px of horizontal overflow and fails the
required “text resizes to 200% without loss” check. Demo, privacy, and terms
did not show the same large overflow.

Evidence: `/work/.evidence/verification-5/text-resize.log`.

### 6. Medium — required phone controls and legal links are under 44 px

At 390 px, **Reset demo** and **Start for real** are each 36 px high. The
privacy and terms email links are each 18 px high. These are active controls
on required demo and privacy paths and miss the supplied 44×44 px touch-target
minimum. The earlier purchase-disclosure links now meet the target; these are
different controls.

Evidence: `/work/.evidence/verification-5/touch-targets.log` and
`finding-evidence.json`.

## Earlier findings and current disposition

| Earlier item | Current disposition |
| --- | --- |
| Hashed assets lacked immutable caching | Resolved live. |
| Installed workers could remain on an old release | Resolved; the combined v1 → v2 → offline-v2 regression passed. |
| Updated runtime assets were not retained offline | Resolved; cached v2 HTML, JS, and CSS passed. |
| Invalid Field Kit traces persisted and broke reload | Resolved; atomic validation, corrupt cleanup, and recovery passed. |
| Unlocked upload had invisible focus | Resolved; the visible Add report button has the designed ring. |
| Purchase disclosure text and legal targets were too small | Resolved for those controls; finding 6 covers different live controls. |
| Landing copy used metaphor and omitted the audience/action | Resolved. |
| Demo sandbox, reset, start-real, and editable playground were absent | Core sandbox resolved; finding 3 covers its invalid-input path. |
| Soft 404 | Resolved with a designed HTTP 404. |
| CSP and anti-framing headers were absent | Resolved live. |
| Canonical/social metadata and share assets were absent | Resolved live. |
| Claims inventory was absent | Partially resolved: 15 commands exist and pass, but finding 1 remains. |

## Billing registration

Field Kit remains paid and locked. The live checkout endpoint returns HTTP 404,
the site clearly disables purchase, and invalid license recovery works. This is
the disclosed external billing-registration gap, not a product defect. Offer
metadata is present in `.factory/billing-offer.json` and copied to
`/work/.evidence/billing-offer.json`.

## Verdict

**FAIL.** The core library, packed artifact, live sample, report, demo
isolation, offline paths, security headers, accessibility automation, and
deployment identity pass. Six findings remain, including eight formally
untested or incompletely tested public claims. PASS requires zero findings and
zero untested claims.
