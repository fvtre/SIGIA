"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  Plus,
  User,
  Target,
  ListChecks,
  Pencil,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  GanttChartSquare,
  ShieldAlert,
} from "lucide-react"
import { toast } from "sonner"

import { supabase } from "@/lib/supabase"
import { useSigia } from "@/lib/store"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Project = {
  id: string
  code: string
  name: string
  description: string | null
  status: string
  priority: string
  start_date: string | null
  due_date: string | null
  progress: number
  department: string | null
  owner?: {
    full_name: string | null
  } | null
}

type ProjectTask = {
  id: string
  parent_task_id: string | null
  code: string
  title: string
  product_front: string | null
  comments: string | null
  status: string
  priority: string
  start_date: string | null
  due_date: string | null
  progress: number
  responsible_name: string | null
  dependency_text: string | null
  blocker: string | null
  next_action: string | null
  next_action_owner_name: string | null
  last_update: string | null
  is_milestone: boolean
  sort_order: number
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    planificacion: "Planificación",
    en_curso: "En curso",
    en_espera: "En espera",
    completado: "Completado",
    cancelado: "Cancelado",
    pendiente: "Pendiente",
    completada: "Completada",
    cancelada: "Cancelada",
  }

  return labels[value] ?? value
}

function priorityLabel(value: string) {
  const labels: Record<string, string> = {
    baja: "Baja",
    media: "Media",
    alta: "Alta",
    critica: "Crítica",
  }

  return labels[value] ?? value
}

