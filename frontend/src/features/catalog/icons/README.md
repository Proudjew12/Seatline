# Product icons

This finite, locally bundled library contains 60 distinct choices and SVG assets: 52 named
software/vendor choices and eight original general categories. Google / Workspace share one
choice, as do Microsoft / Windows, avoiding repeated silhouettes in the theme-colored gallery.
It does not fetch icons, search names, or send catalog data to an external
service at runtime. Vite's explicit `?no-inline` asset imports keep every URL usable under a
deployment subpath and emit small, cacheable SVG files instead of embedding their geometry in the
main JavaScript bundle. The browser requests only locally served icons when they are displayed.

`productIcons.ts` owns stable saved IDs, display names, search keywords and asset URLs. Its
`suggestProductIcon` helper matches whole brand words, preferring longer, specific names; it also
recognizes common aliases such as M365, Office 365 and Acronix. Unrecognized names return `generic`.
`findProductIcon` accepts an unknown value and returns only registered entries. Legacy saved
`google-workspace` and `windows` IDs resolve to `google` and `microsoft`; catalog loading normalizes
those IDs while preserving product names, licenses, prices and profit rates. Both names remain
searchable, and new name suggestions use the canonical IDs. General categories
remain available for products without a bundled vendor symbol.

## Sources and rights

Most brand geometry comes from the pinned [Simple Icons 11.15.0 collection](https://github.com/simple-icons/simple-icons/tree/11.15.0/icons).
The Microsoft 365 choice uses the historical Microsoft Office symbol from
[Simple Icons 7.21.0](https://github.com/simple-icons/simple-icons/blob/7.21.0/icons/microsoftoffice.svg).
Google Workspace uses the Google G symbol; these choices identify catalog products and do not
claim to reproduce each vendor's newest application artwork.

[LICENSE-CC0.md](LICENSE-CC0.md) is the unchanged Simple Icons project dedication from both pinned
versions. That project dedication does **not** establish that every brand icon is CC0 or grant
trademark rights. Read the upstream
[disclaimer](https://github.com/simple-icons/simple-icons/blob/11.15.0/DISCLAIMER.md).
[provenance.json](provenance.json) preserves the upstream metadata for each included source asset,
including individual license and brand-guideline links when present, the pinned download URL, and
the original download's SHA-256 digest. Missing individual license metadata is not a grant of rights.
In particular, Microsoft Teams, OneDrive, SharePoint, Exchange, Power BI and Webex carry upstream
custom-license references; their vendor terms continue to apply.

The Acronis symbol is the unmodified A path from the
[official favicon](https://www.acronis.com/public/favicon/favicon.svg), retrieved on 2026-09-13.
Its source page is [Acronis](https://www.acronis.com/en-us/) and its
[brand guide](https://logo.acronis.com/) specifies navy or white logo treatments. The favicon's
square background, clipping wrapper and embedded style were omitted, and the path is uniformly
scaled and positioned in a 24-unit viewBox. This is an Acronis vendor asset, outside the Simple Icons
CC0 dedication. Its download digest is recorded separately in `provenance.json`.

The Zoom choice uses the camera path from the official
[Zoom Meetings icon](https://media.zoom.com/images/assets/icon-meeting.svg/Zz01ZDBmYTBjMDZjMDgxMWVlOTQ0OTZlZmVjZjIyN2E4NQ==),
linked by the [Zoom Meetings product page](https://www.zoom.com/en/products/meetings/) and retrieved
on 2026-09-13. Its circular background and clipping wrapper were omitted; the camera path is
preserved and uniformly scaled and centered in a 24-unit viewBox. This replaces the narrow Simple
Icons Zoom wordmark with a recognizable symbol at the catalog's small icon size. It is a Zoom
vendor asset, outside the Simple Icons CC0 dedication, with its source digest in `provenance.json`.

The `generic`, `cloud`, `security`, `database`, `server`, `email`, `development` and `design` symbols
are original geometric SVGs created for Seatline and follow the application's source license.
All vendor names and marks belong to their respective owners. Inclusion identifies catalog
products and does not imply endorsement, affiliation or vendor permission for another use.

## Rendering and maintenance

Assets contain only SVG paths, with a 24 × 24 viewBox. Simple Icons path geometry is preserved;
unneeded titles and root presentation attributes are removed. There are no scripts, event handlers,
external references, fonts or embedded raster images. Their transparent silhouettes support the
catalog's CSS-mask rendering without a fixed rectangular background.
Compact symbols occupy a 24px square. The Veeam and VMware wordmarks use 36px of width and uniform
scaling within the same 24px-high control, preserving their proportions without shrinking the lettering.

Keep the same ID when replacing a symbol so saved catalogs continue to resolve. When consolidating
duplicate artwork, retain the old IDs as lookup aliases and include every name in search keywords.
Add the local SVG,
registry entry and source metadata together. Preserve upstream license terms and record the source
version and original digest. Avoid runtime icon URLs or accepting arbitrary SVG/URL values through
the catalog data boundary.
