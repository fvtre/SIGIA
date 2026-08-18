"use client"
import * as React from "react"
import { toast } from "sonner"
import { MessageSquare, Send, Sparkles, Clock, User, Building2, MapPin, Tag, Pencil, Trash2, Save, X, BookOpen } from "lucide-react"
import type { Incident, Priority, Status } from "@/lib/types"
import { PRIORITIES, STATUSES, DEPARTMENTS, CATEGORIES, SYSTEM_PRODUCTS, ORIGINS } from "@/lib/types"
import { useSigia } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PriorityBadge, StatusBadge } from "@/components/status-badges"
import { IncidentTimeline } from "@/components/incidencias/incident-timeline"
import { formatDateTime, slaRemaining } from "@/lib/format"
import { useRouter } from "next/navigation"

export function IncidentDetail({ incident }: { incident: Incident }) {
    const router = useRouter(); const { updateIncident, deleteIncident, addComment, users, currentUser } = useSigia(); const [comment, setComment] = React.useState(""); const [editing, setEditing] = React.useState(false); const [edit, setEdit] = React.useState({ title: incident.title, origin: incident.origin || "Operación", reason: incident.reason || "", strategy: incident.strategy || "", followUp: incident.followUp || "", department: incident.department, category: incident.category, systemProduct: incident.systemProduct || "", requester: incident.requester || "", location: incident.location || "" })
    const techs = users.filter(u => u.role === "tecnico" || u.role === "administrador"); const sla = slaRemaining(incident.slaDueAt, incident.slaBreached)
    const patchStatus = async (v: string) => { try { await updateIncident(incident.id, { status: v as Status }, `Estado cambiado a ${STATUSES.find(s => s.value === v)?.label}`); toast.success("Estado actualizado") } catch (e: any) { toast.error(e.message) } }
    const patchPriority = async (v: string) => { try { await updateIncident(incident.id, { priority: v as Priority }, `Prioridad cambiada a ${PRIORITIES.find(p => p.value === v)?.label}`); toast.success("Prioridad actualizada") } catch (e: any) { toast.error(e.message) } }
    const send = async () => { if (!comment.trim()) return; try { await addComment(incident.id, comment.trim()); setComment(""); toast.success("Comentario publicado") } catch (e: any) { toast.error(e.message) } }
    const saveEdit = async () => { try { await updateIncident(incident.id, { ...edit, description: edit.title }, "Datos de incidencia editados"); setEditing(false); toast.success("Incidencia actualizada") } catch (e: any) { toast.error(e.message) } }
    const remove = async () => { if (!window.confirm(`¿Eliminar ${incident.id}? Esta acción no se puede deshacer.`)) return; try { await deleteIncident(incident.id); toast.success(`${incident.id} eliminada`); router.push("/incidencias") } catch (e: any) { toast.error(e.message || "No se pudo eliminar") } }
    const createKnowledgeArticle = () => {
        const params = new URLSearchParams({
            fromIncident: incident.id,
            title: incident.title || "",
            category: incident.category || "Otro",
            problem: incident.description || incident.title || "",
            causes: incident.reason || "",
            procedure: incident.strategy || "",
            validation: incident.followUp || "",
        })

        router.push(`/base-conocimiento?${params.toString()}`)
    }
    return <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
            <Card><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm text-muted-foreground">{incident.id}</span><PriorityBadge priority={incident.priority} /><StatusBadge status={incident.status} /></div><div className="flex flex-wrap gap-2">
                {(incident.status === "resuelta" || incident.status === "cerrada") && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={createKnowledgeArticle}
                    >
                        <BookOpen className="size-4" />
                        Crear artículo
                    </Button>
                )}

                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(!editing)}
                >
                    {editing ? <X /> : <Pencil />}
                    {editing ? "Cancelar" : "Editar"}
                </Button>

                {currentUser?.role === "administrador" && (
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={remove}
                    >
                        <Trash2 />
                        Eliminar
                    </Button>
                )}
            </div></div>{!editing && <CardTitle className="text-xl">{incident.title}</CardTitle>}</CardHeader><CardContent>{editing ? <div className="grid gap-3"><Input value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} /><div className="grid gap-3 md:grid-cols-2"><Select value={edit.category} onValueChange={v => setEdit({ ...edit, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select><Select value={edit.origin} onValueChange={v => setEdit({ ...edit, origin: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ORIGINS.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select><Select value={edit.department} onValueChange={v => setEdit({ ...edit, department: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEPARTMENTS.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select><Select value={edit.systemProduct || "ninguno"} onValueChange={v => setEdit({ ...edit, systemProduct: v === "ninguno" ? "" : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ninguno">No aplica</SelectItem>{SYSTEM_PRODUCTS.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><Textarea value={edit.reason} onChange={e => setEdit({ ...edit, reason: e.target.value })} placeholder="Motivo" /><Textarea value={edit.strategy} onChange={e => setEdit({ ...edit, strategy: e.target.value })} placeholder="Estrategia" /><Textarea value={edit.followUp} onChange={e => setEdit({ ...edit, followUp: e.target.value })} placeholder="Update / Seguimiento" /><div className="grid gap-3 md:grid-cols-2"><Input value={edit.requester} onChange={e => setEdit({ ...edit, requester: e.target.value })} placeholder="Solicitante" /><Input value={edit.location} onChange={e => setEdit({ ...edit, location: e.target.value })} placeholder="Ubicación" /></div><Button onClick={saveEdit}><Save />Guardar cambios</Button></div> : <div className="space-y-3"><p className="leading-relaxed text-muted-foreground">{incident.title}</p>{incident.reason && <div><p className="text-xs font-medium text-muted-foreground">Motivo</p><p className="text-sm">{incident.reason}</p></div>}{incident.strategy && <div><p className="text-xs font-medium text-muted-foreground">Estrategia</p><p className="text-sm">{incident.strategy}</p></div>}{incident.followUp && <div><p className="text-xs font-medium text-muted-foreground">Update / Seguimiento</p><p className="text-sm">{incident.followUp}</p></div>}</div>}</CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="size-4" />Comentarios</CardTitle></CardHeader><CardContent className="space-y-4">{incident.comments.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay comentarios.</p> : incident.comments.map(c => <div key={c.id} className="rounded-lg border p-3"><div className="mb-1 flex justify-between gap-2 text-xs text-muted-foreground"><b className="text-foreground">{c.author}</b><span>{formatDateTime(c.createdAt)}</span></div><p className="text-sm">{c.content}</p></div>)}<div className="flex gap-2"><Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Escribe una actualización..." /><Button onClick={send} disabled={!comment.trim()}><Send /></Button></div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Historial</CardTitle></CardHeader><CardContent><IncidentTimeline events={incident.timeline} /></CardContent></Card>
        </div>
        <div className="flex flex-col gap-6">
            <Card><CardHeader><CardTitle className="text-base">Propiedades</CardTitle></CardHeader><CardContent className="space-y-4">
                <div>
                    <p className="mb-1 text-xs text-muted-foreground">Estado</p>

                    <Select
                        value={incident.status}
                        onValueChange={(v) => {
                            if (v) patchStatus(v)
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                            {STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <p className="mb-1 text-xs text-muted-foreground">Prioridad</p>

                    <Select
                        value={incident.priority}
                        onValueChange={(v) => {
                            if (v) patchPriority(v)
                        }}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                            {PRIORITIES.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                    {p.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div><p className="mb-1 text-xs text-muted-foreground">Responsable</p><Select value={incident.assignee ?? "sin_asignar"} onValueChange={v => { const a = v === "sin_asignar" ? null : v; updateIncident(incident.id, { assignee: a, status: a && incident.status === "nueva" ? "asignada" : incident.status }, a ? `Asignada a ${a}` : "Responsable removido"); toast.success("Asignación actualizada") }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sin_asignar">Sin asignar</SelectItem>{techs.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                <Info icon={User} label="Solicitante" value={incident.requester || "No informado"} />{incident.responsibleName ? <Info icon={User} label="Responsable operativo" value={incident.responsibleName} /> : null}{incident.origin ? <Info icon={Tag} label="Origen" value={incident.origin} /> : null}<Info icon={Building2} label="Departamento principal" value={incident.department} />{incident.relatedAreas?.length ? <Info icon={Building2} label="Áreas relacionadas" value={incident.relatedAreas.join(", ")} /> : null}{incident.systemProduct ? <Info icon={Tag} label="Sistema / Producto" value={incident.systemProduct} /> : null}{incident.externalDependency ? <Info icon={Tag} label="Dependencia externa" value={incident.externalProvider || "Sí"} /> : null}<Info icon={Tag} label="Categoría" value={incident.category} /><Info icon={MapPin} label="Ubicación" value={incident.location || "No informada"} /><Info icon={Clock} label="SLA" value={sla.label} />
                <div className="grid gap-1 border-t pt-4 text-xs text-muted-foreground"><span>Creada: {formatDateTime(incident.createdAt)}</span><span>Actualizada: {formatDateTime(incident.updatedAt)}</span></div>
            </CardContent></Card>
            <AiCard incident={incident} />
        </div>
    </div>
}
function Info({ icon: Icon, label, value }: { icon: any, label: string, value: string }) { return <div className="flex items-start gap-2 text-sm"><Icon className="mt-0.5 size-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{label}</p><p>{value}</p></div></div> }
function AiCard({ incident }: { incident: Incident }) { const [show, setShow] = React.useState(false); const suggestion = `El caso parece relacionado con ${incident.category.toLowerCase()}. Revisa primero accesibilidad del servicio, permisos del usuario y eventos recientes. Si el problema persiste, escala al equipo de ${incident.department}.`; return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4" />SIGIA AI</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p className="text-muted-foreground">Análisis asistido basado en reglas locales de demostración.</p><Button variant="outline" className="w-full" onClick={() => setShow(true)}><Sparkles data-icon="inline-start" />Analizar caso</Button>{show && <div className="rounded-lg bg-muted p-3"><p className="font-medium">Sugerencia</p><p className="mt-1 text-muted-foreground">{suggestion}</p><p className="mt-3 text-xs">Confianza estimada: 90%</p></div>}</CardContent></Card> }