import type { ComponentProps } from "react"
import { cn } from "cn"
import { textOnHex } from "@/lib/color"

/** A colored square button that labels itself in black or white, whichever reads better. */
function Swatch({ hex, className, ...props }: ComponentProps<"button"> & { hex: string }) {
  return (
    <button
      type="button"
      className={cn(
        "flex size-[46px] cursor-pointer items-end justify-start rounded-lg border px-1 py-0.75 font-mono text-[9px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-card motion-safe:transition-colors",
        className,
      )}
      style={{ background: hex, color: textOnHex(hex) }}
      {...props}
    />
  )
}

export { Swatch }
