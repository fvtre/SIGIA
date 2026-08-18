"use client"

import * as React from "react"
import { supabase } from "@/lib/supabase"
import type { Incident, User, KbArticle, Status, Priority, Role, Category } from "@/lib/types"

type NewIncident = Pick<Incident, "title" | "description" | "requester" | "department" | "category" | "priority" | "location"> & { assignee?: string | null; relatedAreas?: string[]; systemProduct?: string | null; origin?: string; reason?: string; strategy?: string; followUp?: string; status?: Status; occurredAt?: string; responsibleName?: string | null; externalDependency?: boolean; externalProvider?: string | null }
type Store = {
  incidents: Incident[]
  users: User[]
  articles: KbArticle[]
  loading: boolean
  currentUser: User | null

  refresh: () => Promise<void>

  // Incidencias
  addIncident: (data: NewIncident) => Promise<Incident>
  updateIncident: (
    id: string,
    patch: Partial<Incident>,
    note?: string
  ) => Promise<void>
  deleteIncident: (id: string) => Promise<void>
  addComment: (id: string, content: string) => Promise<void>

  // Usuarios
  addUser: (
    user: Omit<User, "id" | "lastActive" | "assignedCount">
  ) => Promise<void>

  updateUser: (
    id: string,
    patch: {
      role?: Role
      department?: string
      active?: boolean
    }
  ) => Promise<void>

  // Base de conocimiento
  addArticle: (
    data: Omit<
      KbArticle,
      "id" | "authorId" | "authorName" | "views" | "createdAt" | "updatedAt"
    >
  ) => Promise<void>

  updateArticle: (
    id: string,
    patch: Partial<KbArticle>
  ) => Promise<void>

  deleteArticle: (id: string) => Promise<void>

  resetDemo: () => void
}
const Ctx = React.createContext<Store | null>(null)

function mapIncident(r: any, comments: any[] = [], history: any[] = []): Incident {
  const due = r.sla_due_at || new Date(new Date(r.occurred_at || r.created_at).getTime() + 24 * 3600000).toISOString()
  return {
    id: r.code, title: r.title, description: r.description || r.title, requester: r.requester_name || "No informado", origin: r.origin || "", reason: r.reason || "", strategy: r.strategy || "", followUp: r.follow_up || "",
    department: (r.department || "Sin departamento") as any, relatedAreas: r.related_areas || [], systemProduct: r.system_product || null, responsibleName: r.responsible_name || null, externalDependency: !!r.external_dependency, externalProvider: r.external_provider || null, category: (r.module || "Sin categoría") as any,
    priority: r.priority, status: r.status, assignee: r.assignee?.full_name || null, location: r.location || "", createdAt: r.occurred_at || r.created_at,
    updatedAt: r.updated_at, slaDueAt: due, slaBreached: !!r.sla_due_at && new Date(r.sla_due_at) < new Date() && !["resuelta", "cerrada"].includes(r.status), attachments: [],
    comments: comments.filter(c => c.incident_id === r.id).map(c => ({ id: c.id, author: c.author?.full_name || "Usuario", role: (c.author?.role || "usuario") as Role, content: c.body, createdAt: c.created_at })),
    timeline: history.filter(h => h.incident_id === r.id).map(h => ({ id: h.id, type: "estado" as const, description: h.action, author: h.actor?.full_name || "SIGIA", createdAt: h.created_at }))
  }
}
function mapUser(p: any): User { return { id: p.id, name: p.full_name || p.email || "Usuario", email: p.email || "", role: p.role, department: (p.department || "GTI") as any, status: p.active ? "activo" : "inactivo", lastActive: p.updated_at || p.created_at, assignedCount: 0 } }

