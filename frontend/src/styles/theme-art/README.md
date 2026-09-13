# Theme background artwork

Original Aurora, Solstice and Orbit artwork generated with the built-in Image Gen tool on 2026-09-12.
The design direction was inspired by the public preview of AliMalik1's
[35 Modern Heros with Gradients and Mockups](https://www.figma.com/community/file/1298287435486709856/35-modern-heros-with-gradients-and-mockups).
The user's linked Figma copy could not be read through the connector because its connected
account lacked edit access. No Figma artwork or template code is shipped.

`aurora.webp`, `solstice.webp`, and `orbit.webp` are complete 1586×992 images, encoded from the
generated PNGs at WebP quality 86 without cropping or resizing. Vite resolves their relative
URLs from `_artwork-themes.scss`. Decorative images are CSS backgrounds; they contain no UI
text, customer data, or logos, and are never included in customer PDFs.

The generation used a Seatline concept board as a visual reference. Each asset was a separate
built-in generation call using this shared prompt, with the corresponding description inserted:

> Use case: background-extraction. Create ONE standalone 1920×1200 landscape background artwork asset for the Seatline theme described below, using the supplied concept board as a style reference. [Description] Remove EVERY interface panel, all text, labels, icons, letters, app chrome, cards, frames and logos. Artwork only, edge-to-edge. Reconstruct the artwork hidden by the UI. No watermark, no border. Do not output a contact sheet or multiple alternatives. This is a production website background for a functional app with code-native frosted panels over it; provide the clean whole wallpaper.

Descriptions:

- **Aurora:** LEFT Aurora panel. Full-bleed luminous flowing silk waves, translucent pearlescent glass ribbons with gentle lavender, violet, icy blue and cyan gradients, matching the reference left background. Broad elegant curves around outer edges, calm lavender/blue open center. High-end abstract desktop wallpaper with subtle physically rendered sheen, no grain or visual clutter.
- **Solstice:** MIDDLE Solstice panel. Full-bleed cinematic sculptural terracotta dunes under a peach and rose sunset sky, pale sun toward upper right, soft layered cloud edges and warm rose-coral sandstone curves along lower and side edges. Match the reference middle background atmosphere. Smooth tranquil gradient sky across upper middle, elegant 3D-rendered landscape with tactile fine sand but not excessive noise.
- **Orbit:** RIGHT Orbit panel. Full-bleed deep ink-violet cosmic scene with a luminous pearl violet planet partially visible toward upper right, a single thin violet elliptical orbital light arc gracefully passing toward lower left, sparse tiny dim stars, rich dark indigo open middle. Match reference right background atmosphere. Cinematic polished 3D art with soft volumetric light, no busy nebula and no bright central details.

The tool returned 1586×992 despite the requested size; the delivered images were kept at their
native dimensions. Theme previews consume these same assets and palette tokens. The original
six themes reset artwork to `none`, so selecting one never inherits another theme's image.


## Scenic productivity themes

`harbor.webp`, `meadow.webp`, and `alpine.webp` are original backgrounds generated with the
built-in Image Gen tool on 2026-09-12. Each was encoded to WebP quality 86 from the complete
1586×992 generated PNG, without cropping or resizing. `_scenic-themes.scss` owns their palettes.
They use restrained neutral controls and translucent surfaces over a coast at dusk, morning
meadow and mountain lake. The user's Outlook screenshot informed the general combination of
quiet productivity controls and scenic backgrounds. No screenshot, mailbox content, Microsoft
wallpaper, Microsoft logo or app icon is part of these assets.

The concepts use the existing Seatline workspace, font and icon set. This is an original design
interpretation, not a reproduction of Outlook. Microsoft's
[brand guidance](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks)
was consulted; independent branding and new assets are design precautions, not legal clearance.

Each background was generated in a separate built-in call referencing the new three-theme
Seatline concept board, using this shared prompt plus its individual description:

> Use case: background-extraction. Create ONE standalone landscape 1920x1200 original production wallpaper using the supplied Seatline three-theme concept board as the visual reference. Artwork only, edge-to-edge. Remove all interface panels, letters, labels, logos, buttons, screens, text and frames. Reconstruct the natural environment hidden behind the UI; no text or watermark whatsoever. This is an original independent landscape for a productivity app, not a Microsoft wallpaper. Retain the selected concept's atmosphere, material realism and lighting. Keep enough restrained open space across the left and middle for an app overlay.

- **Harbor:** Match the LEFT Harbor scene: cinematic tranquil marine evening, dark blue water and turquoise tidal shallows, dusky mauve and blue clouded sky, on the right three staggered LOW HORIZONTAL copper-and-stone terraces with discreet warm linear underlighting and small windswept trees. Reed grasses and dark stone at the lower edges, distant island silhouettes. Clearly original low horizontal stepped architecture, no arches, no loops, no building from any proprietary wallpaper. Soft realistic reflections, refined modern architectural landscape photography mixed with polished 3D visualization.

- **Meadow:** Match the MIDDLE Meadow scene: rolling sculptural meadow terraces and a solitary wind-shaped broad-canopy tree on the RIGHT hillside, layers of hazy sage hills toward the horizon, pearl-gray pale morning sky with very soft sunlit cloud, luminous grass with subtle natural texture, calm diffuse light, elegant natural landscape photograph. No buildings, no path icons, no typography.

- **Alpine:** Match the RIGHT Alpine scene: pristine remote mountain lake at blue hour, layered jagged gray rock cliffs and sparse conifer trees concentrated on the RIGHT edge, distant dramatic snowy ridge, muted blue sky with one soft rose-pink cloud streak, serene cold water reflections across the broad center and foreground, realistic fine mountain detail, refined cinematic landscape photograph. No architecture, no people, no typography.

Native asset sizes: Harbor 299,006 bytes; Meadow 307,078 bytes; Alpine 214,328 bytes.
The imagery is decorative and is not included in customer PDFs. All nine earlier themes remain
available, with their original palettes and assets.


## Aurora variants

Six original variants were generated with the built-in Image Gen tool on 2026-09-13, using the
existing Aurora artwork and a new Seatline concept board as visual references. The six individual
background generation calls used the shared prompt below plus the corresponding description.
All assets retain their full native 1586×992 dimensions and were encoded as WebP quality 86,
without cropping or resizing. `_aurora-variants.scss` owns their fixed palettes; previews and
workspaces use the same local assets. The app and its previews now fill their surfaces without
an outer frame. Only the Default theme offers a Light/Dark switch.

> Use case: background-extraction. Generate ONE standalone original 1920x1200 landscape wallpaper asset for the indicated Aurora variant, using the supplied six-theme Seatline concept board for its material, palette and light. Artwork only, full bleed, edge to edge. Reconstruct imagery hidden behind UI. Remove all UI, frames, cards, text, letters, symbols, marks, logos and captions. No watermark. Aurora's signature material is luminous translucent silk and pearlescent liquid glass: broad graceful waves, soft refractions, smooth flowing folds, a calm open middle and elegant light along the curved edges. High-end abstract 3D wallpaper, no objects, planets or landscape. Do not merely hue-shift the original; make distinct flowing forms within the same design family.

- **aurora-rose.webp:** Match TOP LEFT Rose: pearlescent blush, soft rosewater pink and pale champagne flowing folded silk; broad asymmetric petal-like glass folds sweeping from lowerleft and upperright, gentle rosy middle, fine warm specular glow, no saturated red, graceful luxurious softness.

- **aurora-mint.webp:** Match TOP MIDDLE Mint: luminous mint, seafoam, pale jade and milky opal curved glass sails. Large overlapping semi-transparent sails flow diagonally toward the right with softly lit emerald rims, airy open pale mint center, smooth satin sheen.

- **aurora-ice.webp:** Match TOP RIGHT Ice: silver-white and icy glacierblue layers of sweeping glass ribbons; thin crystalline light edges around broad flowing waves, cool pale open center, sapphire reflections only at outer curves, polished frosty translucency without snow or scenery.

- **aurora-peach.webp:** Match BOTTOM LEFT Peach: warm apricot, pale honey, peach and cream translucent satin folds; tall gently curling wave rising at right and soft rolling lowerleft fold, glowing peach middle and sunlit golden edges, no landscape or sun object.

- **aurora-dusk.webp:** Match BOTTOM MIDDLE Dusk: deep midnight plum and violet background with amethyst, orchid and pink luminous glass arcs; layered broad undulating folds cross upperright and lowerleft, rich dark calm center, restrained magenta rim highlights, no stars or planets.

- **aurora-ocean.webp:** Match BOTTOM RIGHT Ocean: deep marine blue, petrol teal and turquoise glowing liquidglass waves. Broad fluid ripples sweep from lowleft to upperright, aqua light edges and transparent overlapping curves, dark tranquil marine center, no actual water landscape or marine objects.

| File | Size (bytes) |
| --- | ---: |
| `aurora-rose.webp` | 70,638 |
| `aurora-mint.webp` | 72,742 |
| `aurora-ice.webp` | 79,842 |
| `aurora-peach.webp` | 73,718 |
| `aurora-dusk.webp` | 71,914 |
| `aurora-ocean.webp` | 102,490 |

These are decorative images without text, customer data or third-party logos. They remain
excluded from customer PDFs. No previous artwork was replaced.
