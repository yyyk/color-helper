import { useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { contrast, parseHex, relLum, rgb2oklch, textOn, toHex, toHsl } from "@/lib/color"
import { HUES, NEUTRAL_C, nearestHue, nearestTone, type Selection } from "@/lib/pccs"

const grade = (c: number) => (c >= 7 ? "AAA" : c >= 4.5 ? "AA" : c >= 3 ? "AA large" : "fail")
// Round contrast down, never up: 4.46 must not display as "4.5:1" next to a sub-AA grade.
const ratio = (c: number) => (Math.floor(c * 10) / 10).toFixed(1)

function SelectedColor({
  sel,
  addLabel,
  inPalette,
  paletteFull,
  editing,
  onHexInput,
  onAdd,
  onStopEditing,
}: {
  sel: Selection
  /** "Set as base" for the first palette color, "Add to palette" after that. */
  addLabel: string
  inPalette: boolean
  paletteFull: boolean
  /** Name of the palette color that picks are changing, or null when just browsing. */
  editing: string | null
  onHexInput: (hex: string) => void
  onAdd: () => void
  onStopEditing: () => void
}) {
  // While the field is being edited it shows what was typed, otherwise the selected hex.
  // The draft remembers which selection it belongs to, so picking a color elsewhere while the
  // field still has focus (tone markers don't take focus) shows the new hex instead.
  const [draft, setDraft] = useState<{ text: string; hex: string } | null>(null)
  const hex = sel.hex
  const fresh = draft && draft.hex === hex ? draft : null

  // Apply a 3-digit hex, or report an invalid one, once editing is done (Enter or leaving
  // the field). Applying it while typing would jump to e.g. #33AA66 on the way to #3A6FB0.
  function commit() {
    if (!fresh) return
    const rgb = parseHex(fresh.text)
    if (rgb) {
      if (toHex(rgb) !== hex) onHexInput(fresh.text)
    } else if (fresh.text.replace("#", "").trim()) {
      toast.error(
        `"${fresh.text.trim()}" isn't a hex color. Enter 3 or 6 digits, for example #3A6FB0.`,
      )
    }
    setDraft(null)
  }
  const rgb = parseHex(hex)!
  const hsl = toHsl(rgb),
    o = rgb2oklch(rgb),
    nt = nearestTone(sel)
  const neutral = o.C < NEUTRAL_C
  const l = relLum(rgb)
  const cw = contrast(l, 1),
    cb = contrast(l, 0)

  const vals: [string, string][] = [
    ["HEX", hex],
    ["RGB", rgb.join(", ")],
    ["HSL", `${hsl[0]}°, ${hsl[1]}%, ${hsl[2]}%`],
    ["Lightness", `${Math.round(o.L * 100)}%`],
    ["Hue", HUES[nearestHue(neutral ? sel.h : o.h)].n + (neutral ? " (neutral)" : "")],
    ["Tone", `${nt.name} (${nt.code})`],
  ]

  return (
    <>
      <div className="grid grid-cols-[88px_1fr] gap-3.5 min-[421px]:grid-cols-[112px_1fr]">
        <div
          className="flex min-h-28 items-end rounded-lg border p-2 font-mono text-[13px] font-medium motion-safe:transition-colors"
          style={{ background: hex, color: textOn(rgb) }}
        >
          {hex}
        </div>
        <dl className="m-0 grid grid-cols-[auto_1fr] content-start gap-x-3 gap-y-1 text-[13px]">
          {vals.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="m-0 font-mono tabular-nums wrap-anywhere">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            ["White", "#fff", cw],
            ["Black", "#000", cb],
          ] as const
        ).map(([name, color, c]) => (
          <Badge
            key={name}
            variant="outline"
            className="h-6 font-mono tabular-nums"
            style={{ background: hex, color }}
          >
            {name} text {ratio(c)}:1 {grade(c)}
          </Badge>
        ))}
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <Label htmlFor="hexIn" className="text-[13px] font-normal text-muted-foreground">
          Enter HEX
        </Label>
        <Input
          id="hexIn"
          type="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={7}
          placeholder="#3A6FB0"
          className="w-30 font-mono"
          value={fresh ? fresh.text : hex}
          onChange={(e) => {
            const v = e.target.value
            // a full 6-digit hex is unambiguous, so it applies as you type
            const full = /^#?[0-9a-f]{6}$/i.test(v.trim()) ? parseHex(v) : null
            setDraft({ text: v, hex: full ? toHex(full) : hex })
            if (full) onHexInput(v)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
          }}
          onBlur={commit}
        />
        <Button onClick={onAdd} disabled={paletteFull || inPalette}>
          {inPalette ? "In palette" : paletteFull ? "Palette full" : addLabel}
        </Button>
      </div>
      <div className="mt-2.5 flex min-h-7 flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {editing ? (
          <>
            <span>
              Editing <strong className="font-medium text-foreground">{editing}</strong>. Picks
              change it in the palette. To add another color, stop editing first.
            </span>
            <Button variant="outline" size="xs" onClick={onStopEditing}>
              Stop editing
            </Button>
          </>
        ) : (
          <span>Not editing a palette color. Picks only change this preview.</span>
        )}
      </div>
    </>
  )
}

export { SelectedColor }
