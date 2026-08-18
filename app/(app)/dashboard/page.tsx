"use client"
import Link from "next/link"
import { Ticket, FolderOpen, TriangleAlert, ShieldCheck, Clock, PlusCircle } from "lucide-react"
import { useSigia } from "@/lib/store"
import { PageHeader } from "@/components/page-header"
import { KpiCard } from "@/components/kpi-card"
import { Button } from "@/components/ui/button"
import { DashboardCharts } from "@/components/dashboard/dashboard-charts"
import { RecentIncidents } from "@/components/dashboard/recent-incidents"
export default function DashboardPage(){
 const {incidents}=useSigia(); const open=incidents.filter(i=>!["cerrada","resuelta"].includes(i.status)).length; const critical=incidents.filter(i=>i.priority==="critica"&&!["cerrada","resuelta"].includes(i.status)).length; const breached=incidents.filter(i=>i.slaBreached).length; const sla=Math.round((incidents.length-breached)/Math.max(1,incidents.length)*100)
 return <><PageHeader title="Dashboard" description="Resumen general de la operación de incidencias de TI." actions={<Button nativeButton={false} render={<Link href="/incidencias/nueva"/>}><PlusCircle data-icon="inline-start"/>Nueva incidencia</Button>}/><div className="grid grid-cols-2 gap-4 lg:grid-cols-5"><KpiCard label="Total incidencias" value={String(incidents.length)} icon={Ticket}/><KpiCard label="Abiertas" value={String(open)} icon={FolderOpen} accent="text-chart-2 bg-chart-2/10"/><KpiCard label="Críticas" value={String(critical)} icon={TriangleAlert} accent="text-priority-critical bg-priority-critical/10"/><KpiCard label="Cumplimiento SLA" value={`${sla}%`} icon={ShieldCheck} accent="text-success bg-success/10"/><KpiCard label="SLA vencidas" value={String(breached)} icon={Clock} accent="text-chart-3 bg-chart-3/10"/></div><DashboardCharts/><RecentIncidents/></>
}
