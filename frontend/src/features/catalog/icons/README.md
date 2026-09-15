# Product icons

This finite, locally bundled library contains 106 distinct choices: 98 named
software/vendor choices and eight original general symbols. Google / Workspace share one
choice, as do Microsoft / Windows, avoiding repeated silhouettes in the theme-colored gallery.
It does not fetch icons, search names, or send catalog data to an external
service at runtime. Vite's explicit `?no-inline` asset imports keep every URL usable under a
deployment subpath and emit small, cacheable SVG files instead of embedding their geometry in the
main JavaScript bundle. The browser requests only locally served icons when they are displayed.
The library includes 104 SVGs, one unmodified transparent PNG from BitTitan and one unmodified
transparent WebP from Freshworks.

`productIcons.ts` owns stable saved IDs, display names, search keywords, categories and asset URLs.
The nine categories are General symbols, Productivity & Email, Collaboration & Projects,
Security & Identity, Backup & Migration, IT & Cloud, Design & Documents, Development Tools,
and Business & Analytics. Each choice has exactly one category; broader use cases remain
searchable through its English and Hebrew keywords. The category definitions live separately in
`productIconCategories.ts` so the picker can translate and present them consistently. The registry's
`suggestProductIcon` helper matches whole brand words, preferring longer, specific names; it also
recognizes common aliases such as M365, Office 365 and Acronix. Unrecognized names return `generic`.
Canonical names participate in suggestions automatically. `productIconAliases.ts` contains explicit
alternatives such as Sentinel One, Sentinel1 and SentinalOne; Bit Titan and MigrationWiz;
Crowd Strike and Falcon; Share Gate; MSP 360 and CloudBerry; and Hebrew name aliases.
Names and aliases use the same punctuation normalization without matching inside other words.
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

The SentinelOne shield uses the five symbol paths from the
[official header logo](https://www.sentinelone.com/wp-content/themes/sentinelone/carbine/assets/svg/s1-logo-color.svg),
retrieved on 2026-09-13. Those paths retain their geometry and are uniformly scaled and centered
in a 24-unit viewBox; the wordmark, gradients and clipping wrapper are omitted for mask rendering.
The source page is [SentinelOne](https://www.sentinelone.com/) and its
[brand guide](https://www.sentinelone.com/brand/) documents the vendor's usage terms.

The BitTitan cloud/arrow symbol is the unmodified 292 × 209 transparent PNG from the
[official icon asset](https://www.bittitan.com/wp-content/uploads/2022/10/Logo_BitTitan-Icon-on-Light.png),
retrieved on 2026-09-13. The vendor's
[asset metadata](https://www.bittitan.com/wp-json/wp/v2/media/3281) identifies it as the BitTitan icon.
Its alpha channel works with the same CSS-mask rendering as the vector choices, with no redraw,
background or embedded remote content. SentinelOne and BitTitan are vendor assets outside the
Simple Icons CC0 dedication; both original download digests are recorded in `provenance.json`.

The expanded reseller library adds 44 choices. Thirty preserve geometry and metadata from the
same pinned Simple Icons 11.15.0 collection: Trend Micro, Palo Alto Networks, Bitwarden, Datto,
Backblaze, Wasabi, AnyDesk, Proxmox, Nutanix, Synology, QNAP, Ubiquiti, Red Hat, Ubuntu,
DigitalOcean, Zoho, JetBrains, Postman, Datadog, Sentry, Avast, Avira, NordVPN, OpenVPN, WireGuard,
Tailscale, Snyk, Splunk, New Relic and Grafana.

Fourteen additions use assets published on their vendors' own sites: ESET, CrowdStrike, Check Point,
Zscaler, Proofpoint, Duo, Keeper, ShareGate, ConnectWise, Jamf, WatchGuard, Commvault, MSP360 and
Freshworks. These are vendor assets outside the Simple Icons CC0 dedication. Each source URL,
source-page URL, original download digest and geometry adaptation is recorded in
`provenance.json`. Downloads were retrieved on 2026-09-15. Brand guidelines and applicable vendor
rights continue to apply; this library does not claim universal permission for other uses.

For these SVG additions, selected symbol paths are uniformly scaled and centered. ESET omits the
tagline and registration symbol; Check Point, Keeper, Jamf and Commvault use their distinct marks
without accompanying lettering; CrowdStrike uses its falcon. The ShareGate symbol preserves its
white keyhole cutouts as transparent areas through an even-odd compound path. Proofpoint omits
the favicon background, preserving the letter's paths. WatchGuard's source transform is flattened
without changing its geometry. Duo omits the Cisco endorsement lettering. MSP360 uses the first
four paths of `symbol#icon-logo-colored` from its official icon sprite, excluding its tagline.
ConnectWise retains its wordmark. Commvault's source digest records the downloaded HTML because
the mark is an inline header SVG. Freshworks retains the original transparent 82 × 82 WebP bytes;
its alpha channel works with the same CSS mask as the other choices.

The `generic`, `cloud`, `security`, `database`, `server`, `email`, `development` and `design` symbols
are original geometric SVGs created for Seatline and follow the application's source license.
All vendor names and marks belong to their respective owners. Inclusion identifies catalog
products and does not imply endorsement, affiliation or vendor permission for another use.

## Rendering and maintenance

SVG assets contain only paths, with a 24 × 24 viewBox. Simple Icons path geometry is preserved;
unneeded titles and root presentation attributes are removed. There are no scripts, event handlers,
external references, fonts or embedded raster images. Their transparent silhouettes support the
catalog's CSS-mask rendering without a fixed rectangular background.
Compact symbols occupy a 24px square. Wider wordmarks use the existing `wordmark` flag to request
36px of width and uniform scaling within the same 24px-high control. This includes Veeam, VMware,
Datto, Synology, QNAP, Splunk, ESET, Duo, ConnectWise and MSP360. All geometry keeps its proportions.

Keep the same ID when replacing a symbol so saved catalogs continue to resolve. When consolidating
duplicate artwork, retain the old IDs as lookup aliases and include every name in search keywords.
Add the local icon asset,
registry entry and source metadata together. Preserve upstream license terms and record the source
version and original digest. Avoid runtime icon URLs or accepting arbitrary SVG/URL values through
the catalog data boundary.
