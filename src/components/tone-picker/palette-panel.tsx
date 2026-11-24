import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react"
import { Check, Copy, Star, X } from "lucide-react"
import { cn } from "cn"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { parseHex, textOnHex } from "@/lib/color"
import { PALETTE_MAX, type Slot } from "@/lib/palette"
import { HUES, NEUTRAL_C, nearestTone, selectionFromRgb } from "@/lib/pccs"
import { Section } from "./section"

/** "10PB b" for a chromatic color, the neutral's code ("mGy") for a grey. */
function hueTone(hex: string) {
  const { hueIdx, sel } = selectionFromRgb(parseHex(hex)!, 0)
  const tone = nearestTone(sel).code
  return sel.C < NEUTRAL_C ? tone : `${HUES[hueIdx].n} ${tone}`
}

/**
 * A tooltip on one control. It stays open on click so a changed hint ("Copied", "Base…") shows
 * right away.
 */
function Tip({ content, children }: { content: ReactNode; children: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger closeOnClick={false} render={children} />
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  )
}

/**
 * The palette is the working set. One color is the base (harmonies are worked out from it) and
 * at most one is being edited: picks anywhere in the app change that one.
 */
function PalettePanel({
  slots,
  activeId,
  baseId,
  onEdit,
  onBase,
  onRemove,
  onClear,
}: {
  slots: Slot[]
  activeId: string | null
  baseId: string | null
  onEdit: (id: string) => void
  onBase: (id: string) => void
  onRemove: (id: string) => void
  onClear: () => void
}) {
  // the row whose copy button shows a check for a moment after copying
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  async function copy(id: string, hex: string) {
    try {
      await navigator.clipboard.writeText(hex)
      clearTimeout(copiedTimer.current)
      setCopiedId(id)
      copiedTimer.current = setTimeout(() => setCopiedId(null), 1200)
      toast.success(`Copied ${hex}.`)
    } catch {
      toast.error(`Copy was blocked here. The color is ${hex}.`)
    }
  }
  return (
    <Section title={`Palette (${slots.length}/${PALETTE_MAX})`}>
      {slots.length ? (
        <ItemGroup className="gap-1.5">
          {slots.map((s, i) => {
            const active = s.id === activeId,
              base = s.id === baseId
            const name = `color ${i + 1}`,
              copied = s.id === copiedId
            return (
              <Item
                key={s.id}
                role="listitem"
                variant="outline"
                size="xs"
                className={cn(
                  "flex-nowrap p-1.5",
                  active && "border-foreground shadow-[0_0_0_1px_var(--foreground)]",
                )}
              >
                <ItemMedia>
                  <Tip
                    content={
                      active
                        ? "Editing: picks change this color. Click to stop."
                        : "Edit this color"
                    }
                  >
                    <button
                      type="button"
                      aria-pressed={active}
                      aria-label={active ? `Stop editing ${name}` : `Edit ${name} ${s.hex}`}
                      onClick={() => onEdit(s.id)}
                      className="flex h-11 w-14 shrink-0 cursor-pointer items-end rounded-md border px-1 py-0.5 font-mono text-[9px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-safe:transition-colors"
                      style={{ background: s.hex, color: textOnHex(s.hex) }}
                    >
                      {active ? "editing" : ""}
                    </button>
                  </Tip>
                </ItemMedia>
                <ItemContent className="min-w-0 px-1">
                  <ItemTitle className="font-mono text-[13px] tabular-nums">
                    {s.hex}
                    {base && <Badge variant="secondary">base</Badge>}
                  </ItemTitle>
                  <ItemDescription className="font-mono">{hueTone(s.hex)}</ItemDescription>
                </ItemContent>
                <ItemActions className="gap-0.5">
                  <Tip
                    content={
                      base ? "Base: harmonies are worked out from this color" : "Make this the base"
                    }
                  >
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-pressed={base}
                      aria-label={
                        base ? `${name} is the base` : `Make ${name} the base for harmonies`
                      }
                      onClick={() => onBase(s.id)}
                    >
                      <Star className={cn(base && "fill-current")} />
                    </Button>
                  </Tip>
                  <Tip content={copied ? "Copied" : `Copy ${s.hex}`}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Copy ${s.hex}`}
                      onClick={() => copy(s.id, s.hex)}
                    >
                      {copied ? <Check /> : <Copy />}
                    </Button>
                  </Tip>
                  <Tip content="Remove">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${name}`}
                      onClick={() => onRemove(s.id)}
                    >
                      <X />
                    </Button>
                  </Tip>
                </ItemActions>
              </Item>
            )
          })}
        </ItemGroup>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          Empty. Pick a color for the main part of your design, for example the sky, and choose Set
          as base in Selected color. Harmonies are then worked out from it.
        </p>
      )}
      {slots.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onClear}>
            Clear palette
          </Button>
        </div>
      )}
    </Section>
  )
}

export { PalettePanel }
