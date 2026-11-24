import { clamp, cmax, cusp, hexOf, rgb2oklch, toHex, type RGB } from "./color"

/** 20 Munsell hues, clockwise from the top; `a` is the OKLCH hue used to render each one. */
// prettier-ignore
export const HUES = (
  [
    ['5R', 5], ['10R', 25], ['5YR', 50], ['10YR', 72], ['5Y', 90],
    ['10Y', 105], ['5GY', 120], ['10GY', 135], ['5G', 150], ['10G', 165],
    ['5BG', 185], ['10BG', 205], ['5B', 225], ['10B', 245], ['5PB', 258],
    ['10PB', 270], ['5P', 295], ['10P', 315], ['5RP', 335], ['10RP', 352],
  ] as const
).map(([n, a]) => ({ n, a }))

type ToneDef = [code: string, name: string, absL: number | null, sat: number]

/** PCCS tones: absolute lightness (null = the hue's cusp) and saturation relative to the gamut edge at that lightness. */
// prettier-ignore
export const TONES: ToneDef[] = [
  ['v', 'Vivid', null, 1], ['b', 'Bright', 0.72, 0.88], ['s', 'Strong', 0.6, 0.82], ['dp', 'Deep', 0.44, 0.8],
  ['lt', 'Light', 0.82, 0.55], ['sf', 'Soft', 0.74, 0.38], ['d', 'Dull', 0.6, 0.42], ['dk', 'Dark', 0.32, 0.5],
  ['p', 'Pale', 0.9, 0.24], ['ltg', 'Light grayish', 0.8, 0.12], ['g', 'Grayish', 0.58, 0.15], ['dkg', 'Dark grayish', 0.32, 0.1],
]

export type Tone = { code: string; name: string; L: number; C: number; s: number; hex: string }

/** Luminance Y (0-1) of Munsell value V, from the ASTM D1535 polynomial. */
const munsellY = (V: number) =>
  (1.1914 * V - 0.22533 * V ** 2 + 0.23352 * V ** 3 - 0.020484 * V ** 4 + 0.00081939 * V ** 5) / 100

/**
 * PCCS grey scale. The greys sit on Munsell value steps (Gy-8.5 = value 8.5); for a grey, OKLCH
 * lightness is the cube root of luminance. W and Bk are pure white and black rather than PCCS's
 * 9.5 and 1.5, so the true ends of the scale stay one click away.
 */
export const NEUTRALS: Tone[] = (
  [
    ["W", "White", 1],
    ["Gy-8.5", "Light gray", Math.cbrt(munsellY(8.5))],
    ["Gy-7.5", "Light gray", Math.cbrt(munsellY(7.5))],
    ["Gy-6.5", "Medium gray", Math.cbrt(munsellY(6.5))],
    ["Gy-5.5", "Medium gray", Math.cbrt(munsellY(5.5))],
    ["Gy-4.5", "Medium gray", Math.cbrt(munsellY(4.5))],
    ["Gy-3.5", "Dark gray", Math.cbrt(munsellY(3.5))],
    ["Gy-2.5", "Dark gray", Math.cbrt(munsellY(2.5))],
    ["Bk", "Black", 0],
  ] as const
).map(([code, name, L]) => ({ code, name, L, C: 0, s: 0, hex: hexOf(L, 0, 0) }))

/** Below this OKLCH chroma a color reads as neutral and its hue angle is noise. */
export const NEUTRAL_C = 0.004

export function toneAt(hueIdx: number, [code, name, absL, s]: ToneDef): Tone {
  const a = HUES[hueIdx].a,
    cu = cusp(a)
  let L: number, C: number
  if (absL === null) {
    L = cu.L
    C = cu.C
  } else {
    L = clamp(absL + 0.35 * (cu.L - 0.65), 0.15, 0.96)
    C = s * cmax(L, a)
  }
  return { code, name, L, C, s, hex: hexOf(L, C, a) }
}

export function relSat(L: number, C: number, h: number) {
  const m = cmax(L, h)
  return m < 1e-4 ? 0 : clamp(C / m, 0, 1)
}

function wrapDist(a: number, b: number) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}
export function nearestHue(h: number) {
  let best = 0,
    bd = 1e9
  HUES.forEach((x, i) => {
    const d = wrapDist(x.a, h)
    if (d < bd) {
      bd = d
      best = i
    }
  })
  return best
}

export type Selection = { L: number; C: number; h: number; hex: string }

export const selectionOf = (L: number, C: number, h: number): Selection => ({
  L,
  C,
  h,
  hex: hexOf(L, C, h),
})

