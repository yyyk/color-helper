import { useEffect } from "react"
import { TonePicker } from "@/components/tone-picker/tone-picker"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

// Dark mode is turned off for now. Set VITE_DARK_MODE=true (e.g. in .env) to bring it back;
// index.html reads the same variable to apply it before first paint.
const DARK_MODE_ENABLED = import.meta.env.VITE_DARK_MODE === "true"

// Follow the OS color scheme, as the POC did, via shadcn's `.dark` class.
function useSystemDarkMode() {
  useEffect(() => {
    if (!DARK_MODE_ENABLED) return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => document.documentElement.classList.toggle("dark", mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])
}

function App() {
  useSystemDarkMode()
  // a short shared delay: quick to show, but not flickering on every pass of the mouse
  return (
    <TooltipProvider delay={150}>
      <TonePicker />
      {/* there's no next-themes provider, so tell the toasts the theme the app actually uses */}
      <Toaster theme={DARK_MODE_ENABLED ? "system" : "light"} />
    </TooltipProvider>
  )
}

export default App
