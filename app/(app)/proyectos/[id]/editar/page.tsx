"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save, Trash2 } from "lucide-react"
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

type ProjectStatus =
  | "planificacion"
  | "en_curso"
  | "en_espera"
  | "completado"
  | "cancelado"

type ProjectPriority =
  | "baja"
  | "media"
  | "alta"
  | "critica"

type Project = {
  id: string
  code: string
  name: string
  description: string | null
  status: ProjectStatus
  priority: ProjectPriority
  start_date: string | null
  due_date: string | null
  progress: number
  owner_id: string | null
  department: string | null
}

export default function EditarProyectoPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const { users, currentUser } = useSigia()

  const [project, setProject] = React.useState<Project | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const activeUsers = users.filter(
    (user) =>
      user.status === "activo" &&
      user.role !== "usuario"
  )

  React.useEffect(() => {
    async function loadProject() {
      if (!params.id) return

      setLoading(true)

      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("id", params.id)
          .single()

        if (error) throw error

        setProject(data as Project)
      } catch (error: any) {
        console.error(error)
        toast.error(
          error?.message || "No se pudo cargar el proyecto."
        )
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [params.id])

  async function saveProject(e: React.FormEvent) {
    e.preventDefault()

    if (!project) return

    if (!project.code.trim()) {
      toast.error("El proyecto debe tener código.")
      return
    }

    if (!project.name.trim()) {
      toast.error("El proyecto debe tener nombre.")
      return
    }

    if (
      project.start_date &&
      project.due_date &&
      project.due_date < project.start_date
    ) {
      toast.error(
        "La fecha de término no puede ser anterior a la fecha de inicio."
      )
      return
    }

    setSaving(true)

    try {
      const normalizedCode = project.code
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "-")

      const { error } = await supabase
        .from("projects")
        .update({
          code: normalizedCode,
          name: project.name.trim(),
          description:
            project.description?.trim() || null,
          status: project.status,
          priority: project.priority,
          start_date: project.start_date || null,
          due_date: project.due_date || null,
          owner_id: project.owner_id || null,
          department: project.department || null,
        })
        .eq("id", project.id)

      if (error) throw error

      // Mantener project_members sincronizado con owner
      if (project.owner_id) {
        await supabase
          .from("project_members")
          .upsert(
            {
              project_id: project.id,
              user_id: project.owner_id,
              role: "owner",
            },
            {
              onConflict: "project_id,user_id",
            }
          )
      }

      toast.success("Proyecto actualizado")

      router.push(`/proyectos/${project.id}`)
    } catch (error: any) {
      console.error(error)

      if (error?.code === "23505") {
        toast.error(
          "Ya existe otro proyecto con ese código."
        )
      } else {
        toast.error(
          error?.message ||
            "No se pudo actualizar el proyecto."
        )
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteProject() {
    if (!project) return

    const ok = window.confirm(
      `¿Eliminar el proyecto ${project.code} - ${project.name}? También se eliminarán sus actividades y dependencias.`
    )

    if (!ok) return

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", project.id)

      if (error) throw error

      toast.success("Proyecto eliminado")

      router.push("/proyectos")
    } catch (error: any) {
      console.error(error)

      toast.error(
        error?.message ||
          "No se pudo eliminar el proyecto."
      )
    }
  }

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

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() =>
          router.push(`/proyectos/${project.id}`)
        }
      >
        <ArrowLeft className="mr-2 size-4" />
        Volver al proyecto
      </Button>

      <PageHeader
        title={`Editar ${project.name}`}
        description="Actualiza la información general del proyecto."
      />

      <form onSubmit={saveProject}>
        <Card className="mx-auto max-w-4xl">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>
                Información del proyecto
              </CardTitle>

              {currentUser?.role ===
                "administrador" && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={deleteProject}
                >
                  <Trash2 className="mr-2 size-4" />
                  Eliminar
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Código</Label>

                <Input
                  value={project.code}
                  onChange={(e) =>
                    setProject((current) =>
                      current
                        ? {
                            ...current,
                            code: e.target.value,
                          }
                        : current
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Nombre</Label>

                <Input
                  value={project.name}
                  onChange={(e) =>
                    setProject((current) =>
                      current
                        ? {
                            ...current,
                            name: e.target.value,
                          }
                        : current
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>

              <Textarea
                rows={4}
                value={project.description || ""}
                onChange={(e) =>
                  setProject((current) =>
                    current
                      ? {
                          ...current,
                          description:
                            e.target.value,
                        }
                      : current
                  )
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Estado</Label>

                <Select
                  value={project.status}
                  onValueChange={(value) => {
                    if (!value) return

                    setProject((current) =>
                      current
                        ? {
                            ...current,
                            status:
                              value as ProjectStatus,
                          }
                        : current
                    )
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="planificacion">
                      Planificación
                    </SelectItem>

                    <SelectItem value="en_curso">
                      En curso
                    </SelectItem>

                    <SelectItem value="en_espera">
                      En espera
                    </SelectItem>

                    <SelectItem value="completado">
                      Completado
                    </SelectItem>

                    <SelectItem value="cancelado">
                      Cancelado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prioridad</Label>

                <Select
                  value={project.priority}
                  onValueChange={(value) => {
                    if (!value) return

                    setProject((current) =>
                      current
                        ? {
                            ...current,
                            priority:
                              value as ProjectPriority,
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
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>

                <Input
                  type="date"
                  value={project.start_date || ""}
                  onChange={(e) =>
                    setProject((current) =>
                      current
                        ? {
                            ...current,
                            start_date:
                              e.target.value || null,
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
                  value={project.due_date || ""}
                  onChange={(e) =>
                    setProject((current) =>
                      current
                        ? {
                            ...current,
                            due_date:
                              e.target.value || null,
                          }
                        : current
                    )
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Departamento</Label>

                <Select
                  value={project.department || ""}
                  onValueChange={(value) =>
                    setProject((current) =>
                      current
                        ? {
                            ...current,
                            department:
                              value || null,
                          }
                        : current
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin departamento" />
                  </SelectTrigger>

                  <SelectContent>
                    {DEPARTMENTS.map((department) => (
                      <SelectItem
                        key={department}
                        value={department}
                      >
                        {department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Responsable</Label>

                <Select
                  value={project.owner_id || ""}
                  onValueChange={(value) =>
                    setProject((current) =>
                      current
                        ? {
                            ...current,
                            owner_id:
                              value || null,
                          }
                        : current
                    )
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
            </div>

            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium">
                Avance automático: {project.progress}%
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                El avance general se calcula automáticamente
                desde las actividades del proyecto.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t pt-6">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() =>
                  router.push(
                    `/proyectos/${project.id}`
                  )
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
                  : "Guardar cambios"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}