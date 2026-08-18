"use client"

import * as React from "react"
import Link from "next/link"
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  X,
  CheckSquare2,
  Square,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PriorityBadge, StatusBadge } from "@/components/status-badges"
import { useSigia } from "@/lib/store"
import { relativeTime, slaRemaining } from "@/lib/format"
import {
  PRIORITIES,
  STATUSES,
  DEPARTMENTS,
  statusLabel,
  type Priority,
  type Status,
  type Incident,
} from "@/lib/types"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 8

const KANBAN_COLUMNS: Status[] = ["nueva", "asignada", "en_progreso", "en_espera", "resuelta", "cerrada"]

export function IncidentsView() {
  const { incidents: INCIDENTS, updateIncident } = useSigia()
  const [view, setView] = React.useState<"tabla" | "kanban">("tabla")
  const [query, setQuery] = React.useState("")
  const [priority, setPriority] = React.useState<string>("todas")
  const [status, setStatus] = React.useState<string>("todos")
  const [department, setDepartment] = React.useState<string>("todos")
  const [page, setPage] = React.useState(1)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = React.useState<string>("")
  const [bulkMoving, setBulkMoving] = React.useState(false)

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase()
    return INCIDENTS.filter((i) => {
      if (term && !i.title.toLowerCase().includes(term) && !i.id.toLowerCase().includes(term) && !i.requester.toLowerCase().includes(term))
        return false
      if (priority !== "todas" && i.priority !== priority) return false
      if (status !== "todos" && i.status !== status) return false
      if (department !== "todos" && i.department !== department) return false
      return true
    })
  }, [INCIDENTS, query, priority, status, department])

  React.useEffect(() => setPage(1), [query, priority, status, department, view])

  const hasFilters = query || priority !== "todas" || status !== "todos" || department !== "todos"
  const clearFilters = () => {
    setQuery("")
    setPriority("todas")
    setStatus("todos")
    setDepartment("todos")
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const selectedCount = selectedIds.size
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id))

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAllFiltered = () => {
    setSelectedIds((current) => {
      const next = new Set(current)

      if (filtered.length > 0 && filtered.every((i) => next.has(i.id))) {
        filtered.forEach((i) => next.delete(i.id))
      } else {
        filtered.forEach((i) => next.add(i.id))
      }

      return next
    })
  }

  const moveSelected = async () => {
    if (!selectedCount || !bulkStatus) return

    const target = bulkStatus as Status
    setBulkMoving(true)

    try {
      const ids = Array.from(selectedIds)

      await Promise.all(
        ids.map((id) =>
          updateIncident(
            id,
            { status: target },
            `Estado cambiado a ${statusLabel(target)} mediante acción masiva`
          )
        )
      )

      setSelectedIds(new Set())
      setBulkStatus("")
    } finally {
      setBulkMoving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID, título o solicitante..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
            <SlidersHorizontal className="size-4" />
          </span>
          <Select
            value={priority}
            onValueChange={(value) => setPriority(value ?? "todas")}
          >
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Toda prioridad</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(value) => setStatus(value ?? "todos")}
          >
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todo estado</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={department}
            onValueChange={(value) => setDepartment(value ?? "todos")}
          >
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todo departamento</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X data-icon="inline-start" />
              Limpiar
            </Button>
          ) : null}

          <ToggleGroup
            value={[view]}
            onValueChange={(v) => {
              const next = (v as string[])[0]
              if (next === "tabla" || next === "kanban") setView(next)
            }}
            className="ml-auto"
          >
            <ToggleGroupItem value="tabla" aria-label="Vista de tabla">
              <TableIcon />
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" aria-label="Vista Kanban">
              <LayoutGrid />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "incidencia" : "incidencias"}
        </p>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleAllFiltered}
          disabled={bulkMoving || filtered.length === 0}
        >
          {allFilteredSelected ? (
            <CheckSquare2 className="mr-2 size-4" />
          ) : (
            <Square className="mr-2 size-4" />
          )}
          {allFilteredSelected ? "Deseleccionar visibles" : "Seleccionar visibles"}
        </Button>

        {selectedCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium">
              {selectedCount} seleccionada{selectedCount === 1 ? "" : "s"}
            </span>

            <Select
              value={bulkStatus}
              onValueChange={(value) => setBulkStatus(value ?? "")}
            >
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue placeholder="Mover a..." />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              onClick={moveSelected}
              disabled={!bulkStatus || bulkMoving}
            >
              {bulkMoving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {bulkMoving ? "Moviendo..." : "Aplicar"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkMoving}
            >
              Limpiar selección
            </Button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search />
              </EmptyMedia>
              <EmptyTitle>Sin resultados</EmptyTitle>
              <EmptyDescription>
                No encontramos incidencias con los filtros seleccionados. Prueba ajustar la búsqueda.
              </EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </Empty>
        </Card>
      ) : view === "tabla" ? (
        <TableView
          rows={pageRows}
          page={page}
          totalPages={totalPages}
          onPage={setPage}
          total={filtered.length}
          selectedIds={selectedIds}
          onToggleSelected={toggleSelected}
        />
      ) : (
        <KanbanView
          rows={filtered}
          selectedIds={selectedIds}
          onToggleSelected={toggleSelected}
          onMove={async (id, status) => {
            await updateIncident(id, { status }, `Estado cambiado a ${statusLabel(status)} desde Kanban`)
          }}
        />
      )}
    </div>
  )
}

