import type { LucideIcon } from "lucide-react"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  trendPositive,
  accent = "text-primary bg-primary/10",
}: {
  label: string
  value: string
  icon: LucideIcon
  trend?: string
  trendLabel?: string
  trendPositive?: boolean
  accent?: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className={cn("flex size-9 items-center justify-center rounded-lg", accent)}>
            <Icon className="size-4.5" />
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
          {trend ? (
            <span className="flex items-center gap-1 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  trendPositive ? "text-success" : "text-priority-critical",
                )}
              >
                {trendPositive ? (
                  <ArrowUpRight className="size-3.5" />
                ) : (
                  <ArrowDownRight className="size-3.5" />
                )}
                {trend}
              </span>
              <span className="text-muted-foreground">{trendLabel}</span>
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
