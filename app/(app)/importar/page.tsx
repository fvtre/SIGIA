"use client"

import * as React from "react"
import {
    Database,
    Upload,
    CheckCircle2,
    FileSpreadsheet,
    RefreshCw,
    AlertTriangle,
    Plus,
} from "lucide-react"
import { toast } from "sonner"

import { supabase } from "@/lib/supabase"
import { useSigia } from "@/lib/store"
import type { Incident, Priority, Status } from "@/lib/types"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

type CsvRow = Record<string, string>

type PreparedRow = {
    code: string
    module: string
    title: string
    description: string
    origin: string
    occurred_at: string | null
    reason: string | null
    strategy: string | null
    department: string
    related_areas: string[]
    priority: Priority
    follow_up: string | null
    status: Status
    source: string
    source_data: CsvRow
}

type Analysis = {
    total: number
    valid: PreparedRow[]
    news: PreparedRow[]
    changed: PreparedRow[]
    unchanged: PreparedRow[]
    invalid: { row: CsvRow; reason: string }[]
}

type ChangeDetail = {
    field: string
    current: string
    incoming: string
}

function clean(value: any) {
    return String(value ?? "")
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}

function normalizeCode(value: any) {
    const raw = clean(value).toUpperCase()
    const match = raw.match(/IN\s*0*(\d+)/i)
    if (!match) return ""
    return `IN${String(Number(match[1])).padStart(3, "0")}`
}

function normalizePriority(value: any): Priority {
    const v = clean(value).toLowerCase()

    if (v.includes("crit")) return "critica"
    if (v.includes("alto") || v.includes("alta")) return "alta"
    if (v.includes("bajo") || v.includes("baja")) return "baja"

    return "media"
}

function normalizeStatus(value: any): Status {
    const v = clean(value).toLowerCase()

    if (
        v.includes("solucion") ||
        v.includes("resuelt") ||
        v.includes("cerrad")
    ) {
        return "resuelta"
    }

    if (v.includes("progreso")) return "en_progreso"
    if (v.includes("espera")) return "en_espera"
    if (v.includes("asignad")) return "asignada"

    return "nueva"
}

function normalizeDepartmentName(value: string) {
    const v = clean(value)

    if (!v) return "Otro"
    if (/^(it|ti|gti)$/i.test(v)) return "GTI"
    if (/alma/i.test(v)) return "Alma"
    if (/integracion/i.test(v)) return "Integraciones"
    if (/operacion/i.test(v)) return "Operaciones"
    if (/comercial/i.test(v)) return "Comercial"
    if (/finanza/i.test(v)) return "Finanzas"
    if (/rrhh|recursos humanos/i.test(v)) return "Recursos Humanos"
    if (/clinica/i.test(v)) return "Clínica"
    if (/pacs/i.test(v)) return "PACS"

    return v
}

function splitDepartments(value: any) {
    const parts = clean(value)
        .split(/\s*\/\s*|\s*,\s*|\s*;\s*/)
        .map(normalizeDepartmentName)
        .filter(Boolean)

    const unique = Array.from(new Set(parts))

    return {
        main: unique[0] || "Otro",
        related: unique.slice(1),
    }
}

function parseDate(value: any): string | null {
    const text = clean(value)

    if (!text) return null

    // Fechas incompletas antiguas como "29"
    if (/^\d{1,2}$/.test(text)) {
        return null
    }

    const match = text.match(
        /^(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})/
    )

    if (!match) return null

    let year: number
    let month: number
    let day: number

    const a = Number(match[1])
    const b = Number(match[2])
    const c = Number(match[3])

    // YYYY-MM-DD
    if (match[1].length === 4) {
        year = a
        month = b
        day = c
    }

    // XX-XX-YYYY
    else if (match[3].length === 4) {
        year = c

        // Si el primer número es > 12,
        // necesariamente es DD-MM-YYYY
        if (a > 12) {
            day = a
            month = b
        }

        // Si el segundo número es > 12,
        // necesariamente es MM-DD-YYYY
        else if (b > 12) {
            month = a
            day = b
        }

        // Ambigua: 08-11-2026, etc.
        // Tu tramo nuevo del Excel usa principalmente MM-DD-YYYY.
        else {
            month = a
            day = b
        }
    } else {
        return null
    }

    // Validaciones antes de construir Date
    if (
        year < 2000 ||
        year > 2100 ||
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31
    ) {
        return null
    }

    const date = new Date(
        `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00-04:00`
    )

    if (Number.isNaN(date.getTime())) {
        return null
    }

    return date.toISOString()
}

