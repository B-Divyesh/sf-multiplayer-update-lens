# TickLens review 1 — find the multiplayer room causing fanout lag

**Date:** 2026-09-05  
**Verdict:** **FAIL**  
**Finding count:** **6**  
**Untested claim count:** **14**  
**Implementation candidate reviewed:** `8dbfb8c92db16d8652c696a03f74ec8af6f27f57`  
**Documentation SHA:** `e99f292d89bac9112c3c9a5ccde5451d8d76f387`  
**Live URL:** https://multiplayer-update-lens.sociobot.in/

## Job, audience, and first action before scrolling

The intended job is to identify which multiplayer room creates excess outbound
fanout before CPU saturation makes the cause obvious. The intended audience is
indie browser-game developers using Socket.IO or WebSocket servers. The visible
first actions are **Install TickLens** and **Run 500-client sample**.

The live first screen does not state that job or audience plainly. Its H1 is
“Find the room that’s growing wild.” The supporting sentence is 24 words and
uses the same field-note metaphor. It does not say what appears after the
sample action.

## Evidence and checks

I used fresh Chromium contexts at 1440×900 and 390×844. First-screen and
populated-sample screenshots are in `/work/.evidence/review-1-desktop-*.png`
and `/work/.evidence/review-1-phone-*.png`.

- Both fresh live contexts returned 200 with no console or page errors and no
  third-party requests. The title, `lang=en`, one H1, main landmark, image alt
  text, and basic button naming passed.
- The one-click sample worked on desktop and phone. It populated a realistic
  five-room result identifying `marsh-260` as highest fanout at **1,622,400
  recipient sends**. The sample left an initially empty localStorage unchanged.
- The sample has no persistent “Demo — sample data, nothing is saved” label,
  Reset demo action, Start for real action, or demo storage namespace. `/demo`
  and `/?demo=1` return the ordinary landing page rather than a demo state.
- `/opt/fleet/lib/verify-url.sh https://multiplayer-update-lens.sociobot.in
  /work/.evidence/verify-url` passed: 200, 629 ms load, no browser errors, and
  title/lang/H1/main/alt/button basics.
- Fresh Playwright axe checks found zero violations on `/` (desktop and phone),
  `/privacy/` (phone), and `/terms/` (phone). The repository’s declared local
  and live `npm run test:site` command also passed.
- A detached clean checkout at the documentation SHA passed `npm ci` (0 audit
  vulnerabilities), `npm test` (4 files, 18 tests), `npm run check`, `npm run
  build`, and `npm run pack:check`. `npm pack` installed cleanly in an empty
  consumer; the documented ESM workflow recorded a 500-player/two-message
  room with exactly 1,000 recipient sends, and CommonJS import passed.
- Live home, privacy, terms, service worker, JS, and CSS SHA-256 values exactly
  match the clean production build of the implementation candidate. The later
  `e99f292` commit changes only reports and handoff documentation.
- Current response policy is correct for caching: HTML and `sw.js` are
  `public, max-age=30, must-revalidate`; hashed JS is
  `public, max-age=31536000, immutable`.

## Findings

### 1. High — required claims inventory is absent; 14 public claims are untested

There is no `.factory/claims.json`, and therefore no claim-specific command
that can be run from a clean demo entry point. This makes the following public,
testable claims unlisted and formally untested, even where a general test gives
some partial coverage:

1. zero dependencies;
2. payloads are never captured;
3. IDs are redacted by default;
4. the sample gives the same ranking as an exported trace;
5. the standalone report works offline;
6. state payloads, player messages, and socket frames are never stored;
7. room IDs become session-scoped labels by default;
8. Field Kit keeps retained traces browser-local;
9. Field Kit saves up to 30 traces;
10. Field Kit compares the two newest rankings;
11. a license works on another device;
12. traces remain in memory until export;
13. the library has no telemetry or network requests; and
14. the site’s offline-update behavior described in the README.

The repository also lacks `.factory/demo.md`, so the documented demo URL,
sample contents, reset behavior, and storage namespace are absent. Add the
claims file with exactly one `@claim:<id>` browser/library test per claim,
remove unsupported copy, and document the sandbox.

