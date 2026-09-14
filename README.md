# Seatline

Seatline builds customer quotes for software licenses using your own USD prices. Its React + Vite
frontend runs independently on GitHub Pages, including PDF export. The separate FastAPI backend
provides the operational health API and remains available for future server features.

```text
Seatline/
├── frontend/   # standalone browser application
├── backend/    # standalone HTTP API
├── scripts/    # setup, launch, cleanup, checks/, and tests/
├── README.md   # scope, commands, and architecture
├── AGENTS.md   # repository working rules
└── package.json
```

## Scope

For sellers quoting licenses from multiple companies:

1. In **Normal Mode**, choose a product from the compact left rail and search its license list.
   Switch to **Edit Mode** to add, rename, or remove products and licenses, including the initial
   entries. Open the top-right gear to switch modes. **Add product** asks only for a product name,
   optional short label and product icon, then creates an empty product. Use **Add license** afterward.
   Names suggest a matching icon until you make a manual choice; the searchable icon library includes
   software brands and general symbols. Edit product can change the name, short label, icon and profit
   default. Icons use the current theme's foreground colors in the picker and product rail.
   Pointer dragging is disabled in Edit Mode; deliberate keyboard addition remains available.
2. Drag a license into the quote. Clicking or tapping a card does not add it.
   New items start with **Annual — Pay Monthly**;
   choose **Monthly — Pay Monthly** or **Annual — Pay Yearly** on the order item when needed.
   On a tablet, move a card to drag immediately, with no long press. Swipe the space beside the cards
   to scroll the catalog. Keyboard users can focus a card and press Enter or Space.
3. Enter quantities, customer, **Sales Proposal** number, and optional notes. Each license can have a saved
   default USD price for each billing schedule; catalog cards show all three prices together,
   with monthly or yearly units. Adding a license fills in the matching price. Override that
   base price in the order whenever needed. In **Edit product**, set a **Profit rate** for each product
   (0% initially). Each license can inherit that rate or override it; a blank license rate inherits,
   while an explicit 0% overrides the product. These defaults apply when a new quote line is added,
   and its rate remains individually editable. Existing lines keep their rates after catalog or
   billing changes. The private one-line calculation shows profit per license, such as
   `$22.00 × 32% = $7.04`, with the earned amount directly beside the formula. Customer totals and PDFs use the
   final selling price ($29.04 in this example), without revealing the profit calculation.
   Each quote line also has a **Discount** from 0–100%, applied after the profit addition.
   It starts at 0% and stays independent of other lines and catalog defaults. With a discount,
   the private strip shows final customer price minus base cost, including a signed loss when
   the final price is below cost. A $25 base price with 20% profit and 10% discount sells for
   $27 and earns $2 per license. PDFs and payment totals use the discounted customer price.
4. Review monthly payments, yearly payments, the amount due at the start, and a 12-month
   estimate; download the customer PDF using the button at the bottom.
5. Open **Settings → Theme** to browse eighteen visual previews grouped under **Default**,
   **Color themes**, and **Background themes**, and apply a theme immediately.
   **Default** retains the original Light/Dark appearance options. **Studio**, **Midnight**,
   **Dune**, **Forest**, and **Plum** each have a fixed appearance. **Aurora**, **Solstice**, and
   **Orbit** add original background artwork, gradients and frosted panels.
   **Harbor**, **Meadow**, and **Alpine** combine original coastal, meadow and mountain artwork
   with restrained neutral controls. **Aurora Rose**, **Aurora Mint**, **Aurora Ice**,
   **Aurora Peach**, **Aurora Dusk**, and **Aurora Ocean** add six distinct silk and glass variants.
   All twelve background themes have fixed appearances. Every theme fills the browser area
   edge to edge, without an outer margin or rounded workspace frame.
   Returning to Default restores the last Light/Dark choice.
   Theme changes preserve the current quote and catalog.

