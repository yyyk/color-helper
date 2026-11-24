import { useState } from "react"
import { clamp, cmax, cusp, hexOf, textOnHex } from "@/lib/color"
import {
  APEX_ROW,
  HUES,
  NEUTRAL_C,
  ROW_LEN,
  STEPS,
  TONES,
  WEDGE_ROWS as ROWS,
  rowLightness,
  toneAt,
  wedgeRow,
  type Selection,
} from "@/lib/pccs"
import { sector } from "./geometry"

const T = 22,
  PITCH = 30,
  WX = 74
const VIEW_W = 452,
  VIEW_H = 380

const rowY = (i: number) => T + i * PITCH + 14
const colX = (j: number) => WX + (j - 1) * PITCH
const WEDGE_RIGHT = colX(STEPS) + 28

/** A line from (x1, y1) with an open arrowhead at (x2, y2). */
function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const len = Math.hypot(x2 - x1, y2 - y1)
  const dx = (x2 - x1) / len,
    dy = (y2 - y1) / len
  const head = [
    [x2 - 5 * dx - 3.5 * dy, y2 - 5 * dy + 3.5 * dx],
    [x2, y2],
    [x2 - 5 * dx + 3.5 * dy, y2 - 5 * dy - 3.5 * dx],
  ]
  return (
    <g fill="none" strokeWidth={1} className="stroke-muted-foreground">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <polyline points={head.map((p) => p.join(",")).join(" ")} />
    </g>
  )
}

