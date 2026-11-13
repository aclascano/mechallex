# Mechallex · Design

World: **security printing** — the visual language of promissory notes, cheques and banknotes, translated into a working ERP. Operate surface: standard navigation and controls; the world contributes type, palette, density and one signature move.

## Tokens (src/index.css)

| Role | Light | Dark |
|---|---|---|
| Ground (`--paper`) | `oklch(0.982 0.002 290)` near white | `oklch(0.13 0.004 290)` near black |
| Panel | `oklch(1 0 0)` | `oklch(0.17 0.005 290)` |
| Rail (`--rail`) | `oklch(0.15 0.005 290)` black | `oklch(0.1 0.003 290)` |
| Ink | `oklch(0.17 0.006 290)` | `oklch(0.97 0.002 290)` |
| Accent (`--rose*`, now purple) | `oklch(0.54 0.21 295)` | `oklch(0.72 0.16 295)` |
| Secondary series (`--steel`) | neutral grey `oklch(0.42 0.01 290)` | `oklch(0.72 0.008 290)` |
| States | ok 155°, warn 70°, bad 25°, each with a `-soft` fill | lifted for dark |
| Aging series `--t0…--t5` | grey (al día) → light lavender → deep violet (+180) | same ramp, lifted |

Color strategy: monochrome (black, white, neutral greys) with a purple accent at roughly 10% of the surface: primary data series, selection, current nav, links and focus. The rail is always black. Token names `--rose*` are kept for compatibility and hold the purple accent.

## Type

- Display: **Bodoni Moda Variable** — page titles and denomination-size figures only (tabular).
- UI: **Hanken Grotesk Variable** — everything else; `tabular-nums` on all data.
- Scale: 0.7 / 0.75 / 0.8 / 0.875 / 0.95 rem UI; 1.5–2.4 rem display.

## Components

- Panel: 14px radius, 1px `--line` border, no shadow (single elevation system).
- Buttons/inputs: 36px high, 9px radius; primary = rail green (light) / rose (dark).
- Badges: 22px pill, soft fill + ink of the same hue.
- Collection path: four segments preventiva → administrativa → extrajudicial → judicial.
- Tables: sticky header, 1px row rules, right-aligned tabular money.

## Signature

- **Guilloché rosette** (`components/guilloche.tsx`): one ring per aging bucket, three phase-shifted strands; wave amplitude grows with the bucket's share. Draws once on load (the only orchestrated motion); hover/focus on ring or legend isolates a bucket.
- **Microprint** hairline (`.microprint`) as divider under denomination bands and at the rail foot.
- Banknote wave band at the top of the rail.

## Motion

150–250 ms state transitions; charts render without animation; `prefers-reduced-motion` disables all.
