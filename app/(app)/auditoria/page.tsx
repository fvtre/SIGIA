"use client"

import * as React from "react"
import Link from "next/link"
import {
  History,
  Search,
  ArrowRight,
  UserRound,
  Clock3,
  Activity,
  RefreshCw,
} from "lucide-react"

import { supabase } from "@/lib/supabase"
import { useSigia } from "@/lib/store"

import { PageHeader } from "@/components/page-header"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type HistoryRow = {
  id: string
  incident_id: string
  actor_id: string | null
  action: string
  old_value: Record<string, any> | null
  new_value: Record<string, any> | null
  created_at: string

  incidentCode?: string
  incidentTitle?: string
  department?: string
  actorName?: string
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function prettyField(value: string) {
  const labels: Record<string, string> = {
    status: "Estado",
    priority: "Prioridad",
    responsible_name: "Responsable",
    assigned_to: "Asignado a",
    department: "Departamento",
    module: "Módulo",
    reason: "Motivo / causa",
    strategy: "Estrategia",
    follow_up: "Seguimiento",
    system_product: "Sistema / producto",
    external_dependency: "Dependencia externa",
    external_provider: "Proveedor externo",
    sla_due_at: "Vencimiento SLA",
  }

  return labels[value] ?? value
}

function prettyValue(value: any) {
  if (value === null || value === undefined || value === "") {
    return "Sin información"
  }

  if (typeof value === "boolean") {
    return value ? "Sí" : "No"
  }

  if (typeof value === "object") {
    return JSON.stringify(value)
  }

  const labels: Record<string, string> = {
    nueva: "Nueva",
    asignada: "Asignada",
    en_progreso: "En progreso",
    en_espera: "En espera",
    resuelta: "Resuelta",
    cerrada: "Cerrada",

    critica: "Crítica",
    alta: "Alta",
    media: "Media",
    baja: "Baja",
  }

  return labels[String(value)] ?? String(value)
}

function getChanges(row: HistoryRow) {
  const before = row.old_value || {}
  const after = row.new_value || {}

  const keys = new Set([
    ...Object.keys(before),
    ...Object.keys(after),
  ])

  return [...keys]
    .filter(
      (key) =>
        JSON.stringify(before[key]) !==
        JSON.stringify(after[key])
    )
    .map((key) => ({
      field: key,
      before: before[key],
      after: after[key],
    }))
}

export default function AuditoriaPage() {
  const { currentUser } = useSigia()

  const [rows, setRows] = React.useState<HistoryRow[]>([])
  const [loading, setLoading] = React.useState(true)

  const [query, setQuery] = React.useState("")
  const [action, setAction] = React.useState("todas")
  const [selected, setSelected] =
    React.useState<HistoryRow | null>(null)

  const loadAudit = React.useCallback(async () => {
    setLoading(true)

    try {
      const { data: history, error } = await supabase
        .from("incident_history")
        .select("*")
        .order("created_at", {
          ascending: false,
        })
        .limit(500)

      if (error) throw error

      const historyRows =
        (history || []) as HistoryRow[]

      const incidentIds = [
        ...new Set(
          historyRows.map((item) => item.incident_id)
        ),
      ]

      const actorIds = [
        ...new Set(
          historyRows
            .map((item) => item.actor_id)
            .filter(Boolean)
        ),
      ] as string[]

      const [
        { data: incidents },
        { data: profiles },
      ] = await Promise.all([
        incidentIds.length
          ? supabase
              .from("incidents")
              .select(
                "id,code,title,department"
              )
              .in("id", incidentIds)
          : Promise.resolve({ data: [] }),

        actorIds.length
          ? supabase
              .from("profiles")
              .select("id,full_name")
              .in("id", actorIds)
          : Promise.resolve({ data: [] }),
      ])

      const incidentsMap = new Map(
        (incidents || []).map((item: any) => [
          item.id,
          item,
        ])
      )

      const profilesMap = new Map(
        (profiles || []).map((item: any) => [
          item.id,
          item.full_name,
        ])
      )

      setRows(
        historyRows.map((item) => {
          const incident = incidentsMap.get(
            item.incident_id
          )

          return {
            ...item,
            incidentCode:
              incident?.code || "Sin código",

            incidentTitle:
              incident?.title || "Incidencia",

            department:
              incident?.department || "",

            actorName: item.actor_id
              ? profilesMap.get(item.actor_id) ||
                "Usuario"
              : "Sistema",
          }
        })
      )
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadAudit()

    const channel = supabase
      .channel("sigia-audit-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "incident_history",
        },
        () => loadAudit()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadAudit])

  const actions = React.useMemo(
    () =>
      [...new Set(rows.map((item) => item.action))]
        .filter(Boolean)
        .sort(),
    [rows]
  )

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase()

    return rows.filter((item) => {
      if (
        action !== "todas" &&
        item.action !== action
      ) {
        return false
      }

      if (!term) return true

      return (
        item.incidentCode
          ?.toLowerCase()
          .includes(term) ||
        item.incidentTitle
          ?.toLowerCase()
          .includes(term) ||
        item.actorName
          ?.toLowerCase()
          .includes(term) ||
        item.action
          .toLowerCase()
          .includes(term) ||
        item.department
          ?.toLowerCase()
          .includes(term)
      )
    })
  }, [rows, query, action])

  const today = rows.filter((item) => {
    const date = new Date(item.created_at)
    const now = new Date()

    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    )
  }).length

  const uniqueUsers = new Set(
    rows
      .map((item) => item.actor_id)
      .filter(Boolean)
  ).size

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoría"
        description="Trazabilidad de cambios realizados sobre las incidencias de SIGIA."
        actions={
          <Button
            variant="outline"
            onClick={loadAudit}
            disabled={loading}
          >
            <RefreshCw
              className={
                loading
                  ? "mr-2 size-4 animate-spin"
                  : "mr-2 size-4"
              }
            />
            Actualizar
          </Button>
        }
      />

      {/* KPIs */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AuditKpi
          label="Eventos registrados"
          value={rows.length}
          icon={<History className="size-4" />}
        />

        <AuditKpi
          label="Cambios hoy"
          value={today}
          icon={<Clock3 className="size-4" />}
        />

        <AuditKpi
          label="Usuarios activos"
          value={uniqueUsers}
          icon={<UserRound className="size-4" />}
        />

        <AuditKpi
          label="Tipos de acción"
          value={actions.length}
          icon={<Activity className="size-4" />}
        />
      </div>

      {/* FILTROS */}

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={query}
              onChange={(e) =>
                setQuery(e.target.value)
              }
              className="pl-9"
              placeholder="Buscar por IN, usuario, acción o departamento..."
            />
          </div>

          <Select
            value={action}
            onValueChange={(value) =>
              setAction(value || "todas")
            }
          >
            <SelectTrigger className="w-full md:w-[270px]">
              <SelectValue placeholder="Tipo de acción" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="todas">
                Todas las acciones
              </SelectItem>

              {actions.map((item) => (
                <SelectItem
                  key={item}
                  value={item}
                >
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* TABLA */}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>
            Registro de actividad
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Cargando auditoría...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No se encontraron registros.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Incidencia</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead className="text-right">
                      Detalle
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(item.created_at)}
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/incidencias/${item.incidentCode}`}
                          className="group"
                        >
                          <p className="font-mono text-xs font-semibold text-primary">
                            {item.incidentCode}
                          </p>

                          <p className="max-w-[260px] truncate text-xs text-muted-foreground group-hover:text-foreground">
                            {item.incidentTitle}
                          </p>
                        </Link>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                            {item.actorName
                              ?.split(" ")
                              .map((x) => x[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>

                          <span className="text-sm">
                            {item.actorName}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary">
                          {item.action}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-sm">
                        {item.department || "—"}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setSelected(item)
                          }
                        >
                          Ver cambio
                          <ArrowRight className="ml-2 size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PANEL DETALLE */}

      {selected && (
        <>
          <button
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            onClick={() => setSelected(null)}
            aria-label="Cerrar detalle"
          />

          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l bg-background shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-background px-5 py-4">
              <div>
                <p className="font-semibold">
                  Detalle de auditoría
                </p>

                <p className="text-xs text-muted-foreground">
                  {selected.incidentCode} ·{" "}
                  {formatDate(selected.created_at)}
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSelected(null)
                }
              >
                Cerrar
              </Button>
            </div>

            <div className="space-y-5 p-5">
              <div className="rounded-xl border p-4">
                <p className="text-xs text-muted-foreground">
                  Acción
                </p>

                <p className="mt-1 font-semibold">
                  {selected.action}
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  Realizado por{" "}
                  <strong className="text-foreground">
                    {selected.actorName}
                  </strong>
                </p>
              </div>

              <div className="space-y-3">
                {getChanges(selected).map(
                  (change) => (
                    <div
                      key={change.field}
                      className="rounded-xl border p-4"
                    >
                      <p className="mb-3 text-sm font-semibold">
                        {prettyField(
                          change.field
                        )}
                      </p>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Antes
                          </p>

                          <p className="break-words text-sm">
                            {prettyValue(
                              change.before
                            )}
                          </p>
                        </div>

                        <ArrowRight className="size-4 text-muted-foreground" />

                        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Después
                          </p>

                          <p className="break-words text-sm font-medium">
                            {prettyValue(
                              change.after
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {getChanges(selected).length ===
                  0 && (
                  <p className="text-sm text-muted-foreground">
                    No hay diferencias de campos disponibles para este evento.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

function AuditKpi({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {label}
        </p>

        <span className="text-muted-foreground">
          {icon}
        </span>
      </div>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>
    </div>
  )
}