function detectSeparator(firstLine: string) {
    const candidates = [",", ";", "\t"]

    let best = ","
    let bestCount = -1

    for (const candidate of candidates) {
        const count = firstLine.split(candidate).length

        if (count > bestCount) {
            best = candidate
            bestCount = count
        }
    }

    return best
}

function parseCsv(text: string): CsvRow[] {
    const normalized = text
        .replace(/^\uFEFF/, "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")

    const firstLine = normalized.split("\n")[0] || ""
    const separator = detectSeparator(firstLine)

    const rows: string[][] = []
    let row: string[] = []
    let cell = ""
    let insideQuotes = false

    for (let i = 0; i < normalized.length; i++) {
        const char = normalized[i]
        const next = normalized[i + 1]

        if (char === '"') {
            if (insideQuotes && next === '"') {
                cell += '"'
                i++
            } else {
                insideQuotes = !insideQuotes
            }

            continue
        }

        if (char === separator && !insideQuotes) {
            row.push(cell)
            cell = ""
            continue
        }

        if (char === "\n" && !insideQuotes) {
            row.push(cell)

            if (row.some((value) => clean(value))) {
                rows.push(row)
            }

            row = []
            cell = ""
            continue
        }

        cell += char
    }

    if (cell.length || row.length) {
        row.push(cell)

        if (row.some((value) => clean(value))) {
            rows.push(row)
        }
    }

    if (rows.length < 2) return []

    const headers = rows[0].map(clean)

    return rows.slice(1).map((values) => {
        const result: CsvRow = {}

        headers.forEach((header, index) => {
            result[header] = values[index] ?? ""
        })

        return result
    })
}

function getCell(row: CsvRow, ...names: string[]) {
    for (const name of names) {
        if (row[name] !== undefined) return row[name]
    }

    const normalized = Object.keys(row).find((key) =>
        names.some(
            (name) =>
                key.trim().toLowerCase() === name.trim().toLowerCase()
        )
    )

    return normalized ? row[normalized] : ""
}

function prepareRow(row: CsvRow): PreparedRow | null {
    const code = normalizeCode(getCell(row, "Id", "ID", "Codigo", "Código"))
    const title = clean(getCell(row, "Incidencia", "Título", "Titulo"))

    if (!code || !title) return null

    const departmentInfo = splitDepartments(
        getCell(row, "Depto", "Departamento", "Área", "Area")
    )

    const reason = clean(getCell(row, "Motivo"))
    const strategy = clean(getCell(row, "Estrategia"))
    const followUp = clean(getCell(row, "Update", "Seguimiento"))

    return {
        code,
        module: clean(getCell(row, "Modulo", "Módulo")) || "Otro",
        title,
        description: title,
        origin: clean(getCell(row, "Origen")) || "Operación",
        occurred_at: parseDate(getCell(row, "Fecha")),
        reason: reason || null,
        strategy: strategy || null,
        department: departmentInfo.main,
        related_areas: departmentInfo.related,
        priority: normalizePriority(getCell(row, "Criticidad", "Prioridad")),
        follow_up: followUp || null,
        status: normalizeStatus(
            getCell(row, "Estado Final", "Estado", "Update")
        ),
        source: "excel",
        source_data: row,
    }
}

function sameText(a: any, b: any) {
    return clean(a).toLowerCase() === clean(b).toLowerCase()
}

function sameStringArray(a?: string[], b?: string[]) {
    const aa = [...(a || [])].map(clean).sort()
    const bb = [...(b || [])].map(clean).sort()

    return JSON.stringify(aa) === JSON.stringify(bb)
}

function displayValue(value: any) {
    const v = clean(value)
    return v || "—"
}

function displayAreas(value?: string[]) {
    const items = (value || []).map(clean).filter(Boolean)
    return items.length ? items.join(", ") : "—"
}

