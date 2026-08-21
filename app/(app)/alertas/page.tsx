"use client"

import * as React from "react"
import Link from "next/link"
import {
  Bell,
  TriangleAlert,
  Clock3,
  UserX,
  CircleAlert,
  Search,
  ArrowRight,
  ShieldCheck,
} from "lucide-react"

import { useSigia } from "@/lib/store"
import { PageHeader } from "@/components/page-header"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type AlertType =
  | "sla_breached"
  | "sla_warning"
  | "critical"
  | "unassigned"
  | "stagnant"

type SigiaAlert = {
  id: string
  incidentId: string
  type: AlertType
  title: string
  description: string
  department: string
  severity: number
}

const ALERT_LABELS: Record<AlertType, string> = {
  sla_breached: "SLA vencido",
  sla_warning: "SLA por vencer",
  critical: "Crítica",
  unassigned: "Sin responsable",
  stagnant: "Sin actividad",
}

export default function AlertasPage() {
  const { incidents } = useSigia()

  const [query, setQuery] = React.useState("")
  const [filter, setFilter] = React.useState("todas")

  /* =========================================================
     GENERAR ALERTAS
  ========================================================= */

  const alerts = React.useMemo<SigiaAlert[]>(() => {
    const now = Date.now()
    const result: SigiaAlert[] = []

    incidents.forEach((incident) => {
      const closed = ["resuelta", "cerrada"].includes(
        incident.status
      )

      if (closed) return

      /* SLA VENCIDO */

      if (incident.slaBreached) {
        result.push({
          id: `${incident.id}-sla-breached`,
          incidentId: incident.id,
          type: "sla_breached",
          title: `SLA vencido · ${incident.id}`,
          description: incident.title,
          department: incident.department || "Sin área",
          severity: 100,
        })
      }

      /* SLA POR VENCER */

      if (!incident.slaBreached && incident.slaDueAt) {
        const due = new Date(incident.slaDueAt).getTime()

        if (!Number.isNaN(due)) {
          const hours = (due - now) / (1000 * 60 * 60)

          if (hours > 0 && hours <= 4) {
            result.push({
              id: `${incident.id}-sla-warning`,
              incidentId: incident.id,
              type: "sla_warning",
              title: `SLA por vencer · ${incident.id}`,
              description: incident.title,
              department: incident.department || "Sin área",
              severity: 80,
            })
          }
        }
      }

      /* CRÍTICA */

      if (incident.priority === "critica") {
        result.push({
          id: `${incident.id}-critical`,
          incidentId: incident.id,
          type: "critical",
          title: `Incidencia crítica · ${incident.id}`,
          description: incident.title,
          department: incident.department || "Sin área",
          severity: 90,
        })
      }

      /* SIN RESPONSABLE */

      if (!incident.responsibleName && !incident.assignee) {
        result.push({
          id: `${incident.id}-unassigned`,
          incidentId: incident.id,
          type: "unassigned",
          title: `Sin responsable · ${incident.id}`,
          description: incident.title,
          department: incident.department || "Sin área",
          severity: 60,
        })
      }

      /* SIN ACTIVIDAD 48 HORAS */

      if (incident.updatedAt) {
        const updated = new Date(incident.updatedAt).getTime()

        if (!Number.isNaN(updated)) {
          const hours = (now - updated) / (1000 * 60 * 60)

          if (hours >= 48) {
            result.push({
              id: `${incident.id}-stagnant`,
              incidentId: incident.id,
              type: "stagnant",
              title: `Sin actividad · ${incident.id}`,
              description: incident.title,
              department: incident.department || "Sin área",
              severity: 40,
            })
          }
        }
      }
    })

    return result.sort((a, b) => b.severity - a.severity)
  }, [incidents])

  /* =========================================================
     KPIs
  ========================================================= */

  const breached = alerts.filter(
    (a) => a.type === "sla_breached"
  ).length

  const warning = alerts.filter(
    (a) => a.type === "sla_warning"
  ).length

  const critical = alerts.filter(
    (a) => a.type === "critical"
  ).length

  const unassigned = alerts.filter(
    (a) => a.type === "unassigned"
  ).length

  const stagnant = alerts.filter(
    (a) => a.type === "stagnant"
  ).length

  /* =========================================================
     FILTROS
  ========================================================= */

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase()

    return alerts.filter((alert) => {
      if (filter !== "todas" && alert.type !== filter) {
        return false
      }

      if (!term) return true

      return (
        alert.incidentId.toLowerCase().includes(term) ||
        alert.title.toLowerCase().includes(term) ||
        alert.description.toLowerCase().includes(term) ||
        alert.department.toLowerCase().includes(term)
      )
    })
  }, [alerts, query, filter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Centro de Alertas"
        description="Situaciones operativas que requieren atención dentro de SIGIA."
      />

      {/* =====================================================
          RESUMEN
      ===================================================== */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <AlertKpi
          title="SLA vencidas"
          value={breached}
          icon={<TriangleAlert />}
          className="text-red-500"
        />

        <AlertKpi
          title="Por vencer"
          value={warning}
          icon={<Clock3 />}
          className="text-amber-500"
        />

        <AlertKpi
          title="Críticas"
          value={critical}
          icon={<CircleAlert />}
          className="text-red-500"
        />

        <AlertKpi
          title="Sin responsable"
          value={unassigned}
          icon={<UserX />}
          className="text-orange-500"
        />

        <AlertKpi
          title="Estancadas"
          value={stagnant}
          icon={<Clock3 />}
          className="text-muted-foreground"
        />
      </div>

      {/* =====================================================
          FILTROS
      ===================================================== */}

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por incidencia, descripción o departamento..."
              className="pl-9"
            />
          </div>

          <Select
            value={filter}
            onValueChange={(value) =>
              setFilter(value || "todas")
            }
          >
            <SelectTrigger className="w-full md:w-[220px]">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="todas">
                Todas las alertas
              </SelectItem>

              <SelectItem value="sla_breached">
                SLA vencido
              </SelectItem>

              <SelectItem value="sla_warning">
                SLA por vencer
              </SelectItem>

              <SelectItem value="critical">
                Críticas
              </SelectItem>

              <SelectItem value="unassigned">
                Sin responsable
              </SelectItem>

              <SelectItem value="stagnant">
                Sin actividad
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* =====================================================
          LISTA
      ===================================================== */}

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Alertas activas</CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              {filtered.length} situaciones requieren revisión
            </p>
          </div>

          {alerts.length > 0 && (
            <Badge variant="secondary">
              {alerts.length} activas
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-2">
          {filtered.map((alert) => (
            <Link
              key={alert.id}
              href={`/incidencias/${alert.incidentId}`}
              className="group flex items-center gap-4 rounded-xl border p-4 transition-all hover:border-primary/30 hover:bg-muted/30 hover:shadow-sm"
            >
              <AlertIcon type={alert.type} />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">
                    {alert.title}
                  </span>

                  <AlertBadge type={alert.type} />
                </div>

                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {alert.description}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {alert.department}
                </p>
              </div>

              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-green-500/10">
                <ShieldCheck className="size-7 text-green-500" />
              </div>

              <h3 className="font-semibold">
                Todo bajo control
              </h3>

              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                No hay alertas que coincidan con los filtros seleccionados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* =========================================================
   KPI
========================================================= */

function AlertKpi({
  title,
  value,
  icon,
  className,
}: {
  title: string
  value: number
  icon: React.ReactNode
  className?: string
}) {
  return (
    <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground">
              {title}
            </p>

            <p className="mt-2 text-3xl font-bold tracking-tight">
              {value}
            </p>
          </div>

          <div
            className={`flex size-9 items-center justify-center rounded-xl bg-muted [&>svg]:size-4 ${className || ""}`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* =========================================================
   ICONOS
========================================================= */

function AlertIcon({ type }: { type: AlertType }) {
  const base =
    "flex size-10 shrink-0 items-center justify-center rounded-xl"

  switch (type) {
    case "sla_breached":
      return (
        <div className={`${base} bg-red-500/10 text-red-500`}>
          <TriangleAlert className="size-5" />
        </div>
      )

    case "critical":
      return (
        <div className={`${base} bg-red-500/10 text-red-500`}>
          <CircleAlert className="size-5" />
        </div>
      )

    case "sla_warning":
      return (
        <div className={`${base} bg-amber-500/10 text-amber-500`}>
          <Clock3 className="size-5" />
        </div>
      )

    case "unassigned":
      return (
        <div className={`${base} bg-orange-500/10 text-orange-500`}>
          <UserX className="size-5" />
        </div>
      )

    default:
      return (
        <div className={`${base} bg-muted text-muted-foreground`}>
          <Clock3 className="size-5" />
        </div>
      )
  }
}

/* =========================================================
   BADGES
========================================================= */

function AlertBadge({ type }: { type: AlertType }) {
  return (
    <Badge
      variant="outline"
      className={
        type === "sla_breached" || type === "critical"
          ? "border-red-500/30 bg-red-500/5 text-red-500"
          : type === "sla_warning"
            ? "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400"
            : type === "unassigned"
              ? "border-orange-500/30 bg-orange-500/5 text-orange-600 dark:text-orange-400"
              : ""
      }
    >
      {ALERT_LABELS[type]}
    </Badge>
  )
}