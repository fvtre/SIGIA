import { cn } from "@/lib/utils"
import { priorityLabel, statusLabel, type Priority, type Status } from "@/lib/types"

const priorityStyles: Record<Priority, string> = {
  critica: "bg-priority-critical/12 text-priority-critical ring-1 ring-inset ring-priority-critical/25",
  alta: "bg-priority-high/12 text-priority-high ring-1 ring-inset ring-priority-high/25",
  media: "bg-priority-medium/20 text-priority-medium-foreground ring-1 ring-inset ring-priority-medium/40 dark:text-priority-medium",
  baja: "bg-priority-low/12 text-priority-low ring-1 ring-inset ring-priority-low/25",
}

const priorityDot: Record<Priority, string> = {
  critica: "bg-priority-critical",
  alta: "bg-priority-high",
  media: "bg-priority-medium",
  baja: "bg-priority-low",
}

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        priorityStyles[priority],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", priorityDot[priority])} />
      {priorityLabel(priority)}
    </span>
  )
}

const statusStyles: Record<Status, string> = {
  nueva: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
  asignada: "bg-chart-2/12 text-chart-2 ring-1 ring-inset ring-chart-2/25",
  en_progreso: "bg-warning/15 text-warning-foreground ring-1 ring-inset ring-warning/30 dark:text-warning",
  en_espera: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
  resuelta: "bg-success/12 text-success ring-1 ring-inset ring-success/25",
  cerrada: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        statusStyles[status],
        className,
      )}
    >
      {statusLabel(status)}
    </span>
  )
}
