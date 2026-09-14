# Seatline and PDF branding

## Seatline brand kit

The project owner supplied the Seatline artwork through Penpot. The original outlined geometry
was exported on 2026-09-14; no symbol or lettering was redrawn, and no font is required to render it.

- `seatline-wordmark.svg` is the original transparent wordmark export.
- `seatline-wordmark-accent.svg` retains the original **line** path in the full wordmark viewBox.
  The application layers it over the full wordmark mask so the two parts follow the theme's text
  and accent colors without changing their spacing or proportions.
- `seatline-mark.svg` contains the original three seat shapes. The empty quote uses a theme-colored
  silhouette, matching the kit's monochrome treatment.
- `../favicon.svg` and `seatline-touch-icon.png` are the original blue-and-white app icon, exported
  as SVG and 223 × 223 PNG. The PNG has not been resampled.
- `seatline-logo.svg` contains the original symbol, wordmark and outlined **more seats, less sheets.**
  tagline. A white backdrop and clear space keep it readable in documentation on light/dark pages.

`seatline-provenance.json` records source node IDs, export digests and the limited transformations
above. The supplied kit is for Seatline; it is separate from the software vendor icon library.
The design account token and MCP connection settings are not part of this project. Runtime asset
requests stay on the application origin and support deployment below `/Seatline/`.

## Logi PDF branding

`logi-logo.png` is the original 800 × 300 PNG from the Logi website:

https://static.wixstatic.com/media/cc268c_0ab98d09c3f240cc904bfa09aa458232~mv2.png

The file is bundled unchanged, without upscaling, for the user-requested Logi branding in exported
quotes. The Seatline application keeps its own interface branding. No quote data is sent to the
source website; PDF exports load the bundled asset from the application's origin.
