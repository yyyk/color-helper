import { D2R } from "@/lib/color"

export function polar(cx: number, cy: number, r: number, deg: number) {
  const a = deg * D2R
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

/** SVG path for a ring segment between radii r0..r1 and angles a0..a1 (degrees, clockwise from 3 o'clock). */
export function sector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) =>
    polar(cx, cy, r, a)
      .map((v) => v.toFixed(2))
      .join(" ")
  return `M ${p(r1, a0)} A ${r1} ${r1} 0 0 1 ${p(r1, a1)} L ${p(r0, a1)} A ${r0} ${r0} 0 0 0 ${p(r0, a0)} Z`
}
