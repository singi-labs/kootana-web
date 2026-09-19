# OG image source

`og-card.svg` is the source for `public/og-image.png` (1200x630 social card).

Regenerate after editing the SVG:

```sh
rsvg-convert -w 1200 -h 630 assets/og/og-card.svg -o public/og-image.png
```

Requires the **Sora** font installed for text rendering (the site's display face;
OFL, from Google Fonts). The Kootana mark is inlined from
`kootana-symbol-dark-transparent.svg` (direction 2b, facing triangles).
