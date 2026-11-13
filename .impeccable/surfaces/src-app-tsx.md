---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

Scope: whole app shell + executive dashboard (Operate mode). Audience: jefa de cartera y cobranza; job: see portfolio health each morning and decide where to act.

## Direction contract

THESIS: The portfolio as a security-printed instrument. Refuses the grey SaaS dashboard with one accent and the hero-metric card grid.

OWN-WORLD: Security printing (pagaré, cheque, banknote). Light: pale rose-tinted security paper ground, white panels. Shell rail always deep ink-green (banknote border) in both themes. Dark: ink-green night ground. Ink colours: palo de rosa (accent, selection, primary series), steel grey, ink green; state colours only where meaningful. Engraved serif (Bodoni Moda) for page titles and denomination-size figures; workhorse grotesk (Hanken Grotesk) for everything else, tabular numerals. Microprint hairlines as dividers. 1px rules, 12px radius, no ghost cards.

STORY: She sees total portfolio, delinquency and this month's recovery at once, sees which aging bucket grew, which campaigns and cases need her, and drills down.

FIRST VIEWPORT: Left ink-green rail with nav. Top bar: search, period, theme toggle. Main: page title; a "denomination band" (one ruled strip, not cards) with 4 key figures; beside it the signature guilloché rosette of portfolio by aging bucket; below, recovery-vs-goal chart and aging table; then campaigns and legal cases.

FORM: Guilloché security print, candidate 1 of my ordered list (Impeccable's pick, chosen by user). seed:3b18e6c02618a08d. Signature move: generative guilloché rosette (hypotrochoid SVG) whose rings encode aging-bucket shares, drawn once on load.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
