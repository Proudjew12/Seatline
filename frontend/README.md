# Seatline frontend

Seatline's React, Vite, TypeScript, and SCSS Modules application builds customer software-license
quotes. Choose or create catalog entries, drag to add licenses, enter your own USD prices,
and export a PDF. Add product asks only for its name, short label and icon, then creates an empty
product. Add its licenses with Add license; product profit defaults remain in Edit product.
The searchable, locally bundled software-icon library includes SentinelOne and BitTitan, suggests
symbols from product names, supports manual choices and preserves selections after reload. Icons share theme colors and dimensions across
the picker and product rail. Shared brand artwork appears once, with Google / Workspace and
Microsoft / Windows searchable under either name; older saved icon choices continue to resolve.
Sources and licensing are documented in `src/features/catalog/icons/`.
The top-left header and theme previews show only the Seatline name.
Each product has a default Profit rate, with optional per-license overrides.
Rates support 0–1,000,000% with up to two decimal places, including rates above 100%.
A blank license rate inherits its product, while zero is an explicit override. New quote lines
copy the effective rate and remain independently editable; existing lines retain their rates.
Each quote line also has a separately saved Discount from 0–100%, with up to two decimal places.
It applies after the profit addition, to the cent-rounded selling price, and the discounted unit
rounds to cents before quantity. Older drafts keep 0% discount. The private row shows base-price ×
profit percentage when no discount applies, or final customer price minus cost when discounted;
negative earnings remain visible. Customer PDFs contain only final selling prices.
Customer, Sales Proposal and New Order share a desktop row. Billing controls fit
their selected text, and numeric/customer/proposal inputs size around their contents, with bounded
widths and editable minimums. The subtotal shows its amount and billing period without a caption.
Notes dock above payments while cards scroll.
Quote cards fit five columns at a 1867px viewport and default text size, with centered product and
license headings. Billing Option and Profit rate share a row above Quantity, Price and Discount, and each
label is centered over its compact control. The formula/result group and subtotal are centered.
More cards fit per desktop row without
stretching a single item across the workspace; large text and narrow screens reduce the columns.
On narrow screens Notes follow the cards before the payment summary. The settings gear contains Edit Mode, text size, a Theme gallery,
and Light/Dark appearance for the Default theme. Studio, Midnight, Dune, Forest and Plum each have
a fixed appearance. Aurora, Solstice and Orbit add generated background artwork, gradients and
frosted panels. Harbor, Meadow and Alpine add original scenic backgrounds with neutral
productivity surfaces. Aurora Rose, Mint, Ice, Peach, Dusk and Ocean extend the silk and glass
family with six original backgrounds. All twelve background themes have fixed appearances.
Every theme fills the viewport without an outer margin or rounded workspace corners. The gallery
groups eighteen previews under Default, Color themes and Background themes, including Hebrew
section headings and an edge-to-edge miniature of each workspace.
Their local WebP assets and generation prompts live in `src/styles/theme-art/`;
`_artwork-themes.scss` owns the initial abstract themes, `_scenic-themes.scss` owns the scenic
themes, and `_aurora-variants.scss` owns the six Aurora variants.
Theme, Default
appearance, text size, and English/Hebrew language are saved
independently. Hebrew uses RTL throughout the interface and PDF, while product/license names
remain English. The three billing schedules distinguish monthly payments from yearly payments
made in full at the start of each year, and catalog cards show all three saved prices together.
Pointer dragging is disabled in Edit Mode. Clicking or tapping a card does not add it; keyboard users can focus a card and press Enter or Space.
One draft and custom catalog
entries are saved in this browser on this device. The drag instruction appears only while the
order has no licenses.

This folder is intentionally independent from `backend/`. It communicates with the backend only
through HTTP and can be copied into its own repository without changing its internal structure.

```text
frontend/
├── config/      # Vite, ESLint, TypeScript, and browser-test configuration
├── public/      # favicon, crawler policy, and licensed PDF font
├── src/         # application code and colocated SCSS Modules
├── tests/       # browser behavior tests
├── package.json
└── tsconfig.json
```

The small root `tsconfig.json` lets editors discover the configurations in `config/`. npm, Vite's
HTML entry, and environment files stay at the application root where their tools expect them.

## Setup

```bash
cp .env.example .env
npm ci
npm run test:install
```

## Run

```bash
npm run dev
```

The development server is available at `http://127.0.0.1:5173`. The quote builder needs no API;
the operational API connection check is at `/#/status`.
The default `VITE_API_BASE_URL=/api` is proxied to the local backend during development. For a
separate API, set it to an absolute HTTP(S) URL. In production, route `/api` to the backend at the
reverse proxy or set the variable to the deployed API origin before building.

If a local backend uses a non-default address, set `VITE_DEV_API_PROXY_TARGET` to its origin. The
root launcher supplies this automatically from the backend's validated `APP_HOST` and `APP_PORT`.

### Preview on a tablet

For a device on the same local network, replace `YOUR_LAN_IP` with this computer's local IPv4
address (shown by `ip -4 address` on Linux), then run:

