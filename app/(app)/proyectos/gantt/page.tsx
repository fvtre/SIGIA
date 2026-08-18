"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  GanttChartSquare,
  ArrowRight,
  CalendarDays,
  FolderKanban,
} from "lucide-react"
import { toast } from "sonner"

import { supabase } from "@/lib/supabase"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

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

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    planificacion: "Planificación",
    en_curso: "En curso",
    en_espera: "En espera",
    completado: "Completado",
    cancelado: "Cancelado",
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
  if (!value) return "Sin fecha"

  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`))
}

export default function GanttGeneralPage() {
  const router = useRouter()

  const [projects, setProjects] = React.useState<Project[]>([])
  const [loading, setLoading] = React.useState(true)

  const loadProjects = React.useCallback(async () => {
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          *,
          owner:profiles!projects_owner_id_fkey(full_name)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      setProjects((data || []) as Project[])
    } catch (error: any) {
      console.error(error)
      toast.error(
        error?.message || "No se pudieron cargar los proyectos."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadProjects()

    const channel = supabase
      .channel("sigia-gantt-project-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
        },
        () => loadProjects()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadProjects])

  const activeProjects = projects.filter(
    (project) => project.status === "en_curso"
  ).length

  const averageProgress = projects.length
    ? Math.round(
        projects.reduce(
          (sum, project) => sum + project.progress,
          0
        ) / projects.length
      )
    : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gantt de Proyectos"
        description="Selecciona un proyecto para visualizar su planificación, actividades, hitos y avance."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Summary
          label="Proyectos"
          value={String(projects.length)}
        />

        <Summary
          label="En curso"
          value={String(activeProjects)}
        />

        <Summary
          label="Avance promedio"
          value={`${averageProgress}%`}
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Cargando proyectos...
          </CardContent>
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center">
            <FolderKanban className="mb-3 size-10 text-muted-foreground" />

            <p className="font-medium">
              No hay proyectos disponibles
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Primero crea un proyecto para poder visualizar su Gantt.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="transition-colors hover:border-primary/40"
            >
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">
                      {project.code}
                    </p>

                    <CardTitle className="mt-1 text-lg">
                      {project.name}
                    </CardTitle>
                  </div>

                  <Badge variant="outline">
                    {statusLabel(project.status)}
                  </Badge>
                </div>

                {project.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {project.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Avance
                    </span>

                    <span className="font-medium">
                      {project.progress}%
                    </span>
                  </div>

                  <Progress value={project.progress} />
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-muted-foreground" />

                    <span>
                      {formatDate(project.start_date)}
                      {" → "}
                      {formatDate(project.due_date)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      Prioridad {priorityLabel(project.priority)}
                    </Badge>

                    {project.department && (
                      <Badge variant="outline">
                        {project.department}
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Responsable:{" "}
                    {project.owner?.full_name || "Sin asignar"}
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={() =>
                    router.push(`/proyectos/${project.id}/gantt`)
                  }
                >
                  <GanttChartSquare className="mr-2 size-4" />
                  Abrir Gantt
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Summary({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold">
        {value}
      </p>
    </div>
  )
}