export function SigiaProvider({ children }: { children: React.ReactNode }) {
  const [incidents, setIncidents] = React.useState<Incident[]>([]); const [users, setUsers] = React.useState<User[]>([]); const [articles, setArticles] = React.useState<KbArticle[]>([]); const [loading, setLoading] = React.useState(true); const [currentUser, setCurrentUser] = React.useState<User | null>(null)
  const refresh = React.useCallback(async () => {
    setLoading(true); try {
      const { data: { user } } = await supabase.auth.getUser(); if (!user) { setIncidents([]); setUsers([]); setArticles([]); setCurrentUser(null); return }
      const [{ data: rows, error: e1 }, { data: profiles, error: e2 }, { data: comments }, { data: history }, { data: kb }] = await Promise.all([
        supabase.from("incidents").select("*,assignee:profiles!incidents_assigned_to_fkey(full_name)").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*"),
        supabase.from("incident_comments").select("*,author:profiles!incident_comments_author_id_fkey(full_name,role)"),
        supabase.from("incident_history").select("*,actor:profiles!incident_history_actor_id_fkey(full_name)"),
        supabase
          .from("knowledge_articles")
          .select("*,author:profiles!knowledge_articles_author_id_fkey(full_name)")
          .order("updated_at", { ascending: false })
      ]); if (e1) throw e1; if (e2) throw e2;

      const us = (profiles || []).map(mapUser); setUsers(us); const me = us.find(x => x.id === user.id) || null; if (me) me.email = user.email || me.email; setCurrentUser(me); setIncidents((rows || []).map(r => mapIncident(r, comments || [], history || [])));
      setArticles((kb || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        category: (a.category || "Otro") as Category,

        problem: a.problem || "",
        symptoms: a.symptoms || "",
        causes: a.causes || "",
        procedure: a.procedure || "",
        validation: a.validation || "",
        notes: a.notes || "",

        authorId: a.author_id || null,
        authorName: a.author?.full_name || "SIGIA",

        published: !!a.published,
        views: a.views || 0,

        createdAt: a.created_at,
        updatedAt: a.updated_at,
      })))
    } finally { setLoading(false) }
  }, [])
  React.useEffect(() => {
    refresh()
    const { data: authData } = supabase.auth.onAuthStateChange(() => refresh())
    const realtime = supabase
      .channel("sigia-incidents-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "incidents",
        },
        (payload) => {
          console.log("⚡ REALTIME INCIDENT:", payload)
          refresh()
        }
      )
      .subscribe((status) => {
        console.log("📡 REALTIME STATUS:", status)
      })
    return () => { authData.subscription.unsubscribe(); supabase.removeChannel(realtime) }
  }, [refresh])
  const addIncident = React.useCallback(async (data: NewIncident) => { const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Sesión no válida"); let assignedId: string | null = null; if (data.assignee) assignedId = users.find(u => u.name === data.assignee)?.id || null; const hours = data.priority === "critica" ? 4 : data.priority === "alta" ? 8 : data.priority === "media" ? 24 : 72; const now = new Date(); const payload = { module: data.category, title: data.title, description: data.description, origin: data.origin || "Operación", occurred_at: data.occurredAt || now.toISOString(), reason: data.reason || null, strategy: data.strategy || null, follow_up: data.followUp || null, department: data.department, related_areas: data.relatedAreas || [], system_product: data.systemProduct || null, responsible_name: data.responsibleName || null, external_dependency: !!data.externalDependency, external_provider: data.externalProvider || null, priority: data.priority, status: data.status || (assignedId ? "asignada" : "nueva"), assigned_to: assignedId, requester_name: data.requester || null, location: data.location, sla_due_at: new Date(now.getTime() + hours * 3600000).toISOString(), source: "sigia", created_by: user.id }; const { data: row, error } = await supabase.from("incidents").insert(payload).select().single(); if (error) throw error; await supabase.from("incident_history").insert({ incident_id: row.id, actor_id: user.id, action: `Incidencia ${row.code} creada` }); await refresh(); return mapIncident(row) }, [users, refresh])
  const updateIncident = React.useCallback(async (id: string, patch: Partial<Incident>, note?: string) => { const row = incidents.find(i => i.id === id); if (!row) return; const { data: db } = await supabase.from("incidents").select("id").eq("code", id).single(); if (!db) return; const p: any = {}; if (patch.status) p.status = patch.status; if (patch.priority) p.priority = patch.priority; if ("assignee" in patch) p.assigned_to = patch.assignee ? users.find(u => u.name === patch.assignee)?.id || null : null; if (patch.title) p.title = patch.title; if (patch.description !== undefined) p.description = patch.description; if (patch.department !== undefined) p.department = patch.department; if (patch.relatedAreas !== undefined) p.related_areas = patch.relatedAreas; if (patch.systemProduct !== undefined) p.system_product = patch.systemProduct; if (patch.responsibleName !== undefined) p.responsible_name = patch.responsibleName; if (patch.externalDependency !== undefined) p.external_dependency = patch.externalDependency; if (patch.externalProvider !== undefined) p.external_provider = patch.externalProvider; if (patch.category !== undefined) p.module = patch.category; if (patch.origin !== undefined) p.origin = patch.origin; if (patch.reason !== undefined) p.reason = patch.reason; if (patch.strategy !== undefined) p.strategy = patch.strategy; if (patch.followUp !== undefined) p.follow_up = patch.followUp; if (patch.requester !== undefined) p.requester_name = patch.requester; if (patch.location !== undefined) p.location = patch.location; const { error } = await supabase.from("incidents").update(p).eq("id", db.id); if (error) throw error; if (note) { const { data: { user } } = await supabase.auth.getUser(); if (user) await supabase.from("incident_history").insert({ incident_id: db.id, actor_id: user.id, action: note }) } await refresh() }, [incidents, users, refresh])

  const deleteIncident = React.useCallback(async (id: string) => { const { data: db, error: findError } = await supabase.from("incidents").select("id").eq("code", id).single(); if (findError) throw findError; const { error } = await supabase.from("incidents").delete().eq("id", db.id); if (error) throw error; await refresh() }, [refresh])
  const addComment = React.useCallback(async (id: string, content: string) => { const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Sesión no válida"); const { data: db } = await supabase.from("incidents").select("id").eq("code", id).single(); if (!db) return; const { error } = await supabase.from("incident_comments").insert({ incident_id: db.id, author_id: user.id, body: content }); if (error) throw error; await refresh() }, [refresh])
  const addUser = React.useCallback(async () => { throw new Error("Por seguridad, la cuenta debe registrarse desde la pantalla de acceso") }, [])
  const updateUser = React.useCallback(async (id: string, patch: { role?: Role; department?: string; active?: boolean }) => { const p: any = {}; if (patch.role) p.role = patch.role; if (patch.department !== undefined) p.department = patch.department; if (patch.active !== undefined) p.active = patch.active; const { error } = await supabase.from("profiles").update(p).eq("id", id); if (error) throw error; await refresh() }, [refresh])
  const addArticle = React.useCallback(
    async (
      data: Omit<
        KbArticle,
        "id" | "authorId" | "authorName" | "views" | "createdAt" | "updatedAt"
      >
    ) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error("Sesión no válida")

      const { error } = await supabase
        .from("knowledge_articles")
        .insert({
          title: data.title,
          category: data.category,
          problem: data.problem,
          symptoms: data.symptoms,
          causes: data.causes,
          procedure: data.procedure,
          validation: data.validation,
          notes: data.notes,
          published: data.published,
          author_id: user.id,
        })

      if (error) throw error

      await refresh()
    },
    [refresh]
  )
  const updateArticle = React.useCallback(
    async (id: string, patch: Partial<KbArticle>) => {
      const data: any = {}

      if (patch.title !== undefined) data.title = patch.title
      if (patch.category !== undefined) data.category = patch.category
      if (patch.problem !== undefined) data.problem = patch.problem
      if (patch.symptoms !== undefined) data.symptoms = patch.symptoms
      if (patch.causes !== undefined) data.causes = patch.causes
      if (patch.procedure !== undefined) data.procedure = patch.procedure
      if (patch.validation !== undefined) data.validation = patch.validation
      if (patch.notes !== undefined) data.notes = patch.notes
      if (patch.published !== undefined) data.published = patch.published

      const { error } = await supabase
        .from("knowledge_articles")
        .update(data)
        .eq("id", id)

      if (error) throw error

      await refresh()
    },
    [refresh]
  )
  const deleteArticle = React.useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("knowledge_articles")
        .delete()
        .eq("id", id)

      if (error) throw error

      await refresh()
    },
    [refresh]
  )

  return (
    <Ctx.Provider
      value={{
        incidents,
        users,
        articles,
        loading,
        currentUser,

        refresh,

        addIncident,
        updateIncident,
        deleteIncident,
        addComment,

        addUser,
        updateUser,

        addArticle,
        updateArticle,
        deleteArticle,

        resetDemo: () => { },
      }}
    >
      {children}
    </Ctx.Provider>
  )
}
export function useSigia() { const v = React.useContext(Ctx); if (!v) throw new Error("useSigia debe usarse dentro de SigiaProvider"); return v }
