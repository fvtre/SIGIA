"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Save, ArrowLeft } from "lucide-react"
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

export default function NuevoProyectoPage() {
  const router = useRouter()

  const { currentUser, users } = useSigia()

  const [saving, setSaving] = React.useState(false)

  const [form, setForm] = React.useState({
    code: "",
    name: "",
    description: "",
    status: "planificacion" as ProjectStatus,
    priority: "media" as ProjectPriority,
    startDate: "",
    dueDate: "",
    progress: 0,
    department: "",
    ownerId: "",
  })

  async function saveProject(e: React.FormEvent) {
    e.preventDefault()

    if (!form.code.trim()) {
      toast.error("Ingresa un código de proyecto.")
      return
    }

    if (!form.name.trim()) {
      toast.error("Ingresa el nombre del proyecto.")
      return
    }

    if (
      form.startDate &&
      form.dueDate &&
      form.dueDate < form.startDate
    ) {
      toast.error(
        "La fecha de término no puede ser anterior a la fecha de inicio."
      )
      return
    }

    setSaving(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Sesión no válida")
      }

      const code = form.code
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "-")

      const { data, error } = await supabase
        .from("projects")
        .insert({
          code,
          name: form.name.trim(),
          description: form.description.trim() || null,
          status: form.status,
          priority: form.priority,
          start_date: form.startDate || null,
          due_date: form.dueDate || null,
          progress: Number(form.progress) || 0,
          owner_id: form.ownerId || null,
          department: form.department || null,
          created_by: user.id,
        })
        .select("id")
        .single()

      if (error) throw error

      if (form.ownerId && data?.id) {
        const { error: memberError } = await supabase
          .from("project_members")
          .upsert(
            {
              project_id: data.id,
              user_id: form.ownerId,
              role: "owner",
            },
            {
              onConflict: "project_id,user_id",
            }
          )

        if (memberError) {
          console.warn(
            "Proyecto creado, pero no se pudo registrar owner en project_members:",
            memberError
          )
        }
      }

      toast.success("Proyecto creado correctamente")

      router.push(`/proyectos/${data.id}`)
    } catch (error: any) {
      console.error(error)

      if (error?.code === "23505") {
        toast.error("Ya existe un proyecto con ese código.")
      } else {
        toast.error(
          error?.message || "No se pudo crear el proyecto."
        )
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuevo proyecto"
        description="Crea un proyecto para gestionar actividades, responsables, fechas, dependencias y avance."
      />

      <Button
        type="button"
        variant="ghost"
        onClick={() => router.push("/proyectos")}
      >
        <ArrowLeft className="mr-2 size-4" />
        Volver a proyectos
      </Button>

      <form onSubmit={saveProject}>
        <Card className="mx-auto max-w-4xl">
          <CardHeader>
            <CardTitle>Información del proyecto</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
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
                  placeholder="Ej: FOCUS"
                />

                <p className="text-xs text-muted-foreground">
                  Identificador único del proyecto.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Nombre *</Label>

                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Ej: Proyecto Focus"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>

              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    description: e.target.value,
                  }))
                }
                placeholder="Objetivo, alcance general o contexto del proyecto."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Estado</Label>

                <Select
                  value={form.status}
                  onValueChange={(value) => {
                    if (value) {
                      setForm((f) => ({
                        ...f,
                        status: value as ProjectStatus,
                      }))
                    }
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
                  value={form.priority}
                  onValueChange={(value) => {
                    if (value) {
                      setForm((f) => ({
                        ...f,
                        priority: value as ProjectPriority,
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

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Avance inicial (%)</Label>

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

              <div className="space-y-2">
                <Label>Departamento</Label>

                <Select
                  value={form.department}
                  onValueChange={(value) =>
                    setForm((f) => ({
                      ...f,
                      department: value ?? "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
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
                  value={form.ownerId}
                  onValueChange={(value) =>
                    setForm((f) => ({
                      ...f,
                      ownerId: value ?? "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>

                  <SelectContent>
                    {users
                      .filter(
                        (u) =>
                          u.status === "activo" &&
                          u.role !== "usuario"
                      )
                      .map((user) => (
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

            <div className="flex items-center justify-end gap-2 border-t pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push("/proyectos")
                }
                disabled={saving}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={saving}
              >
                <Save className="mr-2 size-4" />
                {saving
                  ? "Creando..."
                  : "Crear proyecto"}
              </Button>
            </div>

            {currentUser && (
              <p className="text-right text-xs text-muted-foreground">
                Creado por {currentUser.name}
              </p>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  )
}