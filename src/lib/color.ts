/* Color math (OKLCH <-> sRGB) */

export type RGB = [number, number, number]

export const D2R = Math.PI / 180
const lin2srgb = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055)
const srgb2lin = (x: number) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4))
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))

function oklch2lin(L: number, C: number, h: number): RGB {
  const a = C * Math.cos(h * D2R),
    b = C * Math.sin(h * D2R)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3,
    m = m_ ** 3,
    s = s_ ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}
const inGamut = (v: RGB) => v.every((x) => x >= -1e-4 && x <= 1 + 1e-4)
const GAMUT_K = 0.86 // stay slightly inside sRGB so the vivid colors are not neon

const cmaxCache = new Map<string, number>()
/** Max chroma at lightness L and hue h that stays (slightly) inside sRGB. */
export function cmax(L: number, h: number) {
  const key = L.toFixed(4) + "|" + h
  const cached = cmaxCache.get(key)
  if (cached !== undefined) return cached
  let lo = 0,
    hi = 0.45
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (inGamut(oklch2lin(L, mid, h))) lo = mid
    else hi = mid
  }
  lo *= GAMUT_K
  cmaxCache.set(key, lo)
  return lo
}

const cuspCache = new Map<number, { L: number; C: number }>()
/** The most saturated point (the "pure color") for hue h. */
export function cusp(h: number) {
  const cached = cuspCache.get(h)
  if (cached) return cached
  let bestL = 0.5,
    bestC = 0
  for (let L = 0.05; L <= 0.995; L += 0.01) {
    const c = cmax(L, h)
    if (c > bestC) {
      bestC = c
      bestL = L
    }
  }
  for (let L = bestL - 0.01; L <= bestL + 0.01; L += 0.001) {
    const c = cmax(L, h)
    if (c > bestC) {
      bestC = c
      bestL = L
    }
  }
  const r = { L: bestL, C: bestC }
  cuspCache.set(h, r)
  return r
}

export function rgbOf(L: number, C: number, h: number): RGB {
  return oklch2lin(L, C, h).map((x) => Math.round(lin2srgb(clamp(x, 0, 1)) * 255)) as RGB
}
export const toHex = (rgb: RGB) =>
  "#" +
  rgb
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()
export const hexOf = (L: number, C: number, h: number) => toHex(rgbOf(L, C, h))

export function parseHex(input: string): RGB | null {
  let s = input.trim().replace(/^#/, "")
  if (/^[0-9a-f]{3}$/i.test(s))
    s = s
      .split("")
      .map((c) => c + c)
      .join("")
  if (!/^[0-9a-f]{6}$/i.test(s)) return null
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)) as RGB
}

export function rgb2oklch(rgb: RGB) {
  const [r, g, b] = rgb.map((v) => srgb2lin(v / 255))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.hypot(a, bb)
  let h = Math.atan2(bb, a) / D2R
  if (h < 0) h += 360
  return { L, C, h }
}

export function relLum(rgb: RGB) {
  const [r, g, b] = rgb.map((v) => srgb2lin(v / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(l1: number, l2: number) {
  const a = Math.max(l1, l2),
    b = Math.min(l1, l2)
  return (a + 0.05) / (b + 0.05)
}
/** Black or white, whichever reads better on rgb. */
export function textOn(rgb: RGB) {
  const l = relLum(rgb)
  return contrast(l, 1) >= contrast(l, 0) ? "#FFFFFF" : "#000000"
}
export const textOnHex = (hex: string) => textOn(parseHex(hex)!)

export function toHsl(rgb: RGB): RGB {
  const [r, g, b] = rgb.map((v) => v / 255)
  const mx = Math.max(r, g, b),
    mn = Math.min(r, g, b),
    d = mx - mn
  let h = 0
  const l = (mx + mn) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    if (mx === r) h = ((g - b) / d) % 6
    else if (mx === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)]
}
