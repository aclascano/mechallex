# Mechallex · Design

World: **security printing** — the visual language of promissory notes, cheques and banknotes, translated into a working ERP. Operate surface: standard navigation and controls; the world contributes type, palette, density and one signature move.

## Tokens (src/index.css)

| Role | Light | Dark |
|---|---|---|
| Ground (`--paper`) | `oklch(0.972 0.009 20)` rose-tinted security paper | `oklch(0.185 0.018 172)` ink-green night |
| Panel | `oklch(0.995 0.003 20)` | `oklch(0.218 0.02 172)` |
| Rail (`--rail`) | `oklch(0.27 0.045 172)` banknote ink green | `oklch(0.15 0.02 172)` |
| Ink | `oklch(0.25 0.03 172)` | `oklch(0.945 0.012 20)` |
| Accent (`--rose`) | `oklch(0.6 0.105 8)` palo de rosa | `oklch(0.78 0.085 10)` |
| Steel (secondary series) | `oklch(0.52 0.035 245)` | `oklch(0.74 0.04 240)` |
| States | ok 160°, warn 70°, bad 25° hues, each with a `-soft` fill | lifted for dark |
| Aging series `--t0…--t5` | ink green (al día) → blush → rose → wine (+180) | same ramp, lifted |

Color strategy: Restrained + committed shell (the rail is always ink green). Accent only for primary series, selection, current nav and focus.

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
