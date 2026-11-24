import { useId, type ReactNode } from "react"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

/** A titled panel: a shadcn Card with a small uppercase heading and an optional control on the right. */
function Section({
  title,
  action,
  className,
  children,
}: {
  title: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <Card role="region" aria-labelledby={id} className={className}>
      <CardHeader className="items-center">
        <CardTitle
          id={id}
          role="heading"
          aria-level={2}
          className="text-xs font-semibold tracking-widest text-muted-foreground uppercase"
        >
          {title}
        </CardTitle>
        {action && <CardAction className="self-center">{action}</CardAction>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export { Section }
