import { textOnHex } from "@/lib/color"
import { NEUTRALS, TONES, toneAt, type Tone } from "@/lib/pccs"

/** A tone swatch. `compact` drops the name line (the grey scale repeats names), keeping it as a tooltip. */
function ToneButton({
  tone,
  selected,
  compact,
  onPick,
}: {
  tone: Tone
  selected: boolean
  compact?: boolean
  onPick: (hex: string) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${tone.name} (${tone.code}) ${tone.hex}`}
      title={compact ? `${tone.name} (${tone.code})` : undefined}
      onClick={() => onPick(tone.hex)}
      className="cursor-pointer overflow-hidden rounded-lg border bg-card p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-card aria-pressed:border-foreground aria-pressed:shadow-[0_0_0_1px_var(--foreground)]"
    >
      <div
        className="flex h-11 items-end px-1.5 py-1 font-mono text-[11px] font-medium motion-safe:transition-colors"
        style={{ background: tone.hex, color: textOnHex(tone.hex) }}
      >
        {tone.code}
      </div>
      {!compact && (
        <div className="px-1.5 pt-1 pb-1.25 text-[11px] leading-tight text-muted-foreground">
          {tone.name}
        </div>
      )}
    </button>
  )
}

function ToneGrid({
  hueIdx,
  selectedHex,
  onPick,
}: {
  hueIdx: number
  selectedHex: string
  onPick: (hex: string) => void
}) {
  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {TONES.map((t) => {
          const o = toneAt(hueIdx, t)
          return (
            <ToneButton key={o.code} tone={o} selected={o.hex === selectedHex} onPick={onPick} />
          )
        })}
      </div>
      <h3 className="mt-4 mb-2 text-[11px] text-muted-foreground">
        Neutrals: PCCS grey scale (same for every hue)
      </h3>
      <div className="grid grid-cols-5 gap-1.5 min-[421px]:grid-cols-9">
        {NEUTRALS.map((n) => (
          <ToneButton
            key={n.code}
            tone={n}
            compact
            selected={n.hex === selectedHex}
            onPick={onPick}
          />
        ))}
      </div>
    </>
  )
}

export { ToneGrid }
