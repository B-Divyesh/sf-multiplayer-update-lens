# TickLens demo sandbox

## Entry point

Open `https://multiplayer-update-lens.sociobot.in/demo/`, or choose **Run
500-client sample** on the landing page. The demo immediately builds a 120-tick
trace for five rooms and identifies `marsh-260` at 1,622,400 recipient sends.

The page also includes an editable fanout playground. Change the room label,
player count, updates per tick, or bytes per update to see the public TickLens
probe calculate a new recipient-send total.

## Isolation and reset

The persistent banner reads **Demo — sample data, nothing is saved**. Demo-only
state is stored under the `demo:ticklens:` localStorage prefix. It never reads
or writes Field Kit keys, license keys, or imported reports.

- **Reset demo** removes every `demo:ticklens:` entry and clears the displayed
  sample.
- **Start for real** removes demo entries and returns to the installation page.
- No sample payload or customer trace is used. The seeded room data ships in
  `site/src/demo.ts` and is generated anew in the browser.

The browser regression in `test/site-accessibility.mjs` enters from the
landing action, verifies populated output and the persistent banner, resets
the demo, and proves an existing real trace key stays unchanged.
