"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import { toast } from "sonner"

import { supabase } from "@/lib/supabase"
import { useSigia } from "@/lib/store"
import { DEPARTMENTS } from "@/lib/types"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

export default function NuevaActividadPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const { users } = useSigia()

  const [saving, setSaving] = React.useState(false)
  const [tasks, setTasks] = React.useState<
    { id: string; code: string; title: string }[]
  >([])

  const [form, setForm] = React.useState({
    code: "",
    title: "",
    productFront: "",
    comments: "",
    status: "pendiente" as TaskStatus,
    priority: "media" as TaskPriority,
    startDate: "",
    dueDate: "",
    progress: 0,
    responsibleId: "",
    responsibleName: "",
    parentTaskId: "",
    dependencyTaskId: "",
    dependencyText: "",
    blocker: "",
    nextAction: "",
    nextActionOwnerId: "",
    nextActionOwnerName: "",
    lastUpdate: "",
    isMilestone: false,
  })

  React.useEffect(() => {
    async function loadTasks() {
      if (!params.id) return

      const { data, error } = await supabase
        .from("project_tasks")
        .select("id,code,title")
        .eq("project_id", params.id)
        .order("sort_order", { ascending: true })

      if (error) {
        console.error(error)
        return
      }

      setTasks(data || [])
    }

    loadTasks()
  }, [params.id])

  const activeUsers = users.filter(
    (user) =>
      user.status === "activo" &&
      user.role !== "usuario"
  )

  async function saveTask(e: React.FormEvent) {
    e.preventDefault()

    if (!params.id) return

    if (!form.code.trim()) {
      toast.error("Ingresa el código de la actividad.")
      return
    }

    if (!form.title.trim()) {
      toast.error("Ingresa el nombre de la actividad.")
      return
    }

    if (
      form.startDate &&
      form.dueDate &&
      form.dueDate < form.startDate
    ) {
      toast.error(
        "La fecha compromiso no puede ser anterior a la fecha de inicio."
      )
      return
    }

    setSaving(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Sesión no válida")

      const selectedResponsible = activeUsers.find(
        (u) => u.id === form.responsibleId
      )

      const selectedNextActionOwner = activeUsers.find(
        (u) => u.id === form.nextActionOwnerId
      )

      const { data: existingTasks, error: orderError } =
        await supabase
          .from("project_tasks")
          .select("sort_order")
          .eq("project_id", params.id)
          .order("sort_order", { ascending: false })
          .limit(1)

      if (orderError) throw orderError

      const nextSortOrder =
        (existingTasks?.[0]?.sort_order ?? -1) + 1

      const { data: createdTask, error } = await supabase
        .from("project_tasks")
        .insert({
          project_id: params.id,
          parent_task_id: form.parentTaskId || null,
          code: form.code.trim(),
          title: form.title.trim(),
          product_front: form.productFront.trim() || null,
          comments: form.comments.trim() || null,
          status: form.status,
          priority: form.priority,
          start_date: form.startDate || null,
          due_date: form.dueDate || null,
          progress: form.progress,
          responsible_id: form.responsibleId || null,
          responsible_name:
            selectedResponsible?.name ||
            form.responsibleName.trim() ||
            null,
          dependency_text:
            form.dependencyText.trim() || null,
          blocker: form.blocker.trim() || null,
          next_action: form.nextAction.trim() || null,
          next_action_owner_id:
            form.nextActionOwnerId || null,
          next_action_owner_name:
            selectedNextActionOwner?.name ||
            form.nextActionOwnerName.trim() ||
            null,
          last_update: form.lastUpdate || null,
          sort_order: nextSortOrder,
          is_milestone: form.isMilestone,
          created_by: user.id,
        })
        .select("id")
        .single()

      if (error) throw error

      if (
        form.dependencyTaskId &&
        createdTask?.id
      ) {
        const { error: dependencyError } = await supabase
          .from("project_task_dependencies")
          .insert({
            task_id: createdTask.id,
            depends_on_task_id: form.dependencyTaskId,
            dependency_type: "finish_to_start",
            lag_days: 0,
          })

        if (dependencyError) throw dependencyError
      }

      toast.success("Actividad creada correctamente")

      router.push(`/proyectos/${params.id}`)
    } catch (error: any) {
      console.error(error)

      if (error?.code === "23505") {
        toast.error(
          "Ya existe una actividad con ese código dentro del proyecto."
        )
      } else {
        toast.error(
          error?.message || "No se pudo crear la actividad."
        )
      }
    } finally {
      setSaving(false)
    }
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
        Volver al proyecto
      </Button>

      <PageHeader
        title="Nueva actividad"
        description="Registra una actividad, responsable, fechas, dependencia, bloqueo y avance."
      />

      <form onSubmit={saveTask}>
        <Card className="mx-auto max-w-5xl">
          <CardHeader>
            <CardTitle>Información de la actividad</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-[180px_1fr]">
              <div className="space-y-2">
                <Label>Código *</Label>

                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value,
                    }))
                  }
                  placeholder="Ej: 1.1"
                />
              </div>

              <div className="space-y-2">
                <Label>Actividad *</Label>

                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Ej: Flujo/formulario de captura automática"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Producto / Frente</Label>

              <Input
                value={form.productFront}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    productFront: e.target.value,
                  }))
                }
                placeholder="Ej: Modelo automatizado de incidencias"
              />
            </div>

            <div className="space-y-2">
              <Label>Comentarios</Label>

              <Textarea
                rows={4}
                value={form.comments}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    comments: e.target.value,
                  }))
                }
                placeholder="Contexto, alcance o detalle de la actividad."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Estado</Label>

                <Select
                  value={form.status}
                  onValueChange={(value) => {
                    if (value) {
                      setForm((f) => ({
                        ...f,
                        status: value as TaskStatus,
                      }))
                    }
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
                  value={form.priority}
                  onValueChange={(value) => {
                    if (value) {
                      setForm((f) => ({
                        ...f,
                        priority: value as TaskPriority,
                      }))
                    }
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
                  value={form.progress}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      progress: Math.min(
                        100,
                        Math.max(
                          0,
                          Number(e.target.value)
                        )
                      ),
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>

                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      startDate: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha compromiso</Label>

                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dueDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Responsable</Label>

              <Select
                value={form.responsibleId}
                onValueChange={(value) =>
                  setForm((f) => ({
                    ...f,
                    responsibleId: value ?? "",
                  }))
                }
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
                value={form.parentTaskId}
                onValueChange={(value) =>
                  setForm((f) => ({
                    ...f,
                    parentTaskId: value ?? "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin actividad padre" />
                </SelectTrigger>

                <SelectContent>
                  {tasks.map((task) => (
                    <SelectItem
                      key={task.id}
                      value={task.id}
                    >
                      {task.code} - {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Dependencia</Label>

              <Select
                value={form.dependencyTaskId}
                onValueChange={(value) => {
                  const task = tasks.find(
                    (t) => t.id === value
                  )

                  setForm((f) => ({
                    ...f,
                    dependencyTaskId: value ?? "",
                    dependencyText: task
                      ? `${task.code} - ${task.title}`
                      : "",
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin dependencia" />
                </SelectTrigger>

                <SelectContent>
                  {tasks.map((task) => (
                    <SelectItem
                      key={task.id}
                      value={task.id}
                    >
                      {task.code} - {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Bloqueo actual</Label>

              <Textarea
                rows={3}
                value={form.blocker}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    blocker: e.target.value,
                  }))
                }
                placeholder="Ej: Falta validación del área usuaria."
              />
            </div>

            <div className="space-y-2">
              <Label>Próxima acción</Label>

              <Textarea
                rows={3}
                value={form.nextAction}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    nextAction: e.target.value,
                  }))
                }
                placeholder="Ej: Presentar flujo para aprobación."
              />
            </div>

            <div className="space-y-2">
              <Label>Responsable próxima acción</Label>

              <Select
                value={form.nextActionOwnerId}
                onValueChange={(value) =>
                  setForm((f) => ({
                    ...f,
                    nextActionOwnerId: value ?? "",
                  }))
                }
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
                value={form.lastUpdate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    lastUpdate: e.target.value,
                  }))
                }
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4">
              <input
                type="checkbox"
                checked={form.isMilestone}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    isMilestone: e.target.checked,
                  }))
                }
                className="size-4"
              />

              <div>
                <p className="text-sm font-medium">
                  Marcar como hito
                </p>

                <p className="text-xs text-muted-foreground">
                  Úsalo para entregables o fechas relevantes del proyecto.
                </p>
              </div>
            </label>

            <div className="flex justify-end gap-2 border-t pt-6">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() =>
                  router.push(`/proyectos/${params.id}`)
                }
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={saving}
              >
                <Save className="mr-2 size-4" />

                {saving
                  ? "Guardando..."
                  : "Crear actividad"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}