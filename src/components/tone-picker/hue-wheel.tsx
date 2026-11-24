import { cusp, hexOf } from "@/lib/color"
import { HUES } from "@/lib/pccs"
import { polar, sector } from "./geometry"

const CX = 180,
  CY = 180

function HueWheel({ hueIdx, onSelect }: { hueIdx: number; onSelect: (i: number) => void }) {
  return (
    <svg
      viewBox="0 0 360 360"
      role="group"
      aria-label="Hue wheel, 20 Munsell hues"
      className="mx-auto block h-auto w-full max-w-[340px] font-mono text-[10px]"
    >
      {HUES.map((h, i) => {
        const mid = -90 + i * 18,
          on = i === hueIdx
        const cu = cusp(h.a)
        const [lx, ly] = polar(CX, CY, on ? 166 : 156, mid)
        return (
          <g key={h.n}>
            <path
              role="button"
              tabIndex={0}
              aria-label={`Hue ${h.n}`}
              aria-pressed={on}
              d={sector(CX, CY, 86, on ? 150 : 138, mid - 9, mid + 9)}
              fill={hexOf(cu.L, cu.C, h.a)}
              strokeWidth={3}
              strokeLinejoin="round"
              className="cursor-pointer stroke-card outline-none focus-visible:stroke-foreground"
              onClick={() => onSelect(i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onSelect(i)
                }
              }}
            />
            <text
              x={lx.toFixed(1)}
              y={(ly + 3.5).toFixed(1)}
              textAnchor="middle"
              className={on ? "fill-foreground font-medium" : "fill-muted-foreground"}
            >
              {h.n}
            </text>
          </g>
        )
      })}
      <text
        x={CX}
        y={CY + 6}
        textAnchor="middle"
        className="fill-foreground text-[26px] font-medium"
      >
        {HUES[hueIdx].n}
      </text>
      <text x={CX} y={CY + 26} textAnchor="middle" className="fill-muted-foreground">
        selected hue
      </text>
    </svg>
  )
}

export { HueWheel }