/**
 * Selection from an sRGB color, plus the Munsell hue index it falls on.
 * A neutral has no meaningful hue, so it stays on currentHueIdx.
 */
export function selectionFromRgb(
  rgb: RGB,
  currentHueIdx: number,
): { hueIdx: number; sel: Selection } {
  const o = rgb2oklch(rgb)
  const hueIdx = o.C < NEUTRAL_C ? currentHueIdx : nearestHue(o.h)
  return {
    hueIdx,
    sel: { L: o.L, C: o.C, h: o.C < NEUTRAL_C ? HUES[hueIdx].a : o.h, hex: toHex(rgb) },
  }
}

export function nearestTone(sel: Selection) {
  if (sel.C < NEUTRAL_C) {
    return NEUTRALS.reduce((best, n) =>
      Math.abs(n.L - sel.L) < Math.abs(best.L - sel.L) ? n : best,
    )
  }
  const nh = nearestHue(sel.h)
  const rel = relSat(sel.L, sel.C, HUES[nh].a)
  let best = toneAt(nh, TONES[0]),
    bd = 1e9
  TONES.forEach((t) => {
    const o = toneAt(nh, t)
    const d = Math.pow((sel.L - o.L) * 2, 2) + Math.pow(rel - o.s, 2)
    if (d < bd) {
      bd = d
      best = o
    }
  })
  return best
}

/*
 * Tone wedge: the lightness x saturation chart for one hue.
 * Cells per row follow the reference chart: the white and black rows hold only their neutral
 * cell, and the pure color (STEPS chroma steps) tips the middle row.
 */
export const ROW_LEN = [0, 3, 5, 7, 9, 10, 9, 7, 5, 3, 0]
export const WEDGE_ROWS = ROW_LEN.length
export const APEX_ROW = 5
export const STEPS = 10

const rowCache = new Map<number, number[]>()
/**
 * Lightness of each wedge row for hue h. Columns are equal chroma steps of the hue's pure color,
 * so each row sits at the lightness where its last cell meets the gamut edge; the wedge
 * outline is then the sRGB gamut boundary, with the pure color at the tip of the middle row.
 */
export function rowLightness(h: number) {
  const cached = rowCache.get(h)
  if (cached) return cached
  const cu = cusp(h)
  const rows = ROW_LEN.map((n, i) => {
    if (i === 0) return 1
    if (i === WEDGE_ROWS - 1) return 0
    if (i === APEX_ROW) return cu.L
    const target = (n / STEPS) * cu.C
    const above = i < APEX_ROW
    let lo = above ? cu.L : 0,
      hi = above ? 1 : cu.L
    for (let k = 0; k < 30; k++) {
      const mid = (lo + hi) / 2
      // above the cusp the room for chroma shrinks as L rises; below it, it grows
      if (cmax(mid, h) >= target === above) lo = mid
      else hi = mid
    }
    return above ? lo : hi
  })
  rowCache.set(h, rows)
  return rows
}

/** Fractional wedge row (0 = white … 10 = black) for lightness L on hue h; rows aren't evenly spaced in L. */
export function wedgeRow(L: number, h: number) {
  const rows = rowLightness(h)
  for (let i = 0; i < WEDGE_ROWS - 1; i++) {
    const l0 = rows[i],
      l1 = rows[i + 1]
    if (L >= l1) return i + (l0 === l1 ? 0 : clamp((l0 - L) / (l0 - l1), 0, 1))
  }
  return WEDGE_ROWS - 1
}

/** The color at fractional wedge row `row`, chroma k × the hue's pure color, on hue h (clipped to the gamut). */
function wedgeColor(h: number, row: number, k: number) {
  const L = rowL(h, row)
  return { L, C: Math.min(k * cusp(h).C, cmax(L, h)) }
}

/** Lightness at fractional wedge row `row` on hue h. */
function rowL(h: number, row: number) {
  const rows = rowLightness(h)
  const i = Math.min(Math.floor(row), WEDGE_ROWS - 2),
    f = row - i
  return rows[i] + (rows[i + 1] - rows[i]) * f
}

/** The color at the same wedge position as (L, C) on hue `from`, moved to hue `to`: same tone, other hue. */
export function sameTone(L: number, C: number, from: number, to: number) {
  return wedgeColor(to, wedgeRow(L, from), C / cusp(from).C)
}

/** Icon shape hint for a harmony; see HarmonyIcon. */
export type HarmonyShape = "fan" | "line" | "fork" | "polygon" | "spokes" | "ray" | "dots"

/**
 * Harmonies. `hue` ones keep the tone and move around the 20-step hue circle by `offsets`;
 * `tone` ones keep the hue and move through its wedge: `lightness` goes up and down it (Shades),
 * `saturation` goes across it, from vivid toward grey (Monochromatic).
 */
