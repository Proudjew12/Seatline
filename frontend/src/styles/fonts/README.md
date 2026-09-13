# Bundled interface fonts

Source Sans 3 is licensed under the adjacent OFL.txt. The two `seatline-hebrew-*.woff2`
files are Hebrew-only subsets of `public/fonts/DejaVuSans.ttf` and `DejaVuSans-Bold.ttf`.
Their license is preserved at `public/fonts/LICENSE.txt`; the source font names remain DejaVu Sans.
The font faces use only U+0590–05FF and U+FB1D–FB4F, keeping English on Source Sans 3.

To regenerate a subset with FontTools (an optional font-authoring tool, not an app dependency),
run from frontend and repeat for the bold source/output:

```bash
pyftsubset public/fonts/DejaVuSans.ttf \
  --output-file=src/styles/fonts/seatline-hebrew-regular.woff2 \
  --flavor=woff2 --unicodes=U+0590-05FF,U+FB1D-FB4F \
  --layout-features='*' --name-IDs='*' --name-legacy --name-languages='*'
```
