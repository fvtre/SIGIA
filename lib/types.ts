export type Priority = "critica" | "alta" | "media" | "baja"

export type Status = "nueva" | "asignada" | "en_progreso" | "en_espera" | "resuelta" | "cerrada"

export type Role = "administrador" | "supervisor" | "tecnico" | "usuario"

export type Category = string
export type Department = string

export interface Comment {
  id: string
  author: string
  role: Role
  content: string
  createdAt: string
}

export interface TimelineEvent {
  id: string
  type: "creada" | "asignada" | "estado" | "comentario" | "sla" | "resuelta"
  description: string
  author: string
  createdAt: string
}

export interface Incident {
  id: string
  title: string
  description: string
  requester: string
  origin?: string
  reason?: string
  strategy?: string
  followUp?: string
  department: Department
  relatedAreas?: Department[]
  systemProduct?: string | null
  responsibleName?: string | null
  externalDependency?: boolean
  externalProvider?: string | null
  category: Category
  priority: Priority
  status: Status
  assignee: string | null
  location: string
  createdAt: string
  updatedAt: string
  slaDueAt: string
  slaBreached: boolean
  attachments: { name: string; size: string; type: string }[]
  comments: Comment[]
  timeline: TimelineEvent[]
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  department: Department
  status: "activo" | "inactivo"
  lastActive: string
  assignedCount: number
}

export interface KbArticle {
  id: string
  title: string
  category: Category

  problem: string
  symptoms: string
  causes: string
  procedure: string
  validation: string
  notes: string

  authorId: string | null
  authorName?: string

  published: boolean
  views: number

  createdAt: string
  updatedAt: string
}

export const PRIORITIES: { value: Priority; label: string; token: string }[] = [
  { value: "critica", label: "Crítica", token: "priority-critical" },
  { value: "alta", label: "Alta", token: "priority-high" },
  { value: "media", label: "Media", token: "priority-medium" },
  { value: "baja", label: "Baja", token: "priority-low" },
]

export const STATUSES: { value: Status; label: string }[] = [
  { value: "nueva", label: "Nueva" },
  { value: "asignada", label: "Asignada" },
  { value: "en_progreso", label: "En progreso" },
  { value: "en_espera", label: "En espera" },
  { value: "resuelta", label: "Resuelta" },
  { value: "cerrada", label: "Cerrada" },
]

export const CATEGORIES: Category[] = [
  "Agendamiento", "Impresoras", "Red / Conectividad", "Worklist / Exámenes",
  "Caja", "Tótem", "Bono Electrónico", "Infraestructura", "App Mi MaipoSalud",
  "PACS / Worklist", "Laboratorio", "Integraciones", "Usuarios / Accesos", "Otro"
]

export const ORIGINS = ["Operación", "Actualización", "Histórico", "Recurrente", "Requerimiento", "Otro"] as const

export const DEPARTMENTS: Department[] = [
  "GTI",
  "Alma",
  "Integraciones",
  "Operaciones",
  "Comercial",
  "Finanzas",
  "Recursos Humanos",
  "Clínica",
  "PACS",
  "Otro",
]

export const SYSTEM_PRODUCTS = ["Alma", "Mobius", "Fonasa", "IMED", "App Mi MaipoSalud", "PACS", "CodePACS", "Otro"] as const

export const RESPONSIBLES = ["Nelson Romero", "Hugo Rivera", "Javier Juárez"] as const

export function suggestedResponsible(systemProduct?: string | null, department?: string) {
  if (systemProduct === "Mobius") return "Javier Juárez"
  if (systemProduct === "Alma") return "Hugo Rivera"
  if (department === "GTI") return "Nelson Romero"
  return null
}

export const ROLES: { value: Role; label: string }[] = [
  { value: "administrador", label: "Administrador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "tecnico", label: "Técnico" },
  { value: "usuario", label: "Usuario" },
]

export function priorityLabel(p: Priority) {
  return PRIORITIES.find((x) => x.value === p)?.label ?? p
}

export function statusLabel(s: Status) {
  return STATUSES.find((x) => x.value === s)?.label ?? s
}

export function roleLabel(r: Role) {
  return ROLES.find((x) => x.value === r)?.label ?? r
}
