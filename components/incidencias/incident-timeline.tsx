import type { TimelineEvent } from "@/lib/types"
import { relativeTime } from "@/lib/format"
import {
  CircleDotIcon,
  UserPlusIcon,
  MessageSquareIcon,
  ArrowUpCircleIcon,
  CheckCircle2Icon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

const ICONS = {
  created: CircleDotIcon,
  assigned: UserPlusIcon,
  comment: MessageSquareIcon,
  escalated: ArrowUpCircleIcon,
  resolved: CheckCircle2Icon,
  status: RefreshCwIcon,
  ai: SparklesIcon,
} as const

export function IncidentTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="flex flex-col">
      {events.map((event, i) => {
        const Icon = ICONS[event.type] ?? CircleDotIcon
        const isLast = i === events.length - 1
        return (
          <li key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border",
                  event.type === "ai"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : event.type === "resolved"
                      ? "border-[var(--status-resuelta)]/30 bg-[var(--status-resuelta)]/10 text-[var(--status-resuelta)]"
                      : "border-border bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              {!isLast && <span className="w-px flex-1 bg-border" />}
            </div>
            <div className={cn("flex flex-col gap-0.5 pb-6", isLast && "pb-0")}>
              <p className="text-sm text-foreground">
                <span className="font-medium">{event.actor}</span> {event.description}
              </p>
              <time className="text-xs text-muted-foreground">{relativeTime(event.date)}</time>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