function getChanges(row: PreparedRow, current: Incident): ChangeDetail[] {
    const changes: ChangeDetail[] = []

    const pushTextChange = (
        field: string,
        incoming: any,
        existing: any
    ) => {
        if (!sameText(incoming, existing)) {
            changes.push({
                field,
                current: displayValue(existing),
                incoming: displayValue(incoming),
            })
        }
    }

    pushTextChange("Título", row.title, current.title)
    pushTextChange("Módulo", row.module, current.category)
    pushTextChange("Origen", row.origin, current.origin)
    pushTextChange("Motivo", row.reason, current.reason)
    pushTextChange("Estrategia", row.strategy, current.strategy)
    pushTextChange("Departamento", row.department, current.department)

    if (!sameStringArray(row.related_areas, current.relatedAreas)) {
        changes.push({
            field: "Áreas relacionadas",
            current: displayAreas(current.relatedAreas),
            incoming: displayAreas(row.related_areas),
        })
    }

    if (row.priority !== current.priority) {
        changes.push({
            field: "Prioridad",
            current: current.priority,
            incoming: row.priority,
        })
    }

    pushTextChange("Seguimiento / Update", row.follow_up, current.followUp)

    if (row.status !== current.status) {
        changes.push({
            field: "Estado",
            current: current.status,
            incoming: row.status,
        })
    }

    return changes
}

function hasChanges(row: PreparedRow, current: Incident) {
    return getChanges(row, current).length > 0
}