The initial catalog includes Microsoft 365, Google Workspace, Adobe Acrobat, and Zoom Workplace.
It also includes Acronis with one unpriced **Example license**, a demonstration entry rather than
an official plan. The example is added once to older saved catalogs; it can be edited or removed.
These are unpriced starting names, not a live price feed. Confirm each vendor's applicable plans
and billing terms before quoting. All catalog edits and default prices are saved locally. A blank
default price means manual entry; zero is a valid price. Editing or deleting a catalog entry leaves
existing order items intact. Deleting the last product or license is supported; Edit Mode can add
entries again. The catalog supports 50 products, 100 licenses per product, and 2,000 licenses total.

Monthly schedules use a price per license **per month**; yearly billing uses a price per license
**per year**, paid in full at the start of each year. Changing a quote line's billing schedule applies
the matching saved catalog price, or clears the price for manual entry when none is available.
Existing drafts without a catalog
license link also clear their price on a billing change. Catalog edits do not reprice existing lines.
Quantities are whole numbers from 1–9,999; prices allow zero through $1,000,000 with up to two decimal
places. Profit rate is an addition to the base price and accepts 0–1,000,000% with up to two decimal
places at product, license and quote-line level. For example, a $25 base price with 150% profit
adds $37.50 and produces a $62.50 customer price. The customer unit price
is rounded to the nearest cent before multiplying by quantity, so printed unit prices and totals
agree. Discounts accept up to two decimal places and apply to the cent-rounded selling price;
the discounted unit is rounded again before quantity. Older drafts without a discount retain
their prices. Discount edits are saved with the quote and survive billing changes. Calculations
use integer cents and percentages use integer basis points, with an exact
integer intermediate for percentage multiplication. Lines and quote totals beyond the safe integer
range cannot be exported. Quotes support up to 100 lines and exclude taxes. The
12-month estimate assumes monthly subscriptions continue for all 12 months.

One active draft is saved in this browser on this device. There are no accounts, cross-device sync,
quote history, vendor imports, or tax calculations in this version. Download a PDF before starting
a new quote. New quote references use **SP-0001**, **SP-0002**, and so on, advancing with each
**New Order**. References remain editable; changing one keeps the numbering sequence for the next
order. Existing filled-in drafts retain their references. Numbering is local to the saved draft,
not shared between users or devices. Clearing site data resets numbering and removes local drafts
and custom catalog entries; a new domain has separate browser storage. Customer details and prices
stay in the browser. PDF generation uses locally bundled code and fonts without sending quote data
to a server.

Acceptance checks cover disabled dragging in Edit Mode, desktop mouse drag, immediate tablet drag,
ignored clicks/taps, keyboard addition, product/license profit inheritance and explicit overrides,
per-line profit/discount rounding, net earnings and customer-only PDF amounts, compact header/card controls and docked Notes,
Hebrew/English layout and PDF text/coordinates/pagination, compact one-page quotes with eight short
license rows and a note, theme gallery selection and persistence,
Default-only Light/Dark controls, nested-dialog keyboard focus, readable narrow-screen previews,
all three billing schedules, invalid input, local persistence, PDF download and retry, responsive
layout, saved text-size preferences, empty-product creation, searchable/persistent icons, catalog
editing/default prices/migration, and production hosting
from a repository subpath without an API.

## Start

Use Node 22.22.2 or newer, npm 10 or newer, and Python 3.13; respect the application version files.

```bash
npm run setup
npm run dev
```

Setup installs both applications and creates missing local environment files. The launcher starts
both servers and stops the other process when either exits or you interrupt it.
Setup also installs Chromium for the frontend browser tests.

- Frontend: `http://127.0.0.1:5173`
- Operational status screen: `http://127.0.0.1:5173/#/status`
- API: `http://127.0.0.1:8000`
- Interactive API documentation: `http://127.0.0.1:8000/docs`
- Live OpenAPI schema: `http://127.0.0.1:8000/openapi.json`

FastAPI generates the schema from the backend's routes and Pydantic models. There is no saved schema
to update. API documentation and the schema endpoint are disabled in production.

## Commands and verification