/** Lightness x saturation wedge for one hue, with optional PCCS tone markers. */
function ToneChart({
  hueIdx,
  sel,
  showTones,
  onCell,
  onPick,
}: {
  hueIdx: number
  sel: Selection
  showTones: boolean
  onCell: (L: number, C: number) => void
  onPick: (hex: string) => void
}) {
  const [activeTone, setActiveTone] = useState<string | null>(null)
  const a = HUES[hueIdx].a,
    cu = cusp(a),
    step = cu.C / STEPS
  const rowL = rowLightness(a)

  const yOf = (L: number) => rowY(wedgeRow(L, a))
  const xOf = (C: number) => clamp(colX(C / step) + 14, colX(0) + 14, colX(STEPS) + 14)

  // Where each drawn color sits, so the selection ring can snap to it. A color picked by hex
  // (tone marker, palette, harmony) comes back from 8-bit rounding a little off, and the tightly
  // packed rows of light hues turn that into a visible shift.
  const spots = new Map<string, [number, number]>()
  const cells = []
  for (let i = 0; i < ROWS; i++) {
    const L = rowL[i],
      y = rowY(i) - 14
    // The neutral column: a grey as light as this row. Rows follow the hue's lightness, so the
    // same cell is a slightly different grey on another hue; picking one keeps the current hue.
    const nhex = hexOf(L, 0, a)
    if (!spots.has(nhex)) spots.set(nhex, [45, rowY(i)])
    cells.push(
      <rect
        key={`${i}-0`}
        x={31}
        y={y}
        width={28}
        height={28}
        rx={3}
        fill={nhex}
        strokeWidth={0.5}
        className="cursor-pointer stroke-border"
        onClick={() => onCell(L, 0)}
      >
        <title>{`${nhex} (${i === 0 ? "white" : i === ROWS - 1 ? "black" : "grey"})`}</title>
      </rect>,
    )
    for (let j = 1; j <= ROW_LEN[i]; j++) {
      const C = i === APEX_ROW && j === STEPS ? cu.C : Math.min(j * step, cmax(L, a))
      const hex = hexOf(L, C, a)
      if (!spots.has(hex)) spots.set(hex, [colX(j) + 14, rowY(i)])
      cells.push(
        <rect
          key={`${i}-${j}`}
          x={colX(j)}
          y={y}
          width={28}
          height={28}
          rx={3}
          fill={hex}
          className="cursor-pointer"
          onClick={() => onCell(L, C)}
        >
          <title>{i === APEX_ROW && j === STEPS ? `${hex} (pure color)` : hex}</title>
        </rect>,
      )
    }
  }

  // Small hue ring at the tip of the wedge, turned so the current hue faces the pure color.
  const ringR = 28,
    ringCx = WEDGE_RIGHT + 14 + ringR + 3,
    ringCy = rowY(APEX_ROW)
  const ring = HUES.map((h, i) => {
    const mid = 180 + (i - hueIdx) * 18,
      on = i === hueIdx
    const c = cusp(h.a)
    return (
      <path
        key={h.n}
        d={sector(ringCx, ringCy, 15, on ? ringR + 3 : ringR, mid - 9, mid + 9)}
        fill={hexOf(c.L, c.C, h.a)}
        strokeWidth={1}
        className="stroke-card"
      />
    )
  })

  // tone markers count even when hidden: they are still exact spots for a tone picked from the tone grid
  for (const t of TONES) {
    const o = toneAt(hueIdx, t)
    if (!spots.has(o.hex)) spots.set(o.hex, [xOf(o.C), yOf(o.L)])
  }
  const [sx, sy] = spots.get(sel.hex) ?? [sel.C < NEUTRAL_C ? 45 : xOf(sel.C), yOf(sel.L)]
  const midY = rowY(APEX_ROW),
    bottom = T + ROWS * PITCH
  const satMid = (colX(1) + WEDGE_RIGHT) / 2

  // Tooltip naming the hovered or focused tone marker, e.g. "Light (lt)".
  // Drawn inside the SVG so it scales with the chart; width is estimated from the monospace glyph width.
  let tooltip = null
  const active = showTones && activeTone ? TONES.find((t) => t[0] === activeTone) : undefined
  if (active) {
    const o = toneAt(hueIdx, active)
    const label = `${o.name} (${o.code})`
    const w = label.length * 6.1 + 16,
      h = 20
    const mx = xOf(o.C),
      my = yOf(o.L)
    const tx = clamp(mx - w / 2, 2, VIEW_W - 2 - w)
    const ty = my - 18 - h >= 0 ? my - 18 - h : my + 18
    tooltip = (
      <g pointerEvents="none" aria-hidden="true">
        <rect
          x={tx.toFixed(1)}
          y={ty.toFixed(1)}
          width={w.toFixed(1)}
          height={h}
          rx={5}
          className="fill-foreground"
        />
        <text
          x={(tx + w / 2).toFixed(1)}
          y={(ty + 13.5).toFixed(1)}
          textAnchor="middle"
          className="fill-background"
        >
          {label}
        </text>
      </g>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="group"
      aria-label="Lightness by saturation chart for the selected hue"
      className="mx-auto block h-auto w-full max-w-[600px] fill-muted-foreground font-mono text-[10px]"
    >
      {/* neutral column, labelled from the white cell like the reference */}
      <rect
        x={28}
        y={T - 3}
        width={34}
        height={ROWS * PITCH + 2}
        rx={5}
        fill="none"
        className="stroke-border"
      />
      {/* <line x1={62} y1={rowY(0)} x2={70} y2={rowY(0)} strokeWidth={1} className="stroke-muted-foreground" /> */}
      {/* <text x={WX} y={rowY(0) + 3.5}>Neutral colors</text> */}
      {cells}

      {/* pure color -> hue ring */}
      <line
        x1={WEDGE_RIGHT}
        y1={midY}
        x2={ringCx - ringR - 3}
        y2={midY}
        strokeWidth={1}
        className="stroke-muted-foreground"
      />
      <g aria-hidden="true">{ring}</g>
      <text
        x={ringCx}
        y={ringCy + 3.5}
        textAnchor="middle"
        className="fill-foreground text-[9px] font-medium"
      >
        {HUES[hueIdx].n}
      </text>

      {/* lightness axis */}
      <text x={14} y={12} textAnchor="middle">
        High
      </text>
      <Arrow x1={14} y1={midY - 40} x2={14} y2={T} />
      <text
        transform={`translate(14 ${midY}) rotate(-90)`}
        y={3.5}
        textAnchor="middle"
        className="fill-foreground"
      >
        Lightness
      </text>
      <Arrow x1={14} y1={midY + 40} x2={14} y2={bottom - 4} />
      <text x={14} y={bottom + 12} textAnchor="middle">
        Low
      </text>

      {/* saturation axis */}
      <Arrow x1={satMid - 40} y1={bottom + 8} x2={colX(1)} y2={bottom + 8} />
      <text x={satMid} y={bottom + 11.5} textAnchor="middle" className="fill-foreground">
        Saturation
      </text>
      <Arrow x1={satMid + 40} y1={bottom + 8} x2={WEDGE_RIGHT} y2={bottom + 8} />
      <text x={colX(1)} y={bottom + 25}>
        Low
      </text>
      <text x={WEDGE_RIGHT} y={bottom + 25} textAnchor="end">
        High
      </text>

      {showTones &&
        TONES.map((t) => {
          const o = toneAt(hueIdx, t)
          const x = xOf(o.C).toFixed(1),
            y = yOf(o.L)
          return (
            <g
              key={o.code}
              role="button"
              tabIndex={0}
              aria-label={`${o.name} tone ${o.hex}`}
              className="cursor-pointer outline-none [&:focus-visible>circle:nth-of-type(2)]:[stroke-opacity:1] [&:focus-visible>circle:nth-of-type(2)]:[stroke-width:2]"
              onClick={() => onPick(o.hex)}
              // keep mouse clicks from focusing the marker, so its focus ring shows for keyboard use only
              onMouseDown={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onPick(o.hex)
                }
              }}
              onMouseEnter={() => setActiveTone(o.code)}
              onMouseLeave={() => setActiveTone(null)}
              onFocus={() => setActiveTone(o.code)}
              onBlur={() => setActiveTone(null)}
            >
              <circle
                cx={x}
                cy={y.toFixed(1)}
                r={11.5}
                fill={o.hex}
                strokeWidth={2}
                className="stroke-card"
              />
              <circle
                cx={x}
                cy={y.toFixed(1)}
                r={12.5}
                fill="none"
                strokeOpacity={0.35}
                strokeWidth={0.75}
                className="stroke-foreground"
              />
              <text
                x={x}
                y={(y + 3).toFixed(1)}
                textAnchor="middle"
                fill={textOnHex(o.hex)}
                className="pointer-events-none text-[9px] font-medium"
              >
                {o.code}
              </text>
            </g>
          )
        })}

      {/* selection ring */}
      <rect
        x={(sx - 17).toFixed(1)}
        y={(sy - 17).toFixed(1)}
        width={34}
        height={34}
        rx={6}
        fill="none"
        stroke="#fff"
        strokeWidth={5}
        pointerEvents="none"
      />
      <rect
        x={(sx - 17).toFixed(1)}
        y={(sy - 17).toFixed(1)}
        width={34}
        height={34}
        rx={6}
        fill="none"
        stroke="#000"
        strokeWidth={2}
        pointerEvents="none"
      />

      {tooltip}
    </svg>
  )
}

export { ToneChart }
