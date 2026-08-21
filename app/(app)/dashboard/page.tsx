"use client"

import Link from "next/link"
import {
  Ticket,
  FolderOpen,
  TriangleAlert,
  ShieldCheck,
  Clock,
  PlusCircle,
  Gauge,
  RotateCcw,
} from "lucide-react"

import { useSigia } from "@/lib/store"
import { PageHeader } from "@/components/page-header"
import { KpiCard } from "@/components/kpi-card"
import { Button } from "@/components/ui/button"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { RecentIncidents } from "@/components/dashboard/recent-incidents"

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(in\d+|error|problema|falla|incidencia)\b/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export default function DashboardPage() {
  const { incidents } = useSigia()

  const open = incidents.filter(
    (i) => !["cerrada", "resuelta"].includes(i.status)
  ).length

  const critical = incidents.filter(
    (i) =>
      i.priority === "critica" &&
      !["cerrada", "resuelta"].includes(i.status)
  ).length

  const breached = incidents.filter((i) => i.slaBreached).length

  const sla = Math.round(
    ((incidents.length - breached) / Math.max(1, incidents.length)) * 100
  )

  const resolved = incidents.filter((i) =>
    ["resuelta", "cerrada"].includes(i.status)
  )

  const resolutionMinutes = resolved
    .map((i) => Number(i.resolutionMinutes))
    .filter((v) => Number.isFinite(v) && v > 0)

  const mttrMinutes =
    resolutionMinutes.length > 0
      ? Math.round(
          resolutionMinutes.reduce((sum, value) => sum + value, 0) /
            resolutionMinutes.length
        )
      : 0

  const mttrLabel =
    mttrMinutes >= 1440
      ? `${(mttrMinutes / 1440).toFixed(1)} d`
      : mttrMinutes >= 60
        ? `${(mttrMinutes / 60).toFixed(1)} h`
        : `${mttrMinutes} min`

  const recurrenceMap = new Map<string, number>()

  incidents.forEach((incident) => {
    const key = normalizeTitle(incident.title || "")
    if (key.length < 8) return
    recurrenceMap.set(key, (recurrenceMap.get(key) || 0) + 1)
  })

  const recurrent = [...recurrenceMap.values()].filter(
    (count) => count > 1
  ).length

  return (
    <>
      <PageHeader
        title="Dashboard ejecutivo"
        description="Visión operativa de incidencias, SLA, tiempos de resolución y recurrencia."
        actions={
          <Button
            nativeButton={false}
            render={<Link href="/incidencias/nueva" />}
          >
            <PlusCircle data-icon="inline-start" />
            Nueva incidencia
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
        <KpiCard label="Total incidencias" value={String(incidents.length)} icon={Ticket} />
        <KpiCard label="Abiertas" value={String(open)} icon={FolderOpen} accent="text-chart-2 bg-chart-2/10" />
        <KpiCard label="Críticas" value={String(critical)} icon={TriangleAlert} accent="text-priority-critical bg-priority-critical/10" />
        <KpiCard label="Cumplimiento SLA" value={`${sla}%`} icon={ShieldCheck} accent="text-success bg-success/10" />
        <KpiCard label="SLA vencidas" value={String(breached)} icon={Clock} accent="text-chart-3 bg-chart-3/10" />
        <KpiCard label="MTTR" value={mttrLabel} icon={Gauge} accent="text-primary bg-primary/10" />
        <KpiCard label="Focos recurrentes" value={String(recurrent)} icon={RotateCcw} accent="text-amber-500 bg-amber-500/10" />
      </div>

      <DashboardCharts />
      <RecentIncidents />
    </>
  )
}