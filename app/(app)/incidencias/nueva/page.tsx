"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Lightbulb, Search, CheckCircle2 } from "lucide-react"

import { useSigia } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import {
  CATEGORIES,
  DEPARTMENTS,
  SYSTEM_PRODUCTS,
  PRIORITIES,
  STATUSES,
  ORIGINS,
  RESPONSIBLES,
  suggestedResponsible,
  type Priority,
  type Status,
} from "@/lib/types"

import { PageHeader } from "@/components/page-header"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type AIAnalysis = {
  confidence: number
  probable_module: string
  probable_area: string
  probable_cause: string
  recommended_solution: string
  explanation: string
  related_incident: string
}

type Suggestion = {
  id: string
  title: string
  category: string
  problem: string
  symptoms: string | null
  causes: string | null
  procedure: string | null
  validation: string | null
  source_incident_code: string | null
  similarity_percent: number
}

export default function NuevaIncidenciaPage() {
  const router = useRouter()
  const { addIncident } = useSigia()

  const [saving, setSaving] = React.useState(false)
  const [searching, setSearching] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<Suggestion[]>([])
  const [analyzingAI, setAnalyzingAI] = React.useState(false)
  const [aiAnalysis, setAiAnalysis] = React.useState<AIAnalysis | null>(null)
  const [sigiaPanelOpen, setSigiaPanelOpen] = React.useState(false)

  const [f, setF] = React.useState({
    module: "Agendamiento",
    title: "",
    origin: "Operación",
    date: new Date().toISOString().slice(0, 10),
    reason: "",
    strategy: "",
    department: "GTI",
    priority: "media" as Priority,
    followUp: "",
    status: "nueva" as Status,
    systemProduct: "",
    relatedArea: "",
    requester: "",
    location: "",
    responsibleName: "Nelson Romero",
    externalDependency: false,
    externalProvider: "",
  })

  // =========================================================
  // BÚSQUEDA INTELIGENTE EN BASE DE CONOCIMIENTO
  // =========================================================

  React.useEffect(() => {
    const text = f.title.trim()
    if (text.length < 12) {
      setSuggestions([])
      setAiAnalysis(null)
      setSearching(false)
      setAnalyzingAI(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      setAiAnalysis(null)

      try {
        const { data, error } = await supabase.rpc("search_knowledge_suggestions", {
          search_text: text,
          result_limit: 5,
        })
        if (error) throw error

        const historical = ((data ?? []) as Suggestion[])
          .filter((item) => item.similarity_percent >= 70)
          .slice(0, 3)

        setSuggestions(historical)
        setSearching(false)

        if (historical.length === 0) return

        setAnalyzingAI(true)
        const response = await fetch("/api/ai/analyze-incident", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ incident: text, historicalCases: historical }),
        })

        if (!response.ok) throw new Error("SIG-IA no pudo completar el análisis")
        const result = await response.json()
        if (result?.analysis) setAiAnalysis(result.analysis as AIAnalysis)
      } catch (error: any) {
        if (error?.name !== "AbortError") console.error("Error SIG-IA:", error)
      } finally {
        setSearching(false)
        setAnalyzingAI(false)
      }
    }, 500)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [f.title])

  // =========================================================
  // USAR SUGERENCIA
  // =========================================================

  const useSuggestion = (suggestion: Suggestion) => {
    const suggestedModule = CATEGORIES.includes(
      suggestion.category as (typeof CATEGORIES)[number]
    )
      ? suggestion.category
      : f.module

    setF((current) => ({
      ...current,

      module: suggestedModule,

      reason:
        suggestion.causes?.trim() ||
        suggestion.problem?.trim() ||
        current.reason,

      strategy:
        suggestion.procedure?.trim() ||
        current.strategy,

      followUp:
        suggestion.validation?.trim() ||
        current.followUp,
    }))

    toast.success(
      `Sugerencia aplicada (${suggestion.similarity_percent}% de similitud)`
    )
  }

  const applyAIAnalysis = () => {
    if (!aiAnalysis) return

    const moduleIsValid = CATEGORIES.includes(
      aiAnalysis.probable_module as (typeof CATEGORIES)[number]
    )
    const departmentIsValid = DEPARTMENTS.includes(
      aiAnalysis.probable_area as (typeof DEPARTMENTS)[number]
    )

    setF((current) => ({
      ...current,
      module: moduleIsValid ? aiAnalysis.probable_module : current.module,
      department: departmentIsValid ? aiAnalysis.probable_area : current.department,
      reason: aiAnalysis.probable_cause || current.reason,
      strategy: aiAnalysis.recommended_solution || current.strategy,
      followUp: aiAnalysis.explanation || current.followUp,
    }))

    toast.success("Recomendación de SIG-IA aplicada")
  }

  // =========================================================
  // CREAR INCIDENCIA
  // =========================================================

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!f.title.trim()) {
      toast.error("Ingresa la incidencia")
      return
    }

    setSaving(true)

    try {
      const item = await addIncident({
        title: f.title,
        description: f.title,
        requester: f.requester,
        department: f.department,
        category: f.module,
        priority: f.priority,
        location: f.location,
        origin: f.origin,
        reason: f.reason,
        strategy: f.strategy,
        followUp: f.followUp,
        status: f.status,
        occurredAt: new Date(f.date + "T12:00:00").toISOString(),
        systemProduct: f.systemProduct || null,
        relatedAreas: f.relatedArea ? [f.relatedArea] : [],
        responsibleName: f.responsibleName || null,
        externalDependency: f.externalDependency,
        externalProvider: f.externalProvider || null,
      })

      toast.success(`${item.id} creada correctamente`)
      router.push(`/incidencias/${item.id}`)
    } catch (e: any) {
      toast.error(e.message || "No se pudo crear")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Nueva incidencia"
        description="Formulario basado en el registro real de incidencias de MaipoSalud."
      />

      <form onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle>Registro de incidencia</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-5">

            {/* MÓDULO + ORIGEN */}

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Módulo">
                <Select
                  value={f.module}
                  onValueChange={(v) => {
                    if (!v) return
                    setF({
                      ...f,
                      module: v,
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {CATEGORIES.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Origen">
                <Select
                  value={f.origin}
                  onValueChange={(v) => {
                    if (!v) return
                    setF({
                      ...f,
                      origin: v,
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {ORIGINS.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* INCIDENCIA */}

            <Field label="Incidencia *">
              <Textarea
                className="min-h-24"
                value={f.title}
                onChange={(e) =>
                  setF({
                    ...f,
                    title: e.target.value,
                  })
                }
                placeholder="Describe el problema reportado"
              />
            </Field>

            {/* SIG-IA · RESUMEN COMPACTO */}
            {f.title.trim().length >= 12 && (
              <div
                className={[
                  "group relative overflow-hidden rounded-2xl border p-3.5 transition-all duration-300",
                  suggestions.length > 0
                    ? "border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent shadow-[0_0_24px_-16px_hsl(var(--primary))]"
                    : "bg-muted/20",
                ].join(" ")}
              >
                {suggestions.length > 0 && (
                  <>
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_50%,hsl(var(--primary)/0.10),transparent_35%)]" />
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-primary/70" />
                  </>
                )}

                <div className="relative flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
  className="
    relative flex size-10 shrink-0 items-center justify-center
    rounded-xl

    bg-amber-100
    text-amber-600
    ring-1 ring-amber-300
    shadow-[0_0_20px_-6px_rgb(245_158_11_/_0.75)]

    dark:bg-amber-400/15
    dark:text-amber-400
    dark:ring-amber-400/40
    dark:shadow-[0_0_26px_-5px_rgb(245_158_11_/_0.70)]

    transition-all duration-300
    group-hover:scale-110
  "
>
                      {suggestions.length > 0 && (
                        <>
<span
  className="
    absolute inset-0 rounded-xl
    bg-amber-300/35
    dark:bg-amber-400/25
    animate-[sigiaPulse_1.8s_ease-in-out_infinite]
  "
/>
<span
  className="
    absolute -inset-1 rounded-xl border
    border-amber-400/50
    dark:border-amber-400/40
    animate-[sigiaRing_2.2s_ease-out_infinite]
  "
/>
                          <span className="pointer-events-none absolute -left-3 top-0 h-full w-3 rotate-12 bg-white/30 blur-sm animate-[sigiaShine_2.8s_ease-in-out_infinite]" />
                        </>
                      )}

                      <Lightbulb
                        className={[
                          "relative z-10 size-5",
                          suggestions.length > 0
                            ? "animate-[sigiaIdea_1.7s_ease-in-out_infinite]"
                            : "",
                        ].join(" ")}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">
                          {searching
                            ? "SIG-IA está buscando coincidencias..."
                            : suggestions.length > 0
                              ? `SIG-IA encontró ${suggestions.length} ${suggestions.length === 1 ? "coincidencia" : "coincidencias"}`
                              : "SIG-IA no encontró coincidencias altas"}
                        </p>

                        {suggestions.length > 0 && suggestions[0].similarity_percent >= 85 && (
                          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Coincidencia alta
                          </span>
                        )}
                      </div>

                      <p className="truncate text-xs text-muted-foreground">
                        {suggestions.length > 0
                          ? `Mejor resultado: ${suggestions[0].similarity_percent}% de similitud${analyzingAI ? " · Analizando con IA..." : aiAnalysis ? ` · ${aiAnalysis.confidence}% confianza IA` : ""}`
                          : "La búsqueda se realiza sobre soluciones históricas publicadas."}
                      </p>
                    </div>
                  </div>

                  {(suggestions.length > 0 || analyzingAI || aiAnalysis) && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setSigiaPanelOpen(true)}
                      className="relative overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <Lightbulb className="relative z-10 mr-2 size-4" />
                      <span className="relative z-10">Ver SIG-IA</span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* SIG-IA · PANEL LATERAL */}
            {sigiaPanelOpen && (
              <>
                <button
                  type="button"
                  aria-label="Cerrar SIG-IA"
                  className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
                  onClick={() => setSigiaPanelOpen(false)}
                />

                <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l bg-background shadow-2xl">
                  <div className="flex items-center justify-between border-b px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <Lightbulb className="size-5" />
                      </div>
                      <div>
                        <p className="font-semibold">SIG-IA</p>
                        <p className="text-xs text-muted-foreground">
                          Asistente inteligente de incidencias
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSigiaPanelOpen(false)}
                    >
                      Cerrar
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5">
                    <div className="rounded-xl border bg-primary/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">✨ Análisis SIG-IA</p>
                          <p className="text-xs text-muted-foreground">
                            GPT-OSS analiza los mejores casos históricos encontrados.
                          </p>
                        </div>

                        {aiAnalysis && (
                          <span className="shrink-0 rounded-full border bg-background px-2.5 py-1 text-xs font-semibold">
                            {aiAnalysis.confidence}% confianza
                          </span>
                        )}
                      </div>

                      {analyzingAI && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                          <Search className="size-4 animate-pulse" />
                          Analizando evidencia...
                        </div>
                      )}

                      {!analyzingAI && !aiAnalysis && (
                        <p className="mt-4 text-sm text-muted-foreground">
                          El análisis IA aparecerá cuando exista evidencia histórica suficiente.
                        </p>
                      )}

                      {!analyzingAI && aiAnalysis && (
                        <div className="mt-4 grid gap-4">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-lg border bg-background p-3">
                              <p className="text-[11px] text-muted-foreground">Caso</p>
                              <p className="mt-1 text-sm font-semibold">{aiAnalysis.related_incident || "—"}</p>
                            </div>
                            <div className="rounded-lg border bg-background p-3">
                              <p className="text-[11px] text-muted-foreground">Módulo</p>
                              <p className="mt-1 text-sm font-semibold">{aiAnalysis.probable_module || "—"}</p>
                            </div>
                            <div className="rounded-lg border bg-background p-3">
                              <p className="text-[11px] text-muted-foreground">Área</p>
                              <p className="mt-1 text-sm font-semibold">{aiAnalysis.probable_area || "—"}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Causa probable</p>
                            <p className="mt-1 text-sm">{aiAnalysis.probable_cause || "No determinada"}</p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solución recomendada</p>
                            <p className="mt-1 text-sm">{aiAnalysis.recommended_solution || "No determinada"}</p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Justificación</p>
                            <p className="mt-1 text-sm text-muted-foreground">{aiAnalysis.explanation || "Sin explicación adicional."}</p>
                          </div>

                          <Button
                            type="button"
                            onClick={() => {
                              applyAIAnalysis()
                              setSigiaPanelOpen(false)
                            }}
                          >
                            <CheckCircle2 className="mr-2 size-4" />
                            Aplicar recomendación SIG-IA
                          </Button>
                        </div>
                      )}
                    </div>


                    <div className="my-5 border-t" />

                    {searching && (
                      <div className="flex items-center gap-2 rounded-xl border p-4 text-sm text-muted-foreground">
                        <Search className="size-4 animate-pulse" />
                        Buscando soluciones históricas...
                      </div>
                    )}

                    {!searching && suggestions.length > 0 && (
                      <div className="grid gap-3">
                        <div>
                          <p className="text-sm font-semibold">Casos similares</p>
                          <p className="text-xs text-muted-foreground">
                            Evidencia recuperada desde la base de conocimiento.
                          </p>
                        </div>

                        {suggestions.map((suggestion, index) => (
                          <div key={suggestion.id} className="rounded-xl border bg-card p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-muted-foreground">
                                  #{index + 1} · {suggestion.source_incident_code || "Base de conocimiento"}
                                </p>
                                <p className="mt-1 font-semibold">{suggestion.title}</p>
                                {suggestion.category && (
                                  <p className="mt-1 text-xs text-muted-foreground">{suggestion.category}</p>
                                )}
                              </div>

                              <span className={
                                suggestion.similarity_percent >= 85
                                  ? "shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-950 dark:text-green-300"
                                  : "shrink-0 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                              }>
                                {suggestion.similarity_percent}%
                              </span>
                            </div>

                            {suggestion.causes && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Causa</p>
                                <p className="mt-1 line-clamp-3 text-sm">{suggestion.causes}</p>
                              </div>
                            )}

                            {suggestion.procedure && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solución</p>
                                <p className="mt-1 line-clamp-4 text-sm">{suggestion.procedure}</p>
                              </div>
                            )}

                            <div className="mt-4 flex justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  useSuggestion(suggestion)
                                  setSigiaPanelOpen(false)
                                }}
                              >
                                <CheckCircle2 className="mr-2 size-4" />
                                Usar sugerencia
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                </aside>
              </>
            )}

            {/* FECHA + CRITICIDAD */}

            <div className="grid gap-4 md:grid-cols-2">

              <Field label="Fecha">
                <Input
                  type="date"
                  value={f.date}
                  onChange={(e) =>
                    setF({
                      ...f,
                      date: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Criticidad">
                <Select
                  value={f.priority}
                  onValueChange={(v) => {
                    if (!v) return
                    setF({
                      ...f,
                      priority: v as Priority,
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {PRIORITIES.map((x) => (
                      <SelectItem
                        key={x.value}
                        value={x.value}
                      >
                        {x.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

            </div>

            {/* MOTIVO */}

            <Field label="Motivo">
              <Textarea
                value={f.reason}
                onChange={(e) =>
                  setF({
                    ...f,
                    reason: e.target.value,
                  })
                }
                placeholder="Causa o motivo identificado"
              />
            </Field>

            {/* ESTRATEGIA */}

            <Field label="Estrategia">
              <Textarea
                value={f.strategy}
                onChange={(e) =>
                  setF({
                    ...f,
                    strategy: e.target.value,
                  })
                }
                placeholder="Acción, solución o estrategia propuesta"
              />
            </Field>

            {/* DEPARTAMENTO / ÁREA / SISTEMA */}

            <div className="grid gap-4 md:grid-cols-3">

              <Field label="Departamento principal">
                <Select
                  value={f.department}
                  onValueChange={(v) => {
                    if (!v) return
                    setF({
                      ...f,
                      department: v,
                      responsibleName:
                        suggestedResponsible(
                          f.systemProduct,
                          v
                        ) || f.responsibleName,
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {DEPARTMENTS.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Área relacionada">
                <Select
                  value={f.relatedArea || "ninguna"}
                  onValueChange={(v) => {
                    if (!v) return
                    setF({
                      ...f,
                      relatedArea:
                        v === "ninguna" ? "" : v,
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="ninguna">
                      Ninguna
                    </SelectItem>

                    {DEPARTMENTS
                      .filter(
                        (x) =>
                          x !== f.department
                      )
                      .map((x) => (
                        <SelectItem
                          key={x}
                          value={x}
                        >
                          {x}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Sistema / Producto">
                <Select
                  value={
                    f.systemProduct || "ninguno"
                  }
                  onValueChange={(v) => {
                    if (!v) return

                    const sp =
                      v === "ninguno" ? "" : v

                    const ext =
                      sp === "Fonasa" ||
                      sp === "IMED"

                    setF({
                      ...f,
                      systemProduct: sp,
                      responsibleName:
                        suggestedResponsible(
                          sp,
                          f.department
                        ) || "",
                      externalDependency: ext,
                      externalProvider: ext
                        ? sp
                        : "",
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="ninguno">
                      No aplica
                    </SelectItem>

                    {SYSTEM_PRODUCTS.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

            </div>

            {/* RESPONSABLE / DEPENDENCIA */}

            <div className="grid gap-4 md:grid-cols-3">

              <Field label="Responsable">
                <Select
                  value={
                    f.responsibleName ||
                    "sin_asignar"
                  }
                  onValueChange={(v) => {
                    if (!v) return
                    setF({
                      ...f,
                      responsibleName:
                        v === "sin_asignar"
                          ? ""
                          : v,
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="sin_asignar">
                      Sin asignar
                    </SelectItem>

                    {RESPONSIBLES.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Dependencia externa">
                <Select
                  value={
                    f.externalDependency
                      ? "si"
                      : "no"
                  }
                  onValueChange={(v) => {
                    if (!v) return
                    setF({
                      ...f,
                      externalDependency:
                        v === "si",
                      externalProvider:
                        v === "si"
                          ? f.externalProvider
                          : "",
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="no">
                      No
                    </SelectItem>

                    <SelectItem value="si">
                      Sí
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {f.externalDependency ? (
                <Field label="Proveedor externo">
                  <Select
                    value={
                      f.externalProvider ||
                      "Fonasa"
                    }
                    onValueChange={(v) => {
                      if (!v) return
                      setF({
                        ...f,
                        externalProvider: v,
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="Fonasa">
                        Fonasa
                      </SelectItem>

                      <SelectItem value="IMED">
                        IMED
                      </SelectItem>

                      <SelectItem value="Otro">
                        Otro
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              ) : (
                <div />
              )}

            </div>

            {/* SEGUIMIENTO */}

            <Field label="Update / Seguimiento">
              <Textarea
                value={f.followUp}
                onChange={(e) =>
                  setF({
                    ...f,
                    followUp: e.target.value,
                  })
                }
                placeholder="Última actualización o seguimiento"
              />
            </Field>

            {/* ESTADO / SOLICITANTE / UBICACIÓN */}

            <div className="grid gap-4 md:grid-cols-3">

              <Field label="Estado">
                <Select
                  value={f.status}
                  onValueChange={(v) => {
                    if (!v) return
                    setF({
                      ...f,
                      status: v as Status,
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    {STATUSES.map((x) => (
                      <SelectItem
                        key={x.value}
                        value={x.value}
                      >
                        {x.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Solicitante (opcional)">
                <Input
                  value={f.requester}
                  onChange={(e) =>
                    setF({
                      ...f,
                      requester:
                        e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Sucursal / ubicación (opcional)">
                <Input
                  value={f.location}
                  onChange={(e) =>
                    setF({
                      ...f,
                      location:
                        e.target.value,
                    })
                  }
                />
              </Field>

            </div>

            {/* BOTONES */}

            <div className="flex justify-end gap-2">

              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Guardando..."
                  : "Crear incidencia"}
              </Button>

            </div>

          </CardContent>
        </Card>
      </form>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}