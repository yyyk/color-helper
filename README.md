# color-helper

[![CI](https://github.com/yyyk/color-helper/actions/workflows/ci.yml/badge.svg)](https://github.com/yyyk/color-helper/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A color picker for building palettes with the PCCS tone system: pick a hue, then a
lightness and saturation, and get harmonies that keep the same tone across hues or
the same hue across tones.

**[Open the app](https://yyyk.github.io/color-helper/)**

## PCCS in short

PCCS (Practical Color Co-ordinate System) is a color system from the Japan Color
Research Institute. It groups colors into tones such as _light_ (`lt`), _dull_ (`d`)
or _vivid_ (`v`), each a mix of lightness and saturation. Colors that share a tone
feel related even across different hues, so a palette usually comes from two
choices: which hues go together, and which tone each color gets for its role.

## What it does

- **Hue wheel** with the 20 Munsell hues PCCS uses.
- **Lightness and saturation chart** for the current hue, drawn to the sRGB gamut,
  with the 12 PCCS tones marked. The grey column on its left gives a grey as light
  as each row.
- **PCCS tones grid**: the 12 tones of the current hue, plus the PCCS grey scale
  (W, Gy-8.5 … Gy-2.5, Bk), which is the same for every hue.
- **Selected color**: HEX, RGB, HSL, lightness, nearest hue and tone, and
  white/black text contrast with WCAG grades.
- **Harmony in the same tone**: Analogous, Complementary, Split complementary,
  Triad, Square and Compound, each color in the same tone as the base.
- **Harmony in the same hue**: Monochromatic (vivid to greyish) and Shades (lighter
  to darker).
- **Palette** of up to 8 colors, saved in the browser. One color is the **base** (★)
  that harmonies are worked out from, so they hold still while you edit the others.

## A typical workflow

Say the sky in an illustration is 10PB _bright_ and you need a green and a brown:

1. Pick 10PB `b` and choose **Set as base**.
2. Under **Triad**, click **5G** and **5YR** to add them to the palette.
3. Click the 5G color in the palette to edit it, then pick its tone in the tones
   grid: `d` or `sf` for distant mountains, `dp` or `dk` for nearby grass.
4. Do the same for 5YR: brown is orange in a dark or dull tone, such as `s`, `dp`
   or `d`.
5. Copy each hex from the palette.

While a palette color is being edited, every pick (wheel, chart, tones grid, hex
input) changes it. Click its swatch again or **Stop editing** to go back to
browsing. A color already in the palette can't be added twice.

## Development

Needs Node 20.19+ or 22.12+ (Vite 8's requirement).

```sh
npm install
npm run dev           # dev server
npm run build         # type-check and build into dist/
npm run lint          # oxlint
npm run format        # Prettier, write
npm run format:check  # Prettier, check only
```

A pre-commit hook (husky + lint-staged) runs oxlint and Prettier on staged files.
VS Code formats on save with the recommended Prettier extension.

Built with React, TypeScript, Vite, Tailwind CSS and shadcn/ui (Base UI). Colors are
computed in OKLCH and mapped to the sRGB gamut.

## Deployment

Every push to `main` builds the app and deploys it to GitHub Pages
(`.github/workflows/pages.yml`); `BASE_PATH` sets the `/<repo>/` prefix. CI
(`.github/workflows/ci.yml`) checks formatting, lint and the build on every push and
pull request.

## License

[MIT](LICENSE)
