# TickLens visual thesis — botanical field guide

## Direction and rationale

TickLens uses the calm precision of a botanist's field notebook for its visual system: labeled stems become network paths, room samples appear as carefully sorted records, and a pressed leaf with branching veins explains fanout at a glance. This makes an invisible topology feel inspectable while keeping the profiler itself serious and quiet. The product language stays direct: it names rooms, updates, reports, and recipient sends rather than extending the botanical metaphor into headings or instructions.

This is an explicitly light, paper-based system. A dark mode would break the paper-report analogy and make the exported report look different from the site, so TickLens paints the light paper background explicitly instead. The report renderer uses the same tokens so the diagnostic artifact feels cohesive without becoming a generic dashboard.

## Palette

| Token | Value | Role |
| --- | --- | --- |
| `paper` | `#F3EEDD` | warm field-guide ground |
| `paper-raised` | `#FFFDF5` | report and specimen surfaces |
| `ink` | `#17352B` | primary text; deep chlorophyll |
| `ink-muted` | `#52645C` | secondary text |
| `moss` | `#356B4E` | links, controls, healthy state |
| `moss-dark` | `#19452F` | hover and focus contrast |
| `lichen` | `#A9C8A7` | rules and quiet data marks |
| `ochre` | `#B86A22` | fanout warnings and emphasis |
| `berry` | `#9B3B3B` | errors |
| `graphite` | `#25302B` | code panels |

All body text combinations exceed 4.5:1. Color is never the sole signal: warnings include labels and shapes; charts include values and a text table.

## Typography

- Display and editorial labels: Georgia, Cambria, `Times New Roman`, serif. Its humanist forms supply the field-guide voice without a font download.
- Interface, data, and code: ui-monospace, SFMono-Regular, Consolas, `Liberation Mono`, monospace. Tabular numerals make room comparisons scan cleanly.
- Scale: 14 / 16 / 20 / 28 / clamp(42–72) px. Body text is 17px at desktop and never below 16px.

System fonts are intentional: the product has zero font bytes, works offline, and resembles a well-used technical notebook rather than a brand campaign.

## Spacing and structure

The base unit is 4px; primary rhythm uses 8, 16, 24, 32, 48, 72, and 96px. Content tops out at 1180px and reading measures at 72 characters. Hairline rules and baseline labels create grouping before raised surfaces are introduced. Cards appear only for independent room specimens or plan choices.

At 390px, the navigation collapses to the essential install action, evidence columns stack, tables become horizontally scrollable, and comparison controls become full-width. Touch targets are at least 44px.

## Interaction grammar

- Primary actions are dark moss lozenges with a precise 1px edge.
- Expandable specimens use native `details` elements.
- Copy, upload, and license actions confirm in a polite live region.
- Keyboard focus uses a 3px ochre ring with a paper offset.
- Report bars grow horizontally from a fixed root, mirroring a branch emerging from a stem.

## Motion policy

Only explanatory motion is used: hero branches settle once (420ms), chart bars reveal from their origin (240ms), and state notices fade (180ms). Nothing loops. Under `prefers-reduced-motion: reduce`, transforms and smooth scrolling are removed and state changes are immediate.

## Asset plan and provenance

- `site/public/ticklens-herbarium.webp`: original AI-generated hero illustration, generated for this product with `/opt/fleet/lib/gen-image.sh` using the factory `factory-image` deployment, then converted locally to WebP. Prompt: “Botanical scientific field-guide plate on warm ivory paper, a single fictional fern specimen whose central stem is a multiplayer game server and whose branching leaf veins end in small abstract room nodes, subtle copper measurement ticks and handwritten-style specimen marks but absolutely no readable words, no letters, no logos, no UI screenshot, screen-print and colored-pencil texture, restrained deep forest green, sage and burnt ochre ink, asymmetric vertical composition with generous clean negative space on the left for website copy, sophisticated editorial illustration, flat paper lighting, no gradients, 3:2 landscape.” License: original project asset; generated under the factory image service terms.
- Tiny vein, tick, and leaf marks are hand-authored CSS/SVG geometry. They are decorative or labeled appropriately and contain no third-party material.
- `ticklens-herbarium-720.webp` is a locally resized responsive derivative of the generated hero, with no further generative edits.
- `ticklens-share.webp` is a 1200×630 WebP crop derived locally from the original hero illustration for Open Graph and Twitter cards. It contains no text and no third-party material.
- `apple-touch-icon.png` is a hand-composed raster leaf mark using the same paper, moss, and ochre tokens as the project favicon.