export default function ImportarPage() {
    const { refresh, incidents } = useSigia()

    const [file, setFile] = React.useState<File | null>(null)
    const [analysis, setAnalysis] = React.useState<Analysis | null>(null)
    const [analyzing, setAnalyzing] = React.useState(false)
    const [busy, setBusy] = React.useState(false)
    const [done, setDone] = React.useState(0)

    const fileInputRef = React.useRef<HTMLInputElement | null>(null)

    const analyzeFile = async (selectedFile: File) => {
        setAnalyzing(true)
        setAnalysis(null)

        try {
            const text = await selectedFile.text()
            const rawRows = parseCsv(text)

            if (!rawRows.length) {
                throw new Error(
                    "No se encontraron filas válidas. Verifica que el CSV tenga encabezados."
                )
            }

            const valid: PreparedRow[] = []
            const invalid: { row: CsvRow; reason: string }[] = []

            for (const row of rawRows) {
                const prepared = prepareRow(row)

                if (!prepared) {
                    const maybeCode = clean(getCell(row, "Id", "ID"))

                    if (maybeCode) {
                        invalid.push({
                            row,
                            reason: "La fila no tiene un INxxx o una incidencia válida.",
                        })
                    }

                    continue
                }

                valid.push(prepared)
            }

            const currentByCode = new Map(
                incidents.map((incident) => [incident.id, incident])
            )

            const news: PreparedRow[] = []
            const changed: PreparedRow[] = []
            const unchanged: PreparedRow[] = []

            valid.forEach((row) => {
                const current = currentByCode.get(row.code)

                if (!current) {
                    news.push(row)
                } else if (hasChanges(row, current)) {
                    changed.push(row)
                } else {
                    unchanged.push(row)
                }
            })

            setAnalysis({
                total: rawRows.length,
                valid,
                news,
                changed,
                unchanged,
                invalid,
            })

            toast.success(
                `CSV analizado: ${news.length} nuevas y ${changed.length} con cambios`
            )
        } catch (error: any) {
            console.error(error)
            toast.error(error?.message || "No se pudo analizar el CSV.")
            setFile(null)
        } finally {
            setAnalyzing(false)
        }
    }

    const onFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const selected = event.target.files?.[0]

        if (!selected) return

        if (!/\.csv$/i.test(selected.name)) {
            toast.error("Selecciona un archivo .csv")
            event.target.value = ""
            return
        }

        setFile(selected)
        await analyzeFile(selected)
    }

    const runImport = async () => {
        if (!file || !analysis) return

        const rowsToProcess = [...analysis.news, ...analysis.changed]

        if (!rowsToProcess.length) {
            toast.info("No hay incidencias nuevas ni cambios por importar.")
            return
        }

        setBusy(true)
        setDone(0)

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) throw new Error("Sesión no válida")

            let processed = 0

            for (const row of analysis.news) {
                const { error } = await supabase.from("incidents").insert({
                    ...row,
                    created_by: user.id,
                })

                if (error) throw error

                processed++
                setDone(processed)
            }

            for (const row of analysis.changed) {
                const {
                    source_data,
                    source,
                    code,
                    ...patch
                } = row

                const { error } = await supabase
                    .from("incidents")
                    .update({
                        ...patch,
                        source,
                        source_data,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("code", code)

                if (error) throw error

                processed++
                setDone(processed)
            }

            const { error: batchError } = await supabase
                .from("import_batches")
                .insert({
                    filename: file.name,
                    sheet_name: "Incidentes",
                    total_rows: analysis.total,
                    imported_rows: rowsToProcess.length,
                    rejected_rows: analysis.invalid.length,
                    imported_by: user.id,
                    mapping: {
                        code: "Id",
                        module: "Modulo",
                        title: "Incidencia",
                        origin: "Origen",
                        occurred_at: "Fecha",
                        reason: "Motivo",
                        strategy: "Estrategia",
                        department: "Depto",
                        priority: "Criticidad",
                        follow_up: "Update",
                        status: "Estado Final",
                    },
                })

            if (batchError) {
                console.warn("No se pudo registrar import_batches:", batchError)
            }

            await refresh()

            toast.success(
                `Importación lista: ${analysis.news.length} nuevas y ${analysis.changed.length} actualizadas`
            )

            setAnalysis((previous) =>
                previous
                    ? {
                        ...previous,
                        news: [],
                        changed: [],
                        unchanged: previous.valid,
                    }
                    : previous
            )
        } catch (error: any) {
            console.error(error)
            toast.error(error?.message || "Error de importación")
        } finally {
            setBusy(false)
        }
    }

    const totalToImport =
        (analysis?.news.length || 0) + (analysis?.changed.length || 0)

    return (
        <div className="space-y-6">
            <PageHeader
                title="Importar datos"
                description="Carga incremental y controlada del registro CSV de incidencias hacia SIGIA."
            />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="size-5" />
                        Importación incremental
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={onFileChange}
                    />

                    <div
                        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center transition-colors hover:bg-muted/40"
                        onClick={() => {
                            if (!busy && !analyzing) fileInputRef.current?.click()
                        }}
                    >
                        <FileSpreadsheet className="mb-3 size-9 text-muted-foreground" />

                        <p className="font-medium">
                            {file ? file.name : "Selecciona tu CSV de incidencias"}
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                            En Excel usa Archivo → Guardar como → CSV UTF-8.
                        </p>

                        <Button
                            type="button"
                            variant="outline"
                            className="mt-4"
                            disabled={busy || analyzing}
                            onClick={(e) => {
                                e.stopPropagation()
                                fileInputRef.current?.click()
                            }}
                        >
                            <Upload className="mr-2 size-4" />
                            {file ? "Cambiar archivo" : "Seleccionar CSV"}
                        </Button>
                    </div>

                    {analyzing && (
                        <div className="space-y-2">
                            <Progress value={45} />
                            <p className="text-sm text-muted-foreground">
                                Analizando archivo...
                            </p>
                        </div>
                    )}

                    {analysis && !analyzing && (
                        <>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                <K t="Filas del CSV" v={String(analysis.total)} />
                                <K
                                    t="Nuevas"
                                    v={String(analysis.news.length)}
                                    icon={<Plus className="size-4" />}
                                />
                                <K
                                    t="Con cambios"
                                    v={String(analysis.changed.length)}
                                    icon={<RefreshCw className="size-4" />}
                                />
                                <K
                                    t="Sin cambios"
                                    v={String(analysis.unchanged.length)}
                                    icon={<CheckCircle2 className="size-4" />}
                                />
                                <K
                                    t="Con problemas"
                                    v={String(analysis.invalid.length)}
                                    icon={<AlertTriangle className="size-4" />}
                                />
                            </div>

                            {analysis.news.length > 0 && (
                                <PreviewBlock
                                    title="Incidencias nuevas"
                                    badge={`${analysis.news.length} nuevas`}
                                    rows={analysis.news}
                                />
                            )}

                            {analysis.changed.length > 0 && (
                                <PreviewBlock
                                    title="Incidencias que serán actualizadas"
                                    badge={`${analysis.changed.length} cambios`}
                                    rows={analysis.changed}
                                    currentIncidents={incidents}
                                    showChanges
                                />
                            )}

                            {analysis.invalid.length > 0 && (
                                <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="size-4" />
                                        <p className="font-medium">
                                            {analysis.invalid.length} filas requieren revisión
                                        </p>
                                    </div>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        No se importarán porque no tienen código INxxx o título válido.
                                    </p>
                                </div>
                            )}

                            {busy && (
                                <div className="space-y-2">
                                    <Progress
                                        value={
                                            totalToImport
                                                ? (done / totalToImport) * 100
                                                : 100
                                        }
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Procesando {done} de {totalToImport}...
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                                <p className="text-sm text-muted-foreground">
                                    Actualmente SIGIA contiene {incidents.length} incidencias.
                                </p>

                                <Button
                                    onClick={runImport}
                                    disabled={busy || totalToImport === 0}
                                >
                                    <Upload className="mr-2 size-4" />

                                    {busy
                                        ? "Importando..."
                                        : totalToImport === 0
                                            ? "SIGIA está actualizado"
                                            : `Importar ${totalToImport} cambios`}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

function K({
    t,
    v,
    icon,
}: {
    t: string
    v: string
    icon?: React.ReactNode
}) {
    return (
        <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{t}</p>
                {icon ? (
                    <span className="text-muted-foreground">{icon}</span>
                ) : null}
            </div>

            <p className="mt-1 text-xl font-semibold">{v}</p>
        </div>
    )
}

function PreviewBlock({
    title,
    badge,
    rows,
    currentIncidents = [],
    showChanges = false,
}: {
    title: string
    badge: string
    rows: PreparedRow[]
    currentIncidents?: Incident[]
    showChanges?: boolean
}) {
    const currentByCode = React.useMemo(
        () => new Map(currentIncidents.map((incident) => [incident.id, incident])),
        [currentIncidents]
    )

    return (
        <div className="rounded-lg border">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <p className="font-medium">{title}</p>
                <Badge variant="outline">{badge}</Badge>
            </div>

            <div className="max-h-[32rem] overflow-y-auto">
                {rows.slice(0, 50).map((row) => {
                    const current = currentByCode.get(row.code)
                    const changes =
                        showChanges && current ? getChanges(row, current) : []

                    return (
                        <div
                            key={row.code}
                            className="border-b px-4 py-4 last:border-b-0"
                        >
                            <div className="grid gap-2 sm:grid-cols-[90px_1fr_110px] sm:items-start">
                                <span className="font-mono text-sm text-muted-foreground">
                                    {row.code}
                                </span>

                                <div className="min-w-0">
                                    <p className="text-sm font-medium">
                                        {row.title}
                                    </p>

                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {row.module} · {row.department}
                                    </p>
                                </div>

                                <div className="flex items-center sm:justify-end">
                                    <Badge variant="secondary">{row.status}</Badge>
                                </div>
                            </div>

                            {showChanges && changes.length > 0 && (
                                <div className="mt-4 rounded-lg border bg-muted/20">
                                    <div className="flex items-center justify-between border-b px-3 py-2">
                                        <p className="text-xs font-medium">
                                            Cambios detectados
                                        </p>
                                        <Badge variant="outline">
                                            {changes.length}
                                        </Badge>
                                    </div>

                                    <div className="divide-y">
                                        {changes.map((change) => (
                                            <div
                                                key={change.field}
                                                className="grid gap-2 px-3 py-2 text-xs md:grid-cols-[150px_1fr_24px_1fr]"
                                            >
                                                <span className="font-medium text-muted-foreground">
                                                    {change.field}
                                                </span>

                                                <span className="min-w-0 break-words rounded bg-background px-2 py-1">
                                                    {change.current}
                                                </span>

                                                <span className="hidden text-center text-muted-foreground md:block">
                                                    →
                                                </span>

                                                <span className="min-w-0 break-words rounded bg-background px-2 py-1">
                                                    {change.incoming}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}

                {rows.length > 50 && (
                    <p className="p-3 text-center text-xs text-muted-foreground">
                        Mostrando las primeras 50 de {rows.length}.
                    </p>
                )}
            </div>
        </div>
    )
}