import { Button } from "@/components/ui/button"
import { textOnHex } from "@/lib/color"
import {
  HARMONIES,
  HUES,
  harmonyColors,
  nearestHue,
  nearestTone,
  type Harmony,
  type Selection,
} from "@/lib/pccs"
import { HarmonyIcon } from "./harmony-icon"
import { Swatch } from "./swatch"

/**
 * Harmonies of one kind: "hue" keeps the tone across hues, "tone" keeps the hue across tones.
 * They're worked out from `sel`, which is the palette's base when there is one.
 */
function HarmonyList({
  sel,
  isBase,
  kind,
  onPick,
  onUse,
}: {
  sel: Selection
  isBase: boolean
  kind: Harmony["kind"]
  onPick: (hex: string) => void
  onUse: (hexes: string[]) => void
}) {
  const baseLabel = kind === "hue" ? HUES[nearestHue(sel.h)].n : nearestTone(sel).code
  return (
    <div className="flex flex-col gap-3">
      {HARMONIES.filter((hm) => hm.kind === kind).map((hm) => {
        const cols = harmonyColors(sel, hm)
        return (
          <div
            key={hm.name}
            className="grid grid-cols-[1fr_auto] items-center gap-2.5 min-[421px]:grid-cols-[150px_1fr_auto]"
          >
            <div
              title={hm.hint}
              className="col-span-full flex items-center gap-2 text-[13px] text-muted-foreground min-[421px]:col-span-1"
            >
              <HarmonyIcon harmony={hm} />
              <span className="leading-tight text-foreground">
                {hm.name}
                <span className="sr-only">: {hm.hint}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <div
                title={isBase ? "Base" : "Selected"}
                className="flex size-[46px] items-end rounded-lg border px-1 py-0.75 font-mono text-[9px] font-medium"
                style={{ background: sel.hex, color: textOnHex(sel.hex) }}
              >
                {baseLabel}
              </div>
              {cols.map((c) => (
                <Swatch
                  key={c.idx}
                  hex={c.hex}
                  aria-label={`${c.label} ${c.hex}`}
                  title="Add to the palette and edit it, e.g. to pick its tone"
                  onClick={() => onPick(c.hex)}
                >
                  {c.label}
                </Swatch>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              title="Add these colors to the palette"
              onClick={() => onUse([sel.hex, ...cols.map((c) => c.hex)])}
            >
              Use
            </Button>
          </div>
        )
      })}
    </div>
  )
}

export { HarmonyList }
