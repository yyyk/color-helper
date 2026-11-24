import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { cmax, cusp, parseHex } from "@/lib/color"
import { loadSlots, newId, PALETTE_MAX, saveSlots, type Slot } from "@/lib/palette"
import { HUES, relSat, selectionFromRgb, selectionOf, type Selection } from "@/lib/pccs"
import { HarmonyList } from "./harmony-list"
import { HueWheel } from "./hue-wheel"
import { PalettePanel } from "./palette-panel"
import { Section } from "./section"
import { SelectedColor } from "./selected-color"
import { ToneChart } from "./tone-chart"
import { ToneGrid } from "./tone-grid"

const INITIAL_HUE = 15

function initialSelection() {
  const a = HUES[INITIAL_HUE].a,
    cu = cusp(a)
  return selectionOf(cu.L, cu.C, a)
}

function TonePicker() {
  const [hueIdx, setHueIdx] = useState(INITIAL_HUE)
  const [sel, setSel] = useState<Selection>(initialSelection)
  const [saved] = useState(loadSlots)
  const [slots, setSlots] = useState<Slot[]>(saved.slots)
  const [baseId, setBaseId] = useState<string | null>(saved.baseId)
  // the palette color that picks are changing; null = just browsing
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showTones, setShowTones] = useState(true)

  useEffect(() => saveSlots(slots, baseId), [slots, baseId])

  /** Show a color in the picker; with a palette color being edited, it changes that too. */
  function select(next: Selection, idx: number) {
    // the palette never holds the same color twice, so an edit can't turn into another palette color
    const clash = activeId ? slots.findIndex((s) => s.id !== activeId && s.hex === next.hex) : -1
    if (clash >= 0) {
      toast.warning(`${next.hex} is already in the palette as color ${clash + 1}.`, { id: "clash" })
      return false
    }
    setHueIdx(idx)
    setSel(next)
    if (activeId) setSlots((ss) => ss.map((x) => (x.id === activeId ? { ...x, hex: next.hex } : x)))
    return true
  }
  // Changing the hue keeps lightness and relative saturation.
  function selectHue(i: number) {
    const rel = relSat(sel.L, sel.C, sel.h)
    const a = HUES[i].a
    select(selectionOf(sel.L, rel * cmax(sel.L, a), a), i)
  }
  function selectCell(L: number, C: number) {
    select(selectionOf(L, C, C === 0 ? sel.h : HUES[hueIdx].a), hueIdx)
  }
  function pickHex(hex: string) {
    const rgb = parseHex(hex)
    if (!rgb) return false
    const next = selectionFromRgb(rgb, hueIdx)
    return select(next.sel, next.hueIdx)
  }
  /** Show a color in the picker without touching the palette. */
  function load(hex: string) {
    const next = selectionFromRgb(parseHex(hex)!, hueIdx)
    setHueIdx(next.hueIdx)
    setSel(next.sel)
  }

  const full = slots.length >= PALETTE_MAX
  const addLabel = slots.length ? "Add to palette" : "Set as base"

  /** Add hexes as new palette colors, skipping ones already there. The first color ever becomes the base. */
  function addSlots(list: string[]) {
    const have = new Set(slots.map((s) => s.hex))
    const wanted = [...new Set(list)].filter((h) => !have.has(h))
    const added = wanted.slice(0, PALETTE_MAX - slots.length).map((hex) => ({ id: newId(), hex }))
    if (added.length) {
      setSlots([...slots, ...added])
      if (!baseId || !slots.length) setBaseId(added[0].id)
    }
    return { added, skipped: wanted.length - added.length }
  }
  /** "Set as base" / "Add to palette": the selected color becomes a new palette color. Adding ends any editing. */
  function addCurrent() {
    if (full) return void toast.warning(`Palette is full (${PALETTE_MAX} colors).`)
    if (slots.some((s) => s.hex === sel.hex)) return void toast("Already in the palette.")
    const first = !slots.length
    const slot = { id: newId(), hex: sel.hex }
    setSlots([...slots, slot])
    if (first) setBaseId(slot.id)
    setActiveId(null)
    toast.success(first ? "Set as base. Harmonies now start from it." : "Added to the palette.")
  }
  /** A harmony swatch: add it to the palette and show it (adding ends any editing), or edit it if it is already there. */
  function pickHarmony(hex: string) {
    const existing = slots.find((s) => s.hex === hex)
    if (existing) {
      setActiveId(existing.id)
      return load(hex)
    }
    if (full) {
      setActiveId(null)
      load(hex)
      return void toast.warning(
        `Palette is full (${PALETTE_MAX} colors). Showing the color without adding it.`,
      )
    }
    // with no base yet, the color the harmony came from becomes the base first
    addSlots(base ? [hex] : [harmonySel.hex, hex])
    setActiveId(null)
    load(hex)
    toast.success("Added. To change its tone, click it in the palette.")
  }
  /** A harmony's Use button. */
  function useHarmony(list: string[]) {
    const { added, skipped } = addSlots(list)
    if (!added.length) {
      return void (full
        ? toast.warning(`Palette is full (${PALETTE_MAX} colors).`)
        : toast("Already in the palette."))
    }
    setActiveId(null)
    const msg = `Added ${added.length} color${added.length > 1 ? "s" : ""}.`
    if (skipped) toast.warning(`${msg} Palette is full, ${skipped} not added.`)
    else toast.success(msg)
  }
  function editSlot(id: string) {
    if (activeId === id) return setActiveId(null)
    setActiveId(id)
    load(slots.find((s) => s.id === id)!.hex)
  }
  function removeSlot(id: string) {
    const rest = slots.filter((s) => s.id !== id)
    setSlots(rest)
    if (activeId === id) setActiveId(null)
    if (baseId === id) setBaseId(rest[0]?.id ?? null)
  }
  function clearSlots() {
    setSlots([])
    setBaseId(null)
    setActiveId(null)
  }

  // Harmonies start from the base, so they hold still while another palette color is edited.
  const base = slots.find((s) => s.id === baseId)
  const harmonySel = base ? selectionFromRgb(parseHex(base.hex)!, hueIdx).sel : sel
  const active = slots.find((s) => s.id === activeId)
  const activeName = active ? `color ${slots.indexOf(active) + 1}` : null
  const inPalette = slots.some((s) => s.hex === sel.hex)

  return (
    <div className="mx-auto max-w-[1060px] px-4 pt-5 pb-12 text-[15px] leading-normal">
      <header className="mb-4.5">
        <h1 className="mb-0.5 text-[22px] font-semibold tracking-tight text-balance">
          Color Helper
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Pick a hue, then a lightness and saturation. PCCS tones are marked on the chart.
        </p>
        <p className="mt-2 max-w-[68ch] text-[13px] text-muted-foreground">
          <strong className="font-medium text-foreground">PCCS</strong> (Practical Color Co-ordinate
          System) is a color system from the Japan Color Research Institute. It groups colors into
          tones such as <i>light</i>, <i>dull</i> or <i>vivid</i>, each a mix of lightness and
          saturation. Colors that share a tone feel related even across different hues, which makes
          tones a quick way to build harmonious palettes.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] min-[900px]:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <Section title="Hue">
            <HueWheel hueIdx={hueIdx} onSelect={selectHue} />
          </Section>

          <Section
            title="Lightness and saturation"
            action={
              <Label className="cursor-pointer text-[13px] font-normal">
                <Switch checked={showTones} onCheckedChange={setShowTones} />
                Show PCCS tones
              </Label>
            }
          >
            <ToneChart
              hueIdx={hueIdx}
              sel={sel}
              showTones={showTones}
              onCell={selectCell}
              onPick={pickHex}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Tap any colored cell. Changing the hue keeps your lightness and relative saturation.
            </p>
          </Section>

          <Section title={`PCCS tones for ${HUES[hueIdx].n}`}>
            <ToneGrid hueIdx={hueIdx} selectedHex={sel.hex} onPick={pickHex} />
          </Section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Section title="Selected color">
            <SelectedColor
              sel={sel}
              addLabel={addLabel}
              inPalette={inPalette}
              paletteFull={full}
              editing={activeName}
              onHexInput={pickHex}
              onAdd={addCurrent}
              onStopEditing={() => setActiveId(null)}
            />
          </Section>

          <PalettePanel
            slots={slots}
            activeId={activeId}
            baseId={baseId}
            onEdit={editSlot}
            onBase={setBaseId}
            onRemove={removeSlot}
            onClear={clearSlots}
          />

          <Section
            title={base ? "Harmony in the same tone, from the base" : "Harmony in the same tone"}
          >
            <HarmonyList
              sel={harmonySel}
              isBase={!!base}
              kind="hue"
              onPick={pickHarmony}
              onUse={useHarmony}
            />
          </Section>

          <Section
            title={base ? "Harmony in the same hue, from the base" : "Harmony in the same hue"}
          >
            <HarmonyList
              sel={harmonySel}
              isBase={!!base}
              kind="tone"
              onPick={pickHarmony}
              onUse={useHarmony}
            />
          </Section>
        </div>
      </div>
    </div>
  )
}

export { TonePicker }
