"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
    Search,
    BookOpen,
    Plus,
    Pencil,
    Trash2,
    Eye,
    EyeOff,
    X,
    Save,
    RefreshCw,
    CheckSquare2,
    Square,
} from "lucide-react"

import { useSigia } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import type { KbArticle, Category } from "@/lib/types"
import { CATEGORIES } from "@/lib/types"

import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type ArticleForm = {
    title: string
    category: Category
    problem: string
    symptoms: string
    causes: string
    procedure: string
    validation: string
    notes: string
    published: boolean
}

const EMPTY_FORM: ArticleForm = {
    title: "",
    category: "Otro",
    problem: "",
    symptoms: "",
    causes: "",
    procedure: "",
    validation: "",
    notes: "",
    published: true,
}

export default function Page() {
    const searchParams = useSearchParams()

    const {
        articles,
        addArticle,
        updateArticle,
        deleteArticle,
        currentUser,
        refresh,
    } = useSigia()

    const [query, setQuery] = React.useState("")
    const [openForm, setOpenForm] = React.useState(false)
    const [selected, setSelected] = React.useState<KbArticle | null>(null)
    const [editing, setEditing] = React.useState<KbArticle | null>(null)
    const [form, setForm] = React.useState<ArticleForm>(EMPTY_FORM)
    const [saving, setSaving] = React.useState(false)
    const [syncing, setSyncing] = React.useState(false)
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
    const [bulkBusy, setBulkBusy] = React.useState(false)
    const loadedFromIncident = React.useRef(false)

    React.useEffect(() => {
        if (loadedFromIncident.current) return

        const fromIncident = searchParams.get("fromIncident")
        if (!fromIncident) return

        loadedFromIncident.current = true

        const incomingCategory = searchParams.get("category") || "Otro"
        const validCategory = CATEGORIES.includes(incomingCategory)
            ? incomingCategory
            : "Otro"

        setEditing(null)
        setSelected(null)
        setForm({
            title: searchParams.get("title") || "",
            category: validCategory as Category,
            problem: searchParams.get("problem") || "",
            symptoms: "",
            causes: searchParams.get("causes") || "",
            procedure: searchParams.get("procedure") || "",
            validation: searchParams.get("validation") || "",
            notes: `Creado desde incidencia ${fromIncident}`,
            published: false,
        })
        setOpenForm(true)
    }, [searchParams])

    const rows = React.useMemo(() => {
        const q = query.trim().toLowerCase()

        if (!q) return articles

        return articles.filter((article) =>
            [
                article.title,
                article.category,
                article.problem,
                article.symptoms,
                article.causes,
                article.procedure,
            ]
                .join(" ")
                .toLowerCase()
                .includes(q)
        )
    }, [articles, query])

    const allVisibleSelected =
        rows.length > 0 && rows.every((article) => selectedIds.has(article.id))

    function toggleSelected(id: string) {
        setSelectedIds((current) => {
            const next = new Set(current)

            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }

            return next
        })
    }

    function toggleSelectAllVisible() {
        setSelectedIds((current) => {
            const next = new Set(current)

            if (rows.length > 0 && rows.every((article) => next.has(article.id))) {
                rows.forEach((article) => next.delete(article.id))
            } else {
                rows.forEach((article) => next.add(article.id))
            }

            return next
        })
    }

    async function bulkSetPublished(published: boolean) {
        const ids = Array.from(selectedIds)

        if (!ids.length) {
            alert("Selecciona al menos un artículo.")
            return
        }

        setBulkBusy(true)

        try {
            const { error } = await supabase
                .from("knowledge_articles")
                .update({ published })
                .in("id", ids)

            if (error) throw error

            await refresh()
            setSelectedIds(new Set())

            alert(
                `${ids.length} ${ids.length === 1 ? "artículo actualizado" : "artículos actualizados"} correctamente.`
            )
        } catch (error: any) {
            console.error(error)
            alert(error?.message || "No se pudo actualizar los artículos seleccionados.")
        } finally {
            setBulkBusy(false)
        }
    }

    async function publishAllDrafts() {
        const ok = window.confirm(
            "¿Publicar todos los artículos que actualmente están en borrador?"
        )

        if (!ok) return

        setBulkBusy(true)

        try {
            const { error } = await supabase
                .from("knowledge_articles")
                .update({ published: true })
                .eq("published", false)

            if (error) throw error

            await refresh()
            setSelectedIds(new Set())

            alert("Todos los borradores fueron publicados.")
        } catch (error: any) {
            console.error(error)
            alert(error?.message || "No se pudieron publicar todos los borradores.")
        } finally {
            setBulkBusy(false)
        }
    }

    function newArticle() {
        setEditing(null)
        setSelected(null)
        setForm(EMPTY_FORM)
        setOpenForm(true)
    }

    function editArticle(article: KbArticle) {
        setEditing(article)
        setSelected(null)

        setForm({
            title: article.title,
            category: article.category,
            problem: article.problem,
            symptoms: article.symptoms,
            causes: article.causes,
            procedure: article.procedure,
            validation: article.validation,
            notes: article.notes,
            published: article.published,
        })

        setOpenForm(true)
    }

    function closeForm() {
        setOpenForm(false)
        setEditing(null)
        setForm(EMPTY_FORM)
    }

    async function saveArticle(e: React.FormEvent) {
        e.preventDefault()

        if (!form.title.trim()) {
            alert("Debes ingresar un título.")
            return
        }

        if (!form.problem.trim()) {
            alert("Debes describir el problema.")
            return
        }

        if (!form.procedure.trim()) {
            alert("Debes ingresar el procedimiento o solución.")
            return
        }

        setSaving(true)

        try {
            if (editing) {
                await updateArticle(editing.id, form)
            } else {
                await addArticle(form)
            }

            closeForm()
        } catch (error: any) {
            console.error(error)
            alert(error?.message || "No se pudo guardar el artículo.")
        } finally {
            setSaving(false)
        }
    }

    async function removeArticle(article: KbArticle) {
        const ok = window.confirm(
            `¿Eliminar "${article.title}" de la Base de conocimiento?`
        )

        if (!ok) return

        try {
            await deleteArticle(article.id)

            if (selected?.id === article.id) {
                setSelected(null)
            }
        } catch (error: any) {
            alert(error?.message || "No se pudo eliminar el artículo.")
        }
    }

    async function togglePublished(article: KbArticle) {
        try {
            await updateArticle(article.id, {
                published: !article.published,
            })
        } catch (error: any) {
            alert(error?.message || "No se pudo cambiar el estado.")
        }
    }

    async function syncResolvedIncidents() {
        setSyncing(true)

        try {
            const { data, error } = await supabase.rpc(
                "sync_knowledge_from_resolved_incidents"
            )

            if (error) throw error

            const created = Number(data ?? 0)

            await refresh()

            if (created === 0) {
                alert("Base de conocimiento al día. No hay incidencias resueltas nuevas para sincronizar.")
            } else {
                alert(
                    `${created} ${created === 1 ? "artículo nuevo creado" : "artículos nuevos creados"} como borrador. Revísalos y publícalos cuando estén validados.`
                )
            }
        } catch (error: any) {
            console.error(error)
            alert(error?.message || "No se pudo sincronizar la Base de conocimiento.")
        } finally {
            setSyncing(false)
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Base de conocimiento"
                description="Soluciones documentadas y reutilizables para acelerar la resolución de incidencias."
            />

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full max-w-xl">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                        className="pl-9"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar por título, problema, causa o solución..."
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    {currentUser?.role !== "usuario" && (
                        <Button
                            variant="outline"
                            onClick={syncResolvedIncidents}
                            disabled={syncing}
                        >
                            <RefreshCw className={`mr-2 size-4 ${syncing ? "animate-spin" : ""}`} />
                            {syncing ? "Sincronizando..." : "Sincronizar resueltas"}
                        </Button>
                    )}

                    <Button onClick={newArticle}>
                        <Plus className="mr-2 size-4" />
                        Nuevo artículo
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                    {rows.length} {rows.length === 1 ? "artículo" : "artículos"}
                </span>

                {currentUser && (
                    <span>
                        · Sesión: {currentUser.name}
                    </span>
                )}
            </div>

            {currentUser?.role !== "usuario" && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAllVisible}
                        disabled={bulkBusy || rows.length === 0}
                    >
                        {allVisibleSelected ? (
                            <CheckSquare2 className="mr-2 size-4" />
                        ) : (
                            <Square className="mr-2 size-4" />
                        )}
                        {allVisibleSelected ? "Deseleccionar visibles" : "Seleccionar visibles"}
                    </Button>

                    <span className="text-sm text-muted-foreground">
                        {selectedIds.size} seleccionados
                    </span>

                    <div className="flex flex-wrap gap-2 md:ml-auto">
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => bulkSetPublished(true)}
                            disabled={bulkBusy || selectedIds.size === 0}
                        >
                            <Eye className="mr-2 size-4" />
                            Publicar seleccionados
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => bulkSetPublished(false)}
                            disabled={bulkBusy || selectedIds.size === 0}
                        >
                            <EyeOff className="mr-2 size-4" />
                            Pasar a borrador
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={publishAllDrafts}
                            disabled={bulkBusy}
                        >
                            Publicar todos los borradores
                        </Button>
                    </div>
                </div>
            )}

            {rows.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {rows.map((article) => (
                        <Card
                            key={article.id}
                            className="transition-colors hover:border-primary/40"
                        >
                            <CardHeader>
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        {currentUser?.role !== "usuario" && (
                                            <button
                                                type="button"
                                                className="inline-flex size-7 items-center justify-center rounded hover:bg-muted"
                                                onClick={() => toggleSelected(article.id)}
                                                aria-label={
                                                    selectedIds.has(article.id)
                                                        ? "Deseleccionar artículo"
                                                        : "Seleccionar artículo"
                                                }
                                            >
                                                {selectedIds.has(article.id) ? (
                                                    <CheckSquare2 className="size-4" />
                                                ) : (
                                                    <Square className="size-4" />
                                                )}
                                            </button>
                                        )}

                                        <Badge variant="outline">{article.category}</Badge>
                                    </div>

                                    <Badge variant={article.published ? "default" : "secondary"}>
                                        {article.published ? "Publicado" : "Borrador"}
                                    </Badge>
                                </div>

                                <CardTitle className="text-base">
                                    {article.title}
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <p className="line-clamp-3 text-sm text-muted-foreground">
                                    {article.problem || "Sin descripción del problema."}
                                </p>

                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{article.views} vistas</span>
                                    <span>{article.authorName || "SIGIA"}</span>
                                </div>

                                <div className="flex flex-wrap gap-2 border-t pt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelected(article)}
                                    >
                                        <BookOpen className="mr-1 size-4" />
                                        Ver
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => editArticle(article)}
                                    >
                                        <Pencil className="mr-1 size-4" />
                                        Editar
                                    </Button>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => togglePublished(article)}
                                    >
                                        {article.published ? (
                                            <>
                                                <EyeOff className="mr-1 size-4" />
                                                Borrador
                                            </>
                                        ) : (
                                            <>
                                                <Eye className="mr-1 size-4" />
                                                Publicar
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => removeArticle(article)}
                                    >
                                        <Trash2 className="mr-1 size-4" />
                                        Eliminar
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <div className="py-16 text-center text-muted-foreground">
                        <BookOpen className="mx-auto mb-3 size-8" />

                        <p className="font-medium">
                            {query
                                ? "No encontramos artículos con esa búsqueda."
                                : "La Base de conocimiento está vacía."}
                        </p>

                        {!query && (
                            <Button className="mt-4" onClick={newArticle}>
                                <Plus className="mr-2 size-4" />
                                Crear primer artículo
                            </Button>
                        )}
                    </div>
                </Card>
            )}

            {openForm && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
                    <div className="mx-auto my-6 max-w-3xl rounded-xl border bg-background shadow-xl">
                        <div className="flex items-center justify-between border-b p-5">
                            <div>
                                <h2 className="text-xl font-semibold">
                                    {editing ? "Editar artículo" : "Nuevo artículo"}
                                </h2>

                                <p className="text-sm text-muted-foreground">
                                    Documenta una solución para reutilizarla en futuras incidencias.
                                </p>
                            </div>

                            <Button variant="ghost" size="icon" onClick={closeForm}>
                                <X />
                            </Button>
                        </div>

                        <form onSubmit={saveArticle} className="space-y-5 p-5">
                            <div className="space-y-2">
                                <Label>Título *</Label>

                                <Input
                                    value={form.title}
                                    onChange={(e) =>
                                        setForm((f) => ({ ...f, title: e.target.value }))
                                    }
                                    placeholder="Ej: Worklist no carga pacientes"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Categoría *</Label>

                                <Select
                                    value={form.category}
                                    onValueChange={(value) =>
                                        setForm((f) => ({
                                            ...f,
                                            category: (value ?? "Otro") as Category,
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona categoría" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {CATEGORIES.map((category) => (
                                            <SelectItem key={category} value={category}>
                                                {category}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Field
                                label="Problema *"
                                value={form.problem}
                                placeholder="Describe claramente el problema."
                                onChange={(value) =>
                                    setForm((f) => ({ ...f, problem: value }))
                                }
                            />

                            <Field
                                label="Síntomas"
                                value={form.symptoms}
                                placeholder="¿Cómo se identifica o manifiesta el problema?"
                                onChange={(value) =>
                                    setForm((f) => ({ ...f, symptoms: value }))
                                }
                            />

                            <Field
                                label="Causa conocida"
                                value={form.causes}
                                placeholder="Describe la causa identificada, si se conoce."
                                onChange={(value) =>
                                    setForm((f) => ({ ...f, causes: value }))
                                }
                            />

                            <Field
                                label="Procedimiento / Solución *"
                                value={form.procedure}
                                placeholder="Detalla los pasos para resolver el problema."
                                onChange={(value) =>
                                    setForm((f) => ({ ...f, procedure: value }))
                                }
                                rows={6}
                            />

                            <Field
                                label="Validación"
                                value={form.validation}
                                placeholder="¿Cómo comprobamos que la solución funcionó?"
                                onChange={(value) =>
                                    setForm((f) => ({ ...f, validation: value }))
                                }
                            />

                            <Field
                                label="Notas adicionales"
                                value={form.notes}
                                placeholder="Información adicional, advertencias o recomendaciones."
                                onChange={(value) =>
                                    setForm((f) => ({ ...f, notes: value }))
                                }
                            />

                            <div className="space-y-2">
                                <Label>Estado</Label>

                                <Select
                                    value={form.published ? "publicado" : "borrador"}
                                    onValueChange={(value) =>
                                        setForm((f) => ({
                                            ...f,
                                            published: value === "publicado",
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="publicado">Publicado</SelectItem>
                                        <SelectItem value="borrador">Borrador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex justify-end gap-2 border-t pt-5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeForm}
                                    disabled={saving}
                                >
                                    Cancelar
                                </Button>

                                <Button type="submit" disabled={saving}>
                                    <Save className="mr-2 size-4" />
                                    {saving ? "Guardando..." : "Guardar artículo"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selected && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
                    <div className="mx-auto my-6 max-w-3xl rounded-xl border bg-background shadow-xl">
                        <div className="flex items-start justify-between border-b p-5">
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline">{selected.category}</Badge>

                                    <Badge variant={selected.published ? "default" : "secondary"}>
                                        {selected.published ? "Publicado" : "Borrador"}
                                    </Badge>
                                </div>

                                <h2 className="text-xl font-semibold">
                                    {selected.title}
                                </h2>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelected(null)}
                            >
                                <X />
                            </Button>
                        </div>

                        <div className="space-y-6 p-5">
                            <Section title="Problema" value={selected.problem} />
                            <Section title="Síntomas" value={selected.symptoms} />
                            <Section title="Causa" value={selected.causes} />
                            <Section title="Procedimiento / Solución" value={selected.procedure} />
                            <Section title="Validación" value={selected.validation} />
                            <Section title="Notas adicionales" value={selected.notes} />

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                                <div className="text-xs text-muted-foreground">
                                    Autor: {selected.authorName || "SIGIA"} · {selected.views} vistas
                                </div>

                                <Button onClick={() => editArticle(selected)}>
                                    <Pencil className="mr-2 size-4" />
                                    Editar artículo
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function Field({
    label,
    value,
    onChange,
    placeholder,
    rows = 3,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    rows?: number
}) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>

            <Textarea
                rows={rows}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    )
}

function Section({
    title,
    value,
}: {
    title: string
    value: string
}) {
    if (!value) return null

    return (
        <section className="space-y-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {value}
            </p>
        </section>
    )
}