| Command | Purpose |
| --- | --- |
| `npm run setup` | Install both applications and create missing local env files. |
| `npm run dev` | Start both applications with coordinated shutdown (`-- --frontend-port PORT` selects another frontend port). |
| `npm run check` | Run structure guards, lint/types/build, and all automated tests. |
| `npm run check:frontend` | Run frontend ESLint, TypeScript checks, and the production build. |
| `npm run check:backend` | Run backend dependency integrity, Ruff, mypy, and pytest. |
| `npm test` | Run repository, backend, and frontend behavior tests. |
| `npm run smoke` | Exercise combined startup, HTTP health integration, and clean shutdown. |
| `npm run lock:python` | Regenerate backend dependency locks with `uv`. |
| `npm run clean` | Remove generated caches and build output, keeping local env files. |
| `npm run clean -- --dry-run` | Preview the exact generated paths to remove. |

The full gate can also be run with `python3 scripts/check.py`. Repository guards include dependency
boundaries, SCSS conventions, and deployment configuration. The HTTP smoke path uses free local ports and checks the frontend
proxy and request-ID propagation; exercise changed UI in a browser as well. CI runs checks, smoke
validation, and separate dependency vulnerability audits.

## File organization

Frontend tool configuration lives in `frontend/config/`, and browser tests live in
`frontend/tests/`. Backend dependency locks live in `backend/requirements/`, with behavior tests
in `backend/tests/`. Keep package manifests, entry HTML, environment files, and discovery files
such as `tsconfig.json` at their application roots so the tools and editor can find them.

The shared `.vscode/settings.json` hides installed dependencies and generated output from the
Explorer, and points ESLint and TypeScript at the frontend configuration. It also groups root
configuration and environment files beneath `package.json` or `pyproject.toml` in Explorer; expand
the manifest to access them. This is visual nesting: discovery files such as `.gitignore`,
`.gitattributes`, `.editorconfig`, and `.npmrc` keep their normal discovery locations. Dependencies in
`node_modules/` and `.venv/` remain installed because they run the applications and checks.
Cleanup removes known caches and builds, preserving environments, dependencies, and user files.
Production builds and checks regenerate their output when needed.

## Run one application