function TableView({
  rows,
  page,
  totalPages,
  onPage,
  total,
  selectedIds,
  onToggleSelected,
}: {
  rows: Incident[]
  page: number
  totalPages: number
  onPage: (p: number) => void
  total: number
  selectedIds: Set<string>
  onToggleSelected: (id: string) => void
}) {
  return (
    <Card className="overflow-hidden py-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10 pl-4"></TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="hidden xl:table-cell">Solicitante</TableHead>
              <TableHead className="hidden lg:table-cell">Departamento</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden md:table-cell">Responsable</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead className="hidden pr-6 text-right lg:table-cell">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((i) => {
              const sla = slaRemaining(i.slaDueAt, i.slaBreached)
              return (
                <TableRow key={i.id} className={cn("group", selectedIds.has(i.id) && "bg-primary/5")}>
                  <TableCell className="pl-4">
                    <button
                      type="button"
                      onClick={() => onToggleSelected(i.id)}
                      className="inline-flex size-7 items-center justify-center rounded hover:bg-muted"
                      aria-label={selectedIds.has(i.id) ? "Deseleccionar incidencia" : "Seleccionar incidencia"}
                    >
                      {selectedIds.has(i.id) ? <CheckSquare2 className="size-4" /> : <Square className="size-4" />}
                    </button>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    <Link href={`/incidencias/${i.id}`} className="hover:text-primary">
                      {i.id}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <Link
                      href={`/incidencias/${i.id}`}
                      className="line-clamp-1 font-medium group-hover:text-primary"
                    >
                      {i.title}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                    {i.requester}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {i.department}
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={i.priority} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={i.status} />
                  </TableCell>
                  <TableCell className="hidden text-sm md:table-cell">
                    {i.responsibleName ?? i.assignee ?? <span className="text-muted-foreground">Sin asignar</span>}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "text-xs font-medium whitespace-nowrap",
                        sla.state === "breached" && "text-priority-critical",
                        sla.state === "warning" && "text-warning",
                        sla.state === "ok" && "text-muted-foreground",
                      )}
                    >
                      {sla.label}
                    </span>
                  </TableCell>
                  <TableCell className="hidden pr-6 text-right text-sm text-muted-foreground lg:table-cell">
                    {relativeTime(i.createdAt)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t px-6 py-3">
        <span className="text-sm text-muted-foreground">
          Página {page} de {totalPages} · {total} en total
        </span>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft data-icon="inline-start" />
            Anterior
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
            Siguiente
            <ChevronRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

function KanbanView({
  rows,
  onMove,
  selectedIds,
  onToggleSelected,
}: {
  rows: Incident[]
  onMove: (id: string, status: Status) => Promise<void>
  selectedIds: Set<string>
  onToggleSelected: (id: string) => void
}) {
  const [dragging, setDragging] = React.useState<string | null>(null)
  const [over, setOver] = React.useState<Status | null>(null)
  const [moving, setMoving] = React.useState(false)

  const drop = async (e: React.DragEvent, col: Status) => {
    e.preventDefault()

    const id =
      e.dataTransfer.getData("text/sigia-incident") || dragging

    setOver(null)
    setDragging(null)

    if (!id) return

    const item = rows.find((x) => x.id === id)

    if (!item || item.status === col) return

    setMoving(true)

    try {
      await onMove(id, col)
    } finally {
      setMoving(false)
    }
  }

  return (
    <div className="min-w-0 w-full">
      <div className="w-full overflow-x-auto overflow-y-hidden pb-3">
        <div className="flex min-w-max gap-3">
          {KANBAN_COLUMNS.map((col) => {
            const items = rows.filter((i) => i.status === col)

            return (
              <div
                key={col}
                className="flex w-72 shrink-0 flex-col gap-2.5"
                onDragOver={(e) => {
                  e.preventDefault()
                  setOver(col)
                }}
                onDragLeave={() =>
                  setOver((x) => (x === col ? null : x))
                }
                onDrop={(e) => drop(e, col)}
              >
                {/* Encabezado fijo */}
                <div className="flex shrink-0 items-center justify-between px-1">
                  <StatusBadge status={col} />

                  <span className="rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
                    {items.length}
                  </span>
                </div>

                {/* Scroll vertical por columna */}
                <div
                  className={cn(
                    "flex max-h-[calc(100vh-330px)] min-h-24 flex-col gap-2.5 overflow-y-auto rounded-lg pr-1 transition-colors",
                    over === col &&
                      "bg-primary/5 ring-2 ring-primary/30"
                  )}
                >
                  {items.map((i) => {
                    const sla = slaRemaining(
                      i.slaDueAt,
                      i.slaBreached
                    )

                    return (
                      <Card
                        key={i.id}
                        draggable={!moving}
                        onDragStart={(e) => {
                          setDragging(i.id)

                          e.dataTransfer.effectAllowed = "move"

                          e.dataTransfer.setData(
                            "text/sigia-incident",
                            i.id
                          )
                        }}
                        onDragEnd={() => {
                          setDragging(null)
                          setOver(null)
                        }}
                        className={cn(
                          "shrink-0 cursor-grab gap-2.5 p-3 transition-all hover:border-primary/40 hover:bg-accent/40 active:cursor-grabbing",
                          selectedIds.has(i.id) && "border-primary bg-primary/5",
                          dragging === i.id &&
                            "scale-[.98] opacity-50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              draggable={false}
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                onToggleSelected(i.id)
                              }}
                              className="inline-flex size-7 items-center justify-center rounded hover:bg-muted"
                              aria-label={selectedIds.has(i.id) ? "Deseleccionar incidencia" : "Seleccionar incidencia"}
                            >
                              {selectedIds.has(i.id) ? (
                                <CheckSquare2 className="size-4" />
                              ) : (
                                <Square className="size-4" />
                              )}
                            </button>

                          <Link
                            href={`/incidencias/${i.id}`}
                            draggable={false}
                            className="font-mono text-xs text-muted-foreground hover:text-primary"
                          >
                            {i.id}
                          </Link>
                          </div>

                          <PriorityBadge priority={i.priority} />
                        </div>

                        <Link
                          href={`/incidencias/${i.id}`}
                          draggable={false}
                          className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary"
                        >
                          {i.title}
                        </Link>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="truncate">
                            {i.responsibleName ??
                              i.assignee ??
                              "Sin asignar"}
                          </span>

                          <span
                            className={cn(
                              "whitespace-nowrap font-medium",
                              sla.state === "breached" &&
                                "text-priority-critical",
                              sla.state === "warning" &&
                                "text-warning"
                            )}
                          >
                            {sla.state === "breached"
                              ? "Vencido"
                              : sla.label.replace("Vence en ", "")}
                          </span>
                        </div>
                      </Card>
                    )
                  })}

                  {items.length === 0 ? (
                    <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                      Arrastra aquí
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}