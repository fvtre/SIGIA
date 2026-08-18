"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Save,
  Trash2,
  CalendarDays,
  User,
  AlertTriangle,
  Target,
} from "lucide-react"
import { toast } from "sonner"

import { supabase } from "@/lib/supabase"
import { useSigia } from "@/lib/store"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type TaskStatus =
  | "pendiente"
  | "en_curso"
  | "en_espera"
  | "completada"
  | "cancelada"

type TaskPriority =
  | "baja"
  | "media"
  | "alta"
  | "critica"

type Task = {
  id: string
  project_id: string
  parent_task_id: string | null
  code: string
  title: string
  product_front: string | null
  comments: string | null
  status: TaskStatus
  priority: TaskPriority
  start_date: string | null
  due_date: string | null
  progress: number
  responsible_id: string | null
  responsible_name: string | null
  dependency_text: string | null
  blocker: string | null
  next_action: string | null
  next_action_owner_id: string | null
  next_action_owner_name: string | null
  last_update: string | null
  is_milestone: boolean
}

export default function ActividadDetallePage() {
  const params = useParams<{
    id: string
    taskId: string
  }>()

  const router = useRouter()
  const { users, currentUser } = useSigia()

  const [task, setTask] = React.useState<Task | null>(null)
  const [projectName, setProjectName] = React.useState("")
  const [otherTasks, setOtherTasks] = React.useState<
    { id: string; code: string; title: string }[]
  >([])

  const [parentTaskId, setParentTaskId] =
    React.useState("")

  const [dependencyTaskId, setDependencyTaskId] =
    React.useState("")

  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const activeUsers = users.filter(
    (user) =>
      user.status === "activo" &&
      user.role !== "usuario"
  )

  const loadData = React.useCallback(async () => {
    if (!params.id || !params.taskId) return

    setLoading(true)

    try {
      const [
        { data: taskData, error: taskError },
        { data: projectData, error: projectError },
        { data: taskList, error: taskListError },
        { data: dependencyData, error: dependencyError },
      ] = await Promise.all([
        supabase
          .from("project_tasks")
          .select("*")
          .eq("id", params.taskId)
          .eq("project_id", params.id)
          .single(),

        supabase
          .from("projects")
          .select("name")
          .eq("id", params.id)
          .single(),

        supabase
          .from("project_tasks")
          .select("id,code,title")
          .eq("project_id", params.id)
          .neq("id", params.taskId)
          .order("sort_order", { ascending: true }),

        supabase
          .from("project_task_dependencies")
          .select("depends_on_task_id")
          .eq("task_id", params.taskId)
          .maybeSingle(),
      ])

      if (taskError) throw taskError
      if (projectError) throw projectError
      if (taskListError) throw taskListError
      if (dependencyError) throw dependencyError

      setTask(taskData as Task)
      setParentTaskId(taskData?.parent_task_id || "")
      setProjectName(projectData?.name || "")
      setOtherTasks(taskList || [])
      setDependencyTaskId(
        dependencyData?.depends_on_task_id || ""
      )
    } catch (error: any) {
      console.error(error)
      toast.error(
        error?.message || "No se pudo cargar la actividad."
      )
    } finally {
      setLoading(false)
    }
  }, [params.id, params.taskId])

  React.useEffect(() => {
    loadData()

    const channel = supabase
      .channel(`sigia-project-task-${params.taskId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_tasks",
          filter: `id=eq.${params.taskId}`,
        },
        () => loadData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadData, params.taskId])

  async function saveTask(e: React.FormEvent) {
    e.preventDefault()

    if (!task) return

    if (!task.title.trim()) {
      toast.error("La actividad debe tener nombre.")
      return
    }

    if (
      task.start_date &&
      task.due_date &&
      task.due_date < task.start_date
    ) {
      toast.error(
        "La fecha compromiso no puede ser anterior a la fecha de inicio."
      )
      return
    }

    setSaving(true)

    try {
      const responsible = activeUsers.find(
        (user) => user.id === task.responsible_id
      )

      const nextActionOwner = activeUsers.find(
        (user) =>
          user.id === task.next_action_owner_id
      )

      const { error } = await supabase
        .from("project_tasks")
        .update({
          parent_task_id: parentTaskId || null,
          title: task.title.trim(),
          product_front:
            task.product_front?.trim() || null,
          comments: task.comments?.trim() || null,
          status: task.status,
          priority: task.priority,
          start_date: task.start_date || null,
          due_date: task.due_date || null,
          progress: task.progress,
          responsible_id:
            task.responsible_id || null,
          responsible_name:
            responsible?.name ||
            task.responsible_name ||
            null,
          blocker: task.blocker?.trim() || null,
          next_action:
            task.next_action?.trim() || null,
          next_action_owner_id:
            task.next_action_owner_id || null,
          next_action_owner_name:
            nextActionOwner?.name ||
            task.next_action_owner_name ||
            null,
          last_update:
            task.last_update || null,
          is_milestone: task.is_milestone,
        })
        .eq("id", task.id)

      if (error) throw error

      const { error: deleteDependencyError } =
        await supabase
          .from("project_task_dependencies")
          .delete()
          .eq("task_id", task.id)

      if (deleteDependencyError) {
        throw deleteDependencyError
      }

      if (dependencyTaskId) {
        const selectedDependency =
          otherTasks.find(
            (item) => item.id === dependencyTaskId
          )

        const { error: dependencyError } =
          await supabase
            .from("project_task_dependencies")
            .insert({
              task_id: task.id,
              depends_on_task_id:
                dependencyTaskId,
              dependency_type:
                "finish_to_start",
              lag_days: 0,
            })

        if (dependencyError) {
          throw dependencyError
        }

        await supabase
          .from("project_tasks")
          .update({
            dependency_text:
              selectedDependency
                ? `${selectedDependency.code} - ${selectedDependency.title}`
                : null,
          })
          .eq("id", task.id)
      } else {
        await supabase
          .from("project_tasks")
          .update({
            dependency_text: null,
          })
          .eq("id", task.id)
      }

      toast.success("Actividad actualizada")

      await loadData()
    } catch (error: any) {
      console.error(error)
      toast.error(
        error?.message ||
          "No se pudo actualizar la actividad."
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteTask() {
    if (!task) return

    const ok = window.confirm(
      `¿Eliminar la actividad ${task.code} - ${task.title}?`
    )

    if (!ok) return

    try {
      const { error } = await supabase
        .from("project_tasks")
        .delete()
        .eq("id", task.id)

      if (error) throw error

      toast.success("Actividad eliminada")

      router.push(`/proyectos/${params.id}`)
    } catch (error: any) {
      toast.error(
        error?.message ||
          "No se pudo eliminar la actividad."
      )
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          Cargando actividad...
        </CardContent>
      </Card>
    )
  }

  if (!task) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          Actividad no encontrada.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() =>
          router.push(`/proyectos/${params.id}`)
        }
      >
        <ArrowLeft className="mr-2 size-4" />
        Volver a {projectName || "proyecto"}
      </Button>

      <PageHeader
        title={`${task.code} · ${task.title}`}
        description="Detalle y seguimiento de la actividad."
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">
          {task.status}
        </Badge>

        <Badge variant="secondary">
          Prioridad {task.priority}
        </Badge>

        {task.is_milestone && (
          <Badge>Hito</Badge>
        )}

        {task.blocker && (
          <Badge variant="destructive">
            <AlertTriangle className="mr-1 size-3" />
            Con bloqueo
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Summary
          icon={<Target className="size-4" />}
          label="Avance"
          value={`${task.progress}%`}
        />

        <Summary
          icon={<User className="size-4" />}
          label="Responsable"
          value={
            task.responsible_name ||
            "Sin asignar"
          }
        />

        <Summary
          icon={<CalendarDays className="size-4" />}
          label="Compromiso"
          value={task.due_date || "Sin fecha"}
        />
      </div>

      <form onSubmit={saveTask}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>
                Información de la actividad
              </CardTitle>

              {currentUser?.role ===
                "administrador" && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={deleteTask}
                >
                  <Trash2 className="mr-2 size-4" />
                  Eliminar
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Actividad</Label>

              <Input
                value={task.title}
                onChange={(e) =>
                  setTask((current) =>
                    current
                      ? {
                          ...current,
                          title: e.target.value,
                        }
                      : current
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Producto / Frente</Label>

              <Input
                value={task.product_front || ""}
                onChange={(e) =>
                  setTask((current) =>
                    current
                      ? {
                          ...current,
                          product_front:
                            e.target.value,
                        }
                      : current
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Comentarios</Label>

              <Textarea
                rows={4}
                value={task.comments || ""}
                onChange={(e) =>
                  setTask((current) =>
                    current
                      ? {
                          ...current,
                          comments:
                            e.target.value,
                        }
                      : current
                  )
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Estado</Label>

                <Select
                  value={task.status}
                  onValueChange={(value) => {
                    if (!value) return

                    setTask((current) =>
                      current
                        ? {
                            ...current,
                            status:
                              value as TaskStatus,
                          }
                        : current
                    )
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="pendiente">
                      Pendiente
                    </SelectItem>

                    <SelectItem value="en_curso">
                      En curso
                    </SelectItem>

                    <SelectItem value="en_espera">
                      En espera
                    </SelectItem>

                    <SelectItem value="completada">
                      Completada
                    </SelectItem>

                    <SelectItem value="cancelada">
                      Cancelada
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridad</Label>

                <Select
                  value={task.priority}
                  onValueChange={(value) => {
                    if (!value) return

                    setTask((current) =>
                      current
                        ? {
                            ...current,
                            priority:
                              value as TaskPriority,
                          }
                        : current
                    )
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="baja">
                      Baja
                    </SelectItem>

                    <SelectItem value="media">
                      Media
                    </SelectItem>

                    <SelectItem value="alta">
                      Alta
                    </SelectItem>

                    <SelectItem value="critica">
                      Crítica
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Avance (%)</Label>

                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={task.progress}
                  onChange={(e) =>
                    setTask((current) =>
                      current
                        ? {
                            ...current,
                            progress: Math.min(
                              100,
                              Math.max(
                                0,
                                Number(
                                  e.target.value
                                )
                              )
                            ),
                          }
                        : current
                    )
                  }
                />

                <Progress
                  value={task.progress}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>

                <Input
                  type="date"
                  value={task.start_date || ""}
                  onChange={(e) =>
                    setTask((current) =>
                      current
                        ? {
                            ...current,
                            start_date:
                              e.target.value ||
                              null,
                          }
                        : current
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha compromiso</Label>

                <Input
                  type="date"
                  value={task.due_date || ""}
                  onChange={(e) =>
                    setTask((current) =>
                      current
                        ? {
                            ...current,
                            due_date:
                              e.target.value ||
                              null,
                          }
                        : current
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Responsable</Label>

              <Select
                value={task.responsible_id || ""}
                onValueChange={(value) => {
                  const user = activeUsers.find(
                    (u) => u.id === value
                  )

                  setTask((current) =>
                    current
                      ? {
                          ...current,
                          responsible_id:
                            value || null,
                          responsible_name:
                            user?.name || null,
                        }
                      : current
                  )
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>

                <SelectContent>
                  {activeUsers.map((user) => (
                    <SelectItem
                      key={user.id}
                      value={user.id}
                    >
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Actividad padre</Label>

              <Select
                value={parentTaskId}
                onValueChange={(value) =>
                  setParentTaskId(value || "")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin actividad padre" />
                </SelectTrigger>

                <SelectContent>
                  {otherTasks.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={item.id}
                    >
                      {item.code} - {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dependencia</Label>

              <Select
                value={dependencyTaskId}
                onValueChange={(value) =>
                  setDependencyTaskId(
                    value || ""
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin dependencia" />
                </SelectTrigger>

                <SelectContent>
                  {otherTasks.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={item.id}
                    >
                      {item.code} - {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bloqueo actual</Label>

              <Textarea
                rows={3}
                value={task.blocker || ""}
                onChange={(e) =>
                  setTask((current) =>
                    current
                      ? {
                          ...current,
                          blocker:
                            e.target.value,
                        }
                      : current
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Próxima acción</Label>

              <Textarea
                rows={3}
                value={task.next_action || ""}
                onChange={(e) =>
                  setTask((current) =>
                    current
                      ? {
                          ...current,
                          next_action:
                            e.target.value,
                        }
                      : current
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <Label>
                Responsable próxima acción
              </Label>

              <Select
                value={
                  task.next_action_owner_id || ""
                }
                onValueChange={(value) => {
                  const user = activeUsers.find(
                    (u) => u.id === value
                  )

                  setTask((current) =>
                    current
                      ? {
                          ...current,
                          next_action_owner_id:
                            value || null,
                          next_action_owner_name:
                            user?.name || null,
                        }
                      : current
                  )
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>

                <SelectContent>
                  {activeUsers.map((user) => (
                    <SelectItem
                      key={user.id}
                      value={user.id}
                    >
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Última actualización</Label>

              <Input
                type="date"
                value={task.last_update || ""}
                onChange={(e) =>
                  setTask((current) =>
                    current
                      ? {
                          ...current,
                          last_update:
                            e.target.value ||
                            null,
                        }
                      : current
                  )
                }
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4">
              <input
                type="checkbox"
                checked={task.is_milestone}
                onChange={(e) =>
                  setTask((current) =>
                    current
                      ? {
                          ...current,
                          is_milestone:
                            e.target.checked,
                        }
                      : current
                  )
                }
                className="size-4"
              />

              <div>
                <p className="text-sm font-medium">
                  Marcar como hito
                </p>

                <p className="text-xs text-muted-foreground">
                  Útil para entregables o fechas clave.
                </p>
              </div>
            </label>

            <div className="flex justify-end border-t pt-6">
              <Button
                type="submit"
                disabled={saving}
              >
                <Save className="mr-2 size-4" />

                {saving
                  ? "Guardando..."
                  : "Guardar cambios"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
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

      <p className="mt-1 truncate text-lg font-semibold">
        {value}
      </p>
    </div>
  )
}