```bash
npm run dev -- --host YOUR_LAN_IP --port 5182
```

Open `http://YOUR_LAN_IP:5182/` on the tablet while the computer and server stay running. This
serves the current local code without publishing to GitHub Pages. Each browser keeps its own
draft and catalog. Quote and catalog IDs support local HTTP using the browser's
[`getRandomValues`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues)
when `randomUUID` is unavailable.

## GitHub Pages

The root `.github/workflows/deploy-pages.yml` publishes this app from `frontend/dist`. Enable
**GitHub Actions** as the Pages source in the repository settings. Relative build assets and hash
routing make the output portable across repository paths and custom domains.

To connect the deployed page to an API, set the Actions repository variable
`VITE_API_BASE_URL=https://api.example.com/api` and allow the Pages origin in the backend's
`APP_CORS_ORIGINS`. The API must be hosted separately over HTTPS. Without the variable, the static
quote builder and PDF export work independently; only `/#/status` displays API-not-configured.

## Quality gate

```bash
npm run check
```

The gate runs ESLint, strict TypeScript checks, and the production Vite build, including Sass
compilation. Run the browser behavior tests separately:

```bash
npm test
```

Playwright starts and stops its own Vite server on `127.0.0.1:4175`. Tests run in Chromium at desktop,
tablet, and mobile sizes. Quote tests cover billing totals and validation, catalog creation, saved
drafts, mouse dragging, immediate touch dragging and scrolling beside cards, keyboard addition,
ignored clicks/taps, three-price previews, responsive order-card columns, PDF
download and export retry, and overflow. PDF checks cover Logi branding and recovery from unavailable
logo/font assets. Health tests cover loading, success, error/retry, malformed
responses, navigation, and keyboard focus. API responses are controlled in the browser, so this
command does not need a backend. The full-stack root's `npm run smoke` verifies the real HTTP
integration. Test failure screenshots and traces go to a temporary directory printed with the
failure, keeping the repository free of generated reports.

`npm run test:install` installs Chromium locally; run it after updating Playwright. Additional SCSS
architecture guards and browser tests run in the full-stack root's `npm run check`.

Dependencies use exact versions and a committed npm lock. Update direct dependencies deliberately
and run `npm update`, `npm run check`, `npm test`, and `npm audit` afterward. TypeScript stays on
the latest 6.0 release while [typescript-eslint supports versions below 6.1](https://typescript-eslint.io/users/dependency-versions/).
Node types follow the Node major in `.nvmrc`.

## Feature location

```text
src/features/<feature>/
  api/
  components/
    FeatureView.tsx
    FeatureView.module.scss
  hooks/
  types.ts
```

Route pages compose features. Shared visual components belong in `src/components`, and low-level
transport/configuration utilities belong in `src/shared`. Reusable pure functions belong in
purpose-specific `.ts` modules under `src/shared/utils`; use `.tsx` only for files that render JSX.
Create domain-named feature folders and add only the files their behavior requires. The existing
`catalog` feature owns products and licenses; `quotes` owns draft editing, validation, integer-cent
totals, storage, and PDF export. `display` owns settings, theme previews/gallery, and saved theme/appearance/language/size. `shared/i18n` owns
the bilingual message catalogs and locale context, shared with PDF generation. No translation
service receives customer data. `health` owns the operational API connection check. Heavy PDF code
loads only on export; its regular/bold fonts and license are in `public/fonts/`. Customer quotations
use the original Logi logo in `public/branding/`, with the source recorded beside the asset. The
PDF has a compact item table, a billing-based cost breakdown, repeated table headers, and page numbers.
The date sits alone beside the fixed-left logo. An inline Company/name and proposal reference share
the following row, mirrored for Hebrew. Each item puts the bold product above its license and shows
only bold Paid monthly/yearly billing, with each price and period together on one line. The footer
shows each present billing group's payment amount × 12 monthly or 1 yearly payment, its 12-month
cost, and one highlighted Estimated total for 12 months. Zero-priced groups remain visible; absent
groups are omitted. Monthly costs are estimated over 12 months. The initial-payment total and
upfront qualifier are omitted from the PDF; website totals and pricing rules remain unchanged.
The generic title/subtitle, Sales Proposal, Issued, Prepared For, License Details, currency caption,
payment-summary heading and terms are omitted. Continuation
pages keep just a small left logo and right-side proposal reference, while Hebrew content keeps RTL.
Eight short license rows and a brief note fit on one page; long names and notes remain fully printable.
It bundles its assets locally and does not contact Logi's website during export.

## Styling location

```text
src/styles/
  abstracts/
    _variables.scss
    _functions.scss
    _mixins.scss
  _tokens.scss
  _global.scss
  main.scss
```

Use colocated `*.module.scss` for components and pages. Only `src/main.tsx` imports the global
`styles/main.scss` entry. Keep compile-time tools under `abstracts`, use Sass `@use`, and consume
runtime themes through CSS custom properties emitted by `_tokens.scss`. Global styles own reset
and element defaults; feature selectors stay local. See [AGENTS.md](AGENTS.md) for the full rules.
