import { parseHex, toHex } from "./color"

/** One palette color. The id keeps React keys and the base/editing marks stable while the hex changes. */
export type Slot = { id: string; hex: string }

export const PALETTE_MAX = 8

const STORAGE_KEY = "tonepicker.slots"
const LEGACY_KEY = "tonepicker.palette"

export const newId = () => Math.random().toString(36).slice(2, 10)

/** Normalize to #RRGGBB so swatches render and duplicate checks match the app's own hexes. */
const normHex = (x: unknown) => {
  const rgb = typeof x === "string" ? parseHex(x) : null
  return rgb ? toHex(rgb) : null
}

export function loadSlots(): { slots: Slot[]; baseId: string | null } {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")
    if (saved && Array.isArray(saved.slots)) {
      const slots: Slot[] = saved.slots
        .flatMap((s: Partial<Slot>) => {
          const hex = normHex(s?.hex)
          return hex ? [{ id: typeof s.id === "string" ? s.id : newId(), hex }] : []
        })
        .slice(0, PALETTE_MAX)
      const baseId = slots.some((s) => s.id === saved.baseId)
        ? saved.baseId
        : (slots[0]?.id ?? null)
      return { slots, baseId }
    }
    // older versions kept a plain list of hexes; the first one becomes the base
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]")
    if (Array.isArray(legacy)) {
      const hexes = [...new Set(legacy.map(normHex).filter((h): h is string => !!h))].slice(
        0,
        PALETTE_MAX,
      )
      const slots = hexes.map((hex) => ({ id: newId(), hex }))
      return { slots, baseId: slots[0]?.id ?? null }
    }
  } catch {
    // storage unavailable or corrupt; start empty
  }
  return { slots: [], baseId: null }
}

export function saveSlots(slots: Slot[], baseId: string | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ slots, baseId }))
  } catch {
    // storage unavailable; palette lives for this session only
  }
}