function formatDate(value: string | null) {
  if (!value) return "—"

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`))
}

export default function ProyectoDetallePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { currentUser } = useSigia()

  const [project, setProject] = React.useState<Project | null>(null)
  const [tasks, setTasks] = React.useState<ProjectTask[]>([])
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set())
  const [loading, setLoading] = React.useState(true)

  const loadProject = React.useCallback(async () => {
    if (!params.id) return

    setLoading(true)

    try {
      const [{ data: projectData, error: projectError }, { data: taskData, error: taskError }] =
        await Promise.all([
          supabase
            .from("projects")
            .select(`
              *,
              owner:profiles!projects_owner_id_fkey(full_name)
            `)
            .eq("id", params.id)
            .single(),

          supabase
            .from("project_tasks")
            .select("*")
            .eq("project_id", params.id)
            .order("sort_order", { ascending: true })
            .order("code", { ascending: true }),
        ])

      if (projectError) throw projectError
      if (taskError) throw taskError

      setProject(projectData as Project)
      setTasks((taskData || []) as ProjectTask[])
    } catch (error: any) {
      console.error(error)
      toast.error(error?.message || "No se pudo cargar el proyecto.")
    } finally {
      setLoading(false)
    }
  }, [params.id])

  React.useEffect(() => {
    loadProject()

    const channel = supabase
      .channel(`sigia-project-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
          filter: `id=eq.${params.id}`,
        },
        () => loadProject()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_tasks",
          filter: `project_id=eq.${params.id}`,
        },
        () => loadProject()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id, loadProject])

  const toggleCollapsed = (taskId: string) => {
    setCollapsed((current) => {
      const next = new Set(current)

      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }

      return next
    })
  }

  const taskById = React.useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks]
  )

  const childrenByParent = React.useMemo(() => {
    const map = new Map<string, ProjectTask[]>()

    for (const task of tasks) {
      if (!task.parent_task_id) continue

      const children = map.get(task.parent_task_id) || []
      children.push(task)
      map.set(task.parent_task_id, children)
    }

    return map
  }, [tasks])

  const visibleTasks = React.useMemo(() => {
    const result: Array<ProjectTask & { depth: number; hasChildren: boolean }> = []
    const visited = new Set<string>()

    const ordered = [...tasks].sort((a, b) => {
      const sortDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0)
      if (sortDiff !== 0) return sortDiff
      return a.code.localeCompare(b.code, "es", { numeric: true })
    })

    const visit = (task: ProjectTask, depth: number) => {
      if (visited.has(task.id)) return
      visited.add(task.id)

      const children = (childrenByParent.get(task.id) || []).sort((a, b) => {
        const sortDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0)
        if (sortDiff !== 0) return sortDiff
        return a.code.localeCompare(b.code, "es", { numeric: true })
      })

      result.push({
        ...task,
        depth,
        hasChildren: children.length > 0,
      })

      if (!collapsed.has(task.id)) {
        children.forEach((child) => visit(child, depth + 1))
      }
    }

    // Raíces válidas: sin padre o con un padre que ya no existe.
    ordered
      .filter(
        (task) =>
          !task.parent_task_id ||
          !taskById.has(task.parent_task_id)
      )
      .forEach((task) => visit(task, 0))

    // Evita perder actividades si existiera una relación circular o datos antiguos.
    ordered
      .filter((task) => !visited.has(task.id))
      .forEach((task) => visit(task, 0))

    return result
  }, [tasks, childrenByParent, collapsed, taskById])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Cargando proyecto...
        </CardContent>
      </Card>
    )
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          Proyecto no encontrado.
        </CardContent>
      </Card>
    )
  }

  const completed = tasks.filter(
    (task) => task.status === "completada"
  ).length

  const blocked = tasks.filter(
    (task) => !!task.blocker
  ).length

  const averageTaskProgress = tasks.length
    ? Math.round(
        tasks.reduce((sum, task) => sum + task.progress, 0) /
          tasks.length
      )
    : 0

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => router.push("/proyectos")}
      >
        <ArrowLeft className="mr-2 size-4" />
        Volver a proyectos
      </Button>

      <PageHeader
        title={project.name}
        description={project.description || "Gestión y seguimiento del proyecto."}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {project.code}
        </Badge>

        <Badge variant="secondary">
          {statusLabel(project.status)}
        </Badge>

        <Badge variant="outline">
          Prioridad {priorityLabel(project.priority)}
        </Badge>

        {project.department && (
          <Badge variant="outline">
            {project.department}
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => router.push(`/proyectos/${project.id}/riesgos`)}>
            <ShieldAlert className="mr-2 size-4" />
            Riesgos
          </Button>

          <Button size="sm" variant="outline" onClick={() => router.push(`/proyectos/${project.id}/gantt`)}>
            <GanttChartSquare className="mr-2 size-4" />
            Ver Gantt
          </Button>

          {currentUser?.role !== "usuario" && (
            <Button size="sm" variant="outline" onClick={() => router.push(`/proyectos/${project.id}/editar`)}>
              <Pencil className="mr-2 size-4" />
              Editar proyecto
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Summary
          icon={<Target className="size-4" />}
          label="Avance proyecto"
          value={`${project.progress}%`}
        />

        <Summary
          icon={<ListChecks className="size-4" />}
          label="Actividades"
          value={String(tasks.length)}
        />

        <Summary
          icon={<ListChecks className="size-4" />}
          label="Completadas"
          value={String(completed)}
        />

        <Summary
          icon={<ListChecks className="size-4" />}
          label="Con bloqueo"
          value={String(blocked)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen del proyecto</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Avance general
              </span>

              <span className="font-medium">
                {project.progress}%
              </span>
            </div>

            <Progress value={project.progress} />
          </div>

          <div className="grid gap-4 text-sm md:grid-cols-3">
            <div className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Responsable:
              </span>
              <span>
                {project.owner?.full_name || "Sin asignar"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-muted-foreground" />
              <span>
                {formatDate(project.start_date)}
                {" → "}
                {formatDate(project.due_date)}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground">
                Avance promedio tareas:
              </span>{" "}
              <span className="font-medium">
                {averageTaskProgress}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Actividades</CardTitle>

              <p className="mt-1 text-sm text-muted-foreground">
                Control de actividades, responsables, fechas, bloqueos y avance.
              </p>
            </div>

            {currentUser?.role !== "usuario" && (
              <Button
                onClick={() =>
                  router.push(
                    `/proyectos/${project.id}/actividades/nueva`
                  )
                }
              >
                <Plus className="mr-2 size-4" />
                Nueva actividad
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {tasks.length === 0 ? (
            <div className="py-14 text-center">
              <ListChecks className="mx-auto mb-3 size-9 text-muted-foreground" />

              <p className="font-medium">
                Aún no hay actividades
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Crea la primera actividad para comenzar el seguimiento.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Actividad</TableHead>
                    <TableHead>Producto / Frente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Compromiso</TableHead>
                    <TableHead>Bloqueo</TableHead>
                    <TableHead>Próxima acción</TableHead>
                    <TableHead>Avance</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {visibleTasks.map((task) => (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer"
                      onClick={() =>
                        router.push(
                          `/proyectos/${project.id}/actividades/${task.id}`
                        )
                      }
                    >
                      <TableCell className="font-mono text-xs">
                        <div
                          className="flex items-center"
                          style={{ paddingLeft: `${task.depth * 18}px` }}
                        >
                          {task.hasChildren ? (
                            <button
                              type="button"
                              className="mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded hover:bg-muted"
                              onClick={(event) => {
                                event.stopPropagation()
                                toggleCollapsed(task.id)
                              }}
                              aria-label={
                                collapsed.has(task.id)
                                  ? "Expandir subtareas"
                                  : "Contraer subtareas"
                              }
                            >
                              {collapsed.has(task.id) ? (
                                <ChevronRight className="size-4" />
                              ) : (
                                <ChevronDown className="size-4" />
                              )}
                            </button>
                          ) : task.depth > 0 ? (
                            <CornerDownRight className="mr-2 size-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <span className="mr-1 size-6 shrink-0" />
                          )}

                          <span>{task.code}</span>
                        </div>
                      </TableCell>

                      <TableCell className="min-w-[260px] font-medium">
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${task.depth * 8}px` }}
                        >
                          <span>{task.title}</span>

                          {task.hasChildren && (
                            <Badge variant="secondary" className="text-[10px]">
                              {childrenByParent.get(task.id)?.length || 0} subt.
                            </Badge>
                          )}

                          {task.is_milestone && (
                            <Badge variant="outline" className="text-[10px]">
                              Hito
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {task.product_front || "—"}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">
                          {statusLabel(task.status)}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {task.responsible_name || "Sin asignar"}
                      </TableCell>

                      <TableCell>
                        {formatDate(task.start_date)}
                      </TableCell>

                      <TableCell>
                        {formatDate(task.due_date)}
                      </TableCell>

                      <TableCell className="max-w-[220px]">
                        {task.blocker ? (
                          <span className="line-clamp-2">
                            {task.blocker}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell className="max-w-[240px]">
                        {task.next_action ? (
                          <span className="line-clamp-2">
                            {task.next_action}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="min-w-[100px]">
                          <div className="mb-1 flex justify-between text-xs">
                            <span>{task.progress}%</span>
                          </div>

                          <Progress value={task.progress} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Summary({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {label}
        </p>

        <span className="text-muted-foreground">
          {icon}
        </span>
      </div>

      <p className="mt-1 text-xl font-semibold">
        {value}
      </p>
    </div>
  )
}