export type Harmony =
  | { kind: "hue"; name: string; hint: string; shape: HarmonyShape; offsets: number[] }
  | {
      kind: "tone"
      name: string
      hint: string
      shape: HarmonyShape
      axis: "lightness" | "saturation"
    }

// prettier-ignore
export const HARMONIES: Harmony[] = [
  { kind: 'hue', name: 'Analogous', shape: 'fan', offsets: [-2, 2], hint: 'Neighbouring hues on either side: calm and cohesive.' },
  { kind: 'hue', name: 'Complementary', shape: 'line', offsets: [10], hint: 'The hue directly opposite: maximum contrast.' },
  { kind: 'hue', name: 'Split complementary', shape: 'fork', offsets: [9, 11], hint: 'The two hues beside the complement: contrast with less tension.' },
  { kind: 'hue', name: 'Triad', shape: 'polygon', offsets: [7, 13], hint: 'Three hues spaced evenly around the circle: lively but balanced.' },
  { kind: 'hue', name: 'Square', shape: 'polygon', offsets: [5, 10, 15], hint: 'Four hues spaced evenly: rich, works best with one dominant.' },
  { kind: 'hue', name: 'Compound', shape: 'spokes', offsets: [2, 10, 12], hint: 'An analogous neighbour plus the complement of each: two contrasting pairs.' },
  { kind: 'tone', name: 'Monochromatic', shape: 'dots', axis: 'saturation', hint: 'One hue from vivid to greyish, at about the same lightness.' },
  { kind: 'tone', name: 'Shades', shape: 'ray', axis: 'lightness', hint: 'One hue at the same saturation, stepped lighter and darker.' },
]

/** Offsets of ±step, ±2·step, … around x, nearest first, keeping only those that land in [lo, hi]. */
function ladder(x: number, n: number, step: number, lo: number, hi: number) {
  const out: number[] = []
  for (let i = 1; out.length < n && i < 30; i++) {
    for (const d of [-i * step, i * step]) {
      if (x + d >= lo && x + d <= hi && out.length < n) out.push(d)
    }
  }
  return out
}

const ROW_LO = 0.7,
  ROW_HI = WEDGE_ROWS - 1.7

/**
 * The other colors of harmony `hm` for sel. Hue harmonies carry sel's tone (its spot in the
 * wedge) to the offset hues. Tone harmonies stay on sel's hue: Shades sorted light to dark,
 * Monochromatic vivid to grey.
 */
export function harmonyColors(sel: Selection, hm: Harmony) {
  const h0 = nearestHue(sel.h)
  const neutral = sel.C < NEUTRAL_C
  if (hm.kind === "hue") {
    return hm.offsets.map((o) => {
      const idx = (h0 + o + 20) % 20,
        a = HUES[idx].a
      // a neutral has no tone to carry over; keep it as the same grey
      if (neutral) return { idx, hex: hexOf(sel.L, 0, a), label: HUES[idx].n }
      const t = sameTone(sel.L, sel.C, HUES[h0].a, a)
      return { idx, hex: hexOf(t.L, t.C, a), label: HUES[idx].n }
    })
  }
  // tone harmonies use sel's exact hue angle so they read as the same color family
  const h = sel.h,
    row = wedgeRow(sel.L, h)
  const out = (L: number, C: number, i: number) => {
    const s = selectionOf(L, C, h)
    return { idx: i, hex: s.hex, label: nearestTone(s).code }
  }

  if (hm.axis === "lightness" || neutral) {
    // Shades: same column of the wedge, other rows. A grey has no saturation to vary, so
    // Monochromatic falls back to small lightness steps there.
    const k = neutral ? 0 : sel.C / cusp(h).C
    const step = hm.axis === "lightness" ? 1.6 : 0.8
    return ladder(row, 4, step, ROW_LO, ROW_HI)
      .sort((a, b) => a - b)
      .map((d, i) => {
        const c = wedgeColor(h, row + d, k)
        return out(c.L, c.C, i)
      })
  }

  // Monochromatic: across the row, in steps of saturation relative to the gamut edge (so the
  // vivid end never clips into duplicates). Greyer colors drift slightly lighter so the swatches
  // stay distinct even when the saturation change is subtle.
  const s0 = relSat(sel.L, sel.C, h)
  return ladder(s0, 4, 0.18, 0.06, 1)
    .sort((a, b) => b - a)
    .map((d, i) => {
      const L = rowL(h, clamp(row + d * 1.2, ROW_LO, ROW_HI))
      return out(L, (s0 + d) * cmax(L, h), i)
    })
}
