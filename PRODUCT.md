# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React + TypeScript + Tailwind CSS v4 + Recharts, React Router, Lucide icons. Proposed by Claude and accepted by the owner. Frontend only with mock data; backend architecture is deliberately undecided.

## Users

Primary: the head of portfolio and collections (jefa de cartera y cobranza) at an organization that either grants credit and manages its own portfolio (cooperativas, financieras, casas comerciales) or collects third-party portfolio for a commission (empresas de cobranza). She opens the product every morning to see delinquency, recovery, campaign performance and legal cases, then drills into clients, operations and payments.

Secondary: collections agents, accountants and the legal team, who use the module screens.

## Product Purpose

Mechallex is an ERP for credit portfolio management and collections: clients and credit operations, amortization (French and German systems, recalculation), payments and partial payments, accounting entries and reconciliation, graphic reports, legal cases (procedural flow and costs) and automated collection campaigns (calls, SMS, WhatsApp, email) orchestrated through n8n. Success for this phase: a navigable, coherent demo that proves the product idea and shows in the owner's portfolio.

## Positioning

One product that joins the financial core (amortization, payments, accounting) with collections operations and judicial collection, where most tools in the sector cover only one of the three. Part of the "Mechal" product family by Andrea Lascano (sibling: Mechaltrendy).

## Operating Context

Ecuador, USD. Fictional cédulas of 10 digits, Ecuadorian cities, judicial process under COGEP (demanda, citación, audiencia, sentencia, ejecución, embargo/remate). Used on office desktops during the workday; also shown on mobile and inside a laptop mockup in the owner's portfolio (Astro, dark room, dusty-rose palette).

## Capabilities and Constraints

- Frontend only; all data mocked in an isolated layer (`src/mocks` behind `src/services`) so an API can replace it without touching screens.
- Mock data must be internally consistent: amortization balances sum, payments reduce balances, accounting entries balance.
- n8n integration is interface-only, no real connection.
- Light and dark mode required. Responsive and accessible.

## Brand Commitments

- Name: Mechallex (family "Mechal").
- Owner's taste, binding: minimalist, elegant, tech. Palette: black, white and neutral greys with a purple accent (~10%); the earlier rose palette was rejected as too "girly" (2026-11-13).
- Must never copy code, screens, names, logos, texts or data from the owner's employer or its internal system. Only general, common sector business logic.

## Evidence on Hand

None real. All people, companies, IDs, amounts and cases are invented and must be labeled as demo data. No customers, benchmarks or pricing may be claimed.

## Product Principles

1. The morning question first: how is the portfolio doing and where must I act today.
2. Numbers must reconcile everywhere; a demo that does not add up destroys trust in a financial product.
3. Collections is a sequence (preventive → administrative → extrajudicial → judicial); the UI should show where each operation sits in it.
4. Automation is visible and controllable: rules, channels and outcomes are legible, never a black box.

## Accessibility & Inclusion

WCAG AA contrast in both themes, keyboard navigation, charts with text equivalents (values in tables or labels).
