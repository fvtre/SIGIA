export function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })
}

export function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function relativeTime(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.round(hours / 24)
  return `hace ${days} d`
}

/** Returns SLA remaining as a friendly string and a state flag. */
export function slaRemaining(dueIso: string, breached: boolean) {
  const due = new Date(dueIso)
  const diff = due.getTime() - Date.now()
  const absMins = Math.abs(Math.round(diff / 60000))
  const h = Math.floor(absMins / 60)
  const m = absMins % 60
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`

  if (breached || diff < 0) {
    return { label: `Vencido hace ${label}`, state: "breached" as const }
  }
  if (diff < 2 * 60 * 60 * 1000) {
    return { label: `Vence en ${label}`, state: "warning" as const }
  }
  return { label: `Vence en ${label}`, state: "ok" as const }
}