### 2. High — the sample is not the required isolated demo sandbox or library playground

“Run 500-client sample” correctly produces populated output, but it is not a
demo mode. No persistent sample-data banner appears before or after the click;
there is no Reset demo or Start for real control, and the direct demo URLs do
not enter a demo state. The page stays at `scrollY=0` after the click, so on a
phone the first screen after activation still looks like the landing page,
instead of showing the populated product result.

For this library class, the required in-page playground is also missing: there
is no editable input with live output using the package. Provide `/demo` (or
`?demo=1`) with a `demo:` storage namespace, the required persistent label and
controls, make the action reveal/focus the populated result, and include an
editable probe input/output playground alongside the copy-paste snippet.

### 3. High — landing copy fails the plain-words first-screen contract

The H1 “Find the room that’s growing wild.” is a metaphor rather than the job
in the developer’s words. “Multiplayer field diagnostics,” “calm CPU graph,”
and “private HTML field note” repeat the unsupported field-guide language.
The opening explanation is 24 words, above the 22-word limit, does not name
indie browser-game developers, and the primary sample action gives no adjacent
plain explanation of what happens next. The required `.factory/copy-audit.md`
is missing.

Use a short job heading such as “Find the room causing update lag,” name the
audience and outcome in one sentence, put “See the highest-fanout room” beside
the sample action, and remove mood/metaphor headings throughout the site.

### 4. Medium — a required designed 404 route is still missing

`GET /does-not-exist` returns HTTP 200 and the home page H1, not a designed 404
page with a route-specific title and a way back. This was recorded as a
non-blocking soft-404 in verification 2, 3, and 4; it remains unresolved and
is a defect under the present site-structure contract. Add `404.html` and a
Static Web Apps `responseOverrides.404.rewrite` configuration that preserves
the actual 404 status.

### 5. Medium — production has no CSP or anti-framing response header

Fresh live response headers include HSTS, nosniff, referrer policy, and
permissions policy, but omit `Content-Security-Policy`, `frame-ancestors`, and
`X-Frame-Options`. This was the P3 hardening item in verification 2, 3, and 4;
it remains unresolved. Configure the deployed response headers with a CSP that
matches the self-hosted assets and an anti-framing directive as a response
header, not a meta tag.

### 6. Medium — required route metadata and social assets are incomplete

The landing page has a plain title, description, favicon, and theme color, but
it has no canonical link, Open Graph tags, Twitter card tags, Apple touch icon,
or required 1200×630 product-derived social image. Privacy and terms have
titles but no canonical/social route metadata. Add the required tags and
original share asset to each public route.

## Earlier findings and current disposition

| Earlier item | Current disposition | Evidence |
| --- | --- | --- |
| Hashed JS/CSS were not immutable cached (verification 1) | Resolved | Live JS returns `public, max-age=31536000, immutable`. |
| Installed clients could remain on an old deployment (verification 2) | Resolved by current implementation evidence | The declared local and live site suite passed its cross-deployment update/offline regression; the current worker is `ticklens-shell-v2` and synchronously clones before cache I/O. |
| Invalid trace persistence/reload error (verification 2) | Resolved by declared regression | The clean local and live site suite passed its invalid/mixed import and recovery coverage. |
| Invisible unlocked upload focus (verification 2) | Resolved by declared regression | The clean local and live site suite passed its keyboard focus coverage. |
| Updated runtime assets were not retained offline (verification 3) | Resolved by current implementation evidence | The same cross-deployment update/offline regression passed locally and live. |
| Mobile purchase legal copy and target size (verification 3) | Resolved by declared regression | The clean local and live site suite passed its 390 px legal-target coverage. |
| Soft 404 and no CSP/anti-framing (verification 2–4) | Still open | Reproduced live above as findings 4 and 5. |

## Verdict

**FAIL.** The implementation and live artifact pass the core library workflow,
accessibility smoke checks, package consumption, prior functional regressions,
and cache policy. It cannot pass this review because it has six findings,
including 14 untested public claims, and the required demo sandbox, plain-word
first screen, 404 route, security headers, and metadata are incomplete.