Both folders have their own commands and instructions. Run each example from the repository root:

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
npm run check
```

```bash
cd backend
python manage.py setup
python manage.py dev
python manage.py check
```

Set `VITE_API_BASE_URL` for an independently hosted API. See
[frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md) for application
configuration.

## Architecture

- Frontend: `app/pages -> features -> components/shared`. Pages compose domain features, feature
  API functions use shared HTTP transport, and reusable visual components remain feature-neutral.
- Backend: `router -> service -> repository/integration`. Routers own HTTP concerns, Pydantic
  schemas validate boundaries, and services own behavior. Add I/O layers only for actual I/O.
- Applications communicate through HTTP and never import each other's source. Root scripts are
  development conveniences, never application runtime dependencies.
- Use colocated `*.module.scss`; `src/main.tsx` imports the one global Sass entry. Sass helpers live
  under `styles/abstracts`, and `_tokens.scss` emits CSS custom properties for runtime themes.
- Validate external values, keep secrets out of browser variables, and enforce permissions on the
  server. See [.github/SECURITY.md](.github/SECURITY.md) and each application's `AGENTS.md` for working rules.

The first version deliberately keeps catalog selection, quote calculations, and versioned local
storage in browser-owned domain features. This supports static GitHub Pages hosting without a
database or deployed backend. `@dnd-kit/react` provides whole-card pointer dragging; native card
buttons support keyboard and assistive activation, while pointer clicks and taps do not add items.
Edit buttons remain separate controls.
`jsPDF` is loaded on export and uses a
bundled, licensed Unicode font for downloadable, paginated documents. React web meets the desktop
and tablet requirement without a native app or Expo. Revisit persistence and API contracts when
shared accounts or durable quote history become requirements.

The interface uses soft gray surfaces, navy text, blue accents, and a compact product rail and license
list. Narrower order cards fit five per row at a 1867px desktop width, three at 1440px and two at
1180px at the default text size, adapting to fewer columns as text grows. Empty grid tracks retain
the same card width when an order has only one item. Compact fields retain larger touch targets
on tablets. Each card centers a smaller product caption above its prominent license title.
Billing Option and Profit rate share the first row, with Quantity, Price and Discount centered underneath.
Every label is centered above its content-sized control; rows wrap when larger text needs more room.
The billing period sits beside the centered line total. Catalog cards compare Monthly, Annual · Monthly, and
Annual · Yearly rates, distinguishing unset prices from zero. The drag instruction appears only
while the order has no licenses.
Customer, Sales Proposal and New Order share a desktop row; New Order is a text-only button.
The row adapts on narrow screens. Billing selectors fit the currently selected text; quantity,
price, profit, customer and proposal fields grow and shrink with their values. Small minimum sizes
keep empty fields editable, while maximum widths prevent page overflow. They use native
[content-based field sizing](https://developer.chrome.com/docs/css-ui/css-field-sizing), with
character-sized input and native select fallbacks. The line subtotal retains its amount and billing
period without a visible "Line total" caption.
The private profit strip centers the formula and result together with a small fixed gap, keeping
the calculation on one line, with compact typography for unusually long amounts on
narrow cards. Notes stay docked immediately above payments while desktop/tablet quote cards scroll;
on narrow screens, notes remain after the cards and before the summary in normal page flow.
The website summary omits the redundant USD/tax caption; PDF prices retain their USD formatting.
The header displays only the Seatline name at the top left, with a settings gear at the top right.
Theme previews use the same wordmark-only header. The accessible settings
dialog contains the Edit Mode switch, text size from 50% to 150% in 10% steps, a Theme row with a
gallery button, and English/Hebrew language. Light/Dark appearance is available only for Default.
The gallery separates Default, five Color themes and twelve Background themes with translated,
accessible section headings. Default has a wide preview row on desktop; theme grids use three,
two or one columns as space allows. The gallery offers Studio (white/indigo), Midnight (navy/teal), Dune (sand/terracotta), Forest
(sage/evergreen), and Plum (aubergine/mauve), plus Aurora (luminous lavender/cyan silk), Solstice
(peach sunset and sculpted dunes), Orbit (violet planet and orbital light), Harbor (charcoal and
teal coastal dusk), Meadow (neutral white and green hills), and Alpine (slate and blue mountain
lake). Aurora's six additional variants are Rose (blush/champagne), Mint (mint/seafoam),
Ice (silver/glacier blue), Peach (apricot/honey), Dusk (amethyst/orchid), and Ocean (deep teal/aqua).
The twelve background themes use bundled WebP artwork and translucent panels, with opaque form
controls for legibility. All workspaces and supporting routes extend to the viewport edges;
internal spacing keeps controls comfortable to use. Previews mirror this edge-to-edge layout.
Artwork also appears on supporting routes, while PDF print styling stays independent. Default
and Color themes reset artwork to none and retain their original palettes. No remote image service is
needed at runtime; Vite bundles the assets with deployment-safe URLs. Scenic artwork and theme
names are original to Seatline; no vendor wallpapers are bundled with these themes.
Catalog symbols are separate local assets under `frontend/src/features/catalog/icons/`, with
sources and licensing documented there. They identify catalog products without implying affiliation.
Their CSS masks use theme colors, keep consistent dimensions and make no external image requests.
The library includes SentinelOne and BitTitan alongside the existing software brands.
Brand and product names stay in English; icon search also supports aliases and translated general
symbols. Shared artwork appears once in the gallery: Google / Workspace and Microsoft / Windows
each have one searchable choice. Previous icon IDs still resolve to their matching artwork.
Unknown saved icon identifiers fall back to the generic symbol. Older catalogs acquire
appropriate icons while retaining their saved products, licenses, prices and profit defaults.
These themes set colors,
borders, radii, and shadows consistently across the workspace; gallery previews use the same
scoped CSS tokens and artwork. Selecting a
card applies and saves it immediately; Done or Escape returns to Settings and focuses the gallery
button. Escape from Settings returns focus to the gear. On narrow screens, gallery cards scroll
inside the dialog while its title and Done button remain visible. Theme selection and the saved
Default Light/Dark preference are independent, so an existing dark preference is retained.
Older saved settings without a theme selection load Default; unsupported selections safely fall
back to Default. Mode starts in Normal on each visit; theme, appearance, language and size are saved
independently of the quote.
Hebrew mirrors the interface with RTL layout and translates controls, validation and PDF labels.
Product and license names stay in English using isolated LTR spans; prices and references keep
their numeric order. English retains the LTR layout. Source Sans 3 from Google Fonts is bundled locally under
the SIL Open Font License in `frontend/src/styles/fonts/`. Small Hebrew-only WOFF2 subsets of the
existing DejaVu fonts are bundled there too; their original license is in `frontend/public/fonts/`.
Unsupported scripts use the system font.
The text-size selector scales content text while preserving touch targets and readable header controls; it
does not change browser zoom or the PDF's print size. Its setting is saved separately from quote
data on this device. If browser storage is unavailable, changes still apply for the current visit.

Billing selectors appear on order items, with clear labels and soft menu styling. They use the
[customizable native picker](https://developer.chrome.com/blog/a-customizable-select)
where supported, with a standard native selector as the fallback.

**New Order** retains the confirmation before clearing an edited draft. Catalog management controls
are shown only in Edit Mode, and each visit starts in Normal Mode. Catalog storage uses a version 2
snapshot so removed initial entries stay removed. Existing version 1 custom entries are migrated,
with the old storage entry retained for recovery. The Seatline rename reads previous-brand draft,
catalog and display keys and writes new `seatline.*` keys, leaving the old values intact for
recovery. Only those compatibility keys and migration tests retain the previous name.
Customer PDFs use Logi branding, an original
transparent logo, embedded regular/bold fonts, a license table with repeated column headers, a compact
cost breakdown, and numbered pages. The first header places the date alone beside the left logo,
then an inline **Company: name** and proposal reference on the same row. Each item shows the product
in bold above its license, a bold **Paid monthly/yearly** label, and prices with their billing period
on the same line. The cost breakdown groups monthly and yearly billing, shows the payment amount
multiplied by 12 or 1 and each group's 12-month cost, then highlights the **Estimated total for
12 months**. Only billing groups present in the quote appear, including zero-priced groups.
This PDF estimate assumes all monthly licenses continue for 12 months; it does not present a payment
due now. The website's payment totals and calculations are unchanged. PDFs omit subscription
commitment captions, the upfront qualifier, the initial-payment total, the generic document title/subtitle,
Sales Proposal, Issued, Prepared For and License Details labels, currency caption, payment-summary
heading and explanatory terms. Short quotes
fit one page with readable body text; long names and notes wrap across pages, and monthly versus annual
prices remain explicit. The document language follows settings; its print theme stays light.
Hebrew customer names in English documents remain aligned with the left customer block. Hebrew
documents mirror the sections and columns while preserving English product/license names and
USD amounts. The Logi logo stays physically left on every page in both languages. Continuation pages
keep only a small logo and proposal reference above the content, without repeating the top title.
Markup percentages, base
prices, and company earnings are never written to the PDF; discounted final prices remain customer-facing.
PDF filenames use `Logi-<reference>.pdf`; the app itself remains Seatline.

## GitHub Pages

The repository is `Proudjew12/Seatline`; the default project-site path is `/Seatline/`.
The existing `.github/workflows/deploy-pages.yml` deploys `frontend/dist` on pushes to `main`.
Select **Settings → Pages → Source: GitHub Actions** in the repository. Relative Vite assets and hash
routing support repository subpaths and custom domains without server-side SPA fallback; routes
therefore contain `#`. Browser workflows, lint, types, and the production build must pass before
the Pages artifact is published.

Quoting and PDF export require no backend. To enable the optional `/#/status` connection check,
host FastAPI separately over HTTPS, set the Actions repository variable `VITE_API_BASE_URL` to its
API prefix, such as `https://api.example.com/api`, and set backend `APP_CORS_ORIGINS` to the frontend
origin, such as `https://OWNER.github.io` without the repository path. With no API variable, the
status screen reports that the API is not configured. Changing to history routing requires a host
that supports SPA fallback. Configure a custom domain and DNS when a domain is chosen.
