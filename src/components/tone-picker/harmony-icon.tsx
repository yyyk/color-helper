import type { Harmony } from "@/lib/pccs"

const R = 10 // ring radius in the 28×28 viewBox
const C = 14 // center

/** Point on the ring for hue step `o` of 20, clockwise from the top (the base hue). */
function at(o: number, r = R) {
  const t = ((o * 18 - 90) * Math.PI) / 180
  return [C + r * Math.cos(t), C + r * Math.sin(t)] as const
}

/**
 * A small hue-circle diagram of a harmony, like the ones on color wheels: the base hue sits at
 * the top and the dots show where the other colors fall. Same-hue harmonies draw along one radius.
 */
function HarmonyIcon({ harmony: hm }: { harmony: Harmony }) {
  const dot = (x: number, y: number, i: number) => (
    <circle key={i} cx={x} cy={y} r={2} fill="currentColor" />
  )
  let body
  if (hm.kind === "hue") {
    const pts = [0, ...hm.offsets].map((o) => at(o))
    const spoke = ([x, y]: readonly [number, number], i: number) => (
      <line key={`l${i}`} x1={C} y1={C} x2={x} y2={y} />
    )
    let lines
    switch (hm.shape) {
      case "line":
        lines = <line x1={pts[0][0]} y1={pts[0][1]} x2={pts[1][0]} y2={pts[1][1]} />
        break
      case "polygon":
        lines = <polygon points={pts.map((p) => p.join(",")).join(" ")} fill="none" />
        break
      default: // fan, fork, spokes: lines out from the center
        lines = pts.map(spoke)
    }
    body = (
      <>
        <g stroke="currentColor" strokeWidth={1.25} strokeLinejoin="round">
          {lines}
        </g>
        {pts.map(([x, y], i) => dot(x, y, i))}
      </>
    )
  } else if (hm.shape === "dots") {
    // monochromatic: several colors on one hue, at different distances from the center
    body = [16, 20, 24].map((x, i) => dot(x, C, i))
  } else {
    // shades: one hue and saturation, only lightness changes
    const [x, y] = at(5)
    body = (
      <>
        <line x1={C} y1={C} x2={x} y2={y} stroke="currentColor" strokeWidth={1.25} />
        {dot(x, y, 0)}
      </>
    )
  }
  return (
    <svg viewBox="0 0 28 28" className="size-7 shrink-0" aria-hidden="true">
      <circle
        cx={C}
        cy={C}
        r={R}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.15}
        strokeWidth={4}
      />
      {body}
    </svg>
  )
}

export { HarmonyIcon }
