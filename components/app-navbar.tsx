"use client"

import Link from "next/link"
import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  LogOut,
  User,
  Settings,
  TriangleAlert,
  LoaderCircle,
  Clock3,
  UserX,
  CircleAlert,
  ArrowRight,
} from "lucide-react"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { GlobalSearch } from "@/components/global-search"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSigia } from "@/lib/store"
import { supabase } from "@/lib/supabase"

type AlertType =
  | "sla_breached"
  | "sla_warning"
  | "critical"
  | "unassigned"
  | "stagnant"

type SigiaAlert = {
  id: string
  incidentId: string
  type: AlertType
  title: string
  description: string
  department: string
  severity: number
}

export function AppNavbar() {
  const router = useRouter()

  const {
    currentUser,
    incidents,
  } = useSigia()

  const [signingOut, setSigningOut] =
    React.useState(false)
  const [alertsOpen, setAlertsOpen] =
    React.useState(false)

  const initials = (
    currentUser?.name || "Usuario"
  )
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  /* =========================================================
     CENTRO DE ALERTAS
  ========================================================= */

  const alerts = React.useMemo<SigiaAlert[]>(() => {
    const now = Date.now()

    const result: SigiaAlert[] = []

    incidents.forEach((incident) => {
      const closed = [
        "resuelta",
        "cerrada",
      ].includes(incident.status)

      if (closed) return

      /* SLA VENCIDO */

      if (incident.slaBreached) {
        result.push({
          id: `${incident.id}-sla-breached`,
          incidentId: incident.id,
          type: "sla_breached",
          title: `SLA vencido · ${incident.id}`,
          description: incident.title,
          department:
            incident.department || "Sin área",
          severity: 100,
        })

        return
      }

      /* SLA POR VENCER */

      if (incident.slaDueAt) {
        const due = new Date(
          incident.slaDueAt
        ).getTime()

        if (!Number.isNaN(due)) {
          const hours =
            (due - now) /
            (1000 * 60 * 60)

          if (
            hours > 0 &&
            hours <= 4
          ) {
            result.push({
              id: `${incident.id}-sla-warning`,
              incidentId: incident.id,
              type: "sla_warning",
              title: `SLA por vencer · ${incident.id}`,
              description: incident.title,
              department:
                incident.department ||
                "Sin área",
              severity: 80,
            })
          }
        }
      }

      /* CRÍTICA */

      if (
        incident.priority ===
        "critica"
      ) {
        result.push({
          id: `${incident.id}-critical`,
          incidentId: incident.id,
          type: "critical",
          title: `Incidencia crítica · ${incident.id}`,
          description: incident.title,
          department:
            incident.department ||
            "Sin área",
          severity: 90,
        })
      }

      /* SIN RESPONSABLE */

      if (
        !incident.responsibleName &&
        !incident.assignee
      ) {
        result.push({
          id: `${incident.id}-unassigned`,
          incidentId: incident.id,
          type: "unassigned",
          title: `Sin responsable · ${incident.id}`,
          description: incident.title,
          department:
            incident.department ||
            "Sin área",
          severity: 60,
        })
      }

      /* ESTANCADA */

      if (incident.updatedAt) {
        const updated = new Date(
          incident.updatedAt
        ).getTime()

        if (!Number.isNaN(updated)) {
          const hours =
            (now - updated) /
            (1000 * 60 * 60)

          if (hours >= 48) {
            result.push({
              id: `${incident.id}-stagnant`,
              incidentId: incident.id,
              type: "stagnant",
              title: `Sin actividad · ${incident.id}`,
              description:
                incident.title,
              department:
                incident.department ||
                "Sin área",
              severity: 40,
            })
          }
        }
      }
    })

    return result.sort(
      (a, b) =>
        b.severity - a.severity
    )
  }, [incidents])

  const visibleAlerts =
    alerts.slice(0, 7)

  const criticalAlerts =
    alerts.filter(
      (alert) =>
        alert.type ===
          "sla_breached" ||
        alert.type === "critical"
    ).length

  /* =========================================================
     ICONO SEGÚN ALERTA
  ========================================================= */

  function AlertIcon({
    type,
  }: {
    type: AlertType
  }) {
    if (
      type === "sla_breached"
    ) {
      return (
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-priority-critical" />
      )
    }

    if (
      type === "sla_warning"
    ) {
      return (
        <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-500" />
      )
    }

    if (type === "critical") {
      return (
        <CircleAlert className="mt-0.5 size-4 shrink-0 text-priority-critical" />
      )
    }

    if (
      type === "unassigned"
    ) {
      return (
        <UserX className="mt-0.5 size-4 shrink-0 text-orange-500" />
      )
    }

    return (
      <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
    )
  }

  /* =========================================================
     LOGOUT
  ========================================================= */

  const signOut = async () => {
    if (signingOut) return

    setSigningOut(true)

    try {
      const { error } =
        await supabase.auth.signOut({
          scope: "local",
        })

      if (error) throw error

      window.location.assign("/")
    } catch (error) {
      console.error(
        "Error al cerrar sesión",
        error
      )

      setSigningOut(false)
    }
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md sm:px-4">

      <SidebarTrigger className="text-muted-foreground" />

      <Separator
        orientation="vertical"
        className="mr-1 hidden h-6 sm:block"
      />

      {/* BUSCADOR */}

      <div className="flex flex-1 items-center">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-0.5">

        <ThemeToggle />

        {/* CERRAR SESIÓN DESKTOP */}

        <Button
          variant="ghost"
          className="hidden gap-2 md:flex"
          disabled={signingOut}
          onClick={signOut}
        >
          {signingOut ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <LogOut />
          )}

          <span>
            {signingOut
              ? "Cerrando..."
              : "Cerrar sesión"}
          </span>
        </Button>

        {/* =====================================================
            CENTRO DE ALERTAS
        ===================================================== */}

        <DropdownMenu
          open={alertsOpen}
          onOpenChange={setAlertsOpen}
        >
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Centro de alertas"
                className="relative"
              >
                <Bell />

                {alerts.length > 0 && (
                  <>
                    {/* PULSO */}

                    <span className="absolute right-1 top-1 size-2.5 animate-ping rounded-full bg-priority-critical opacity-40" />

                    <span className="absolute right-1 top-1 size-2.5 rounded-full bg-priority-critical ring-2 ring-background" />

                    {/* CONTADOR */}

                    <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-priority-critical px-1 text-[9px] font-bold leading-4 text-white">
                      {alerts.length > 99
                        ? "99+"
                        : alerts.length}
                    </span>
                  </>
                )}
              </Button>
            }
          />

          <DropdownMenuContent
            align="end"
            className="w-[360px] p-0"
          >

            {/* HEADER */}

            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-semibold">
                  Centro de Alertas
                </p>

                <p className="text-xs text-muted-foreground">
                  Situaciones que requieren atención
                </p>
              </div>

              <div className="flex items-center gap-2">
                {criticalAlerts >
                  0 && (
                  <span className="rounded-full bg-priority-critical/10 px-2 py-1 text-[10px] font-semibold text-priority-critical">
                    {
                      criticalAlerts
                    }{" "}
                    críticas
                  </span>
                )}

                <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                  {
                    alerts.length
                  }{" "}
                  activas
                </span>
              </div>
            </div>

            <DropdownMenuSeparator className="m-0" />

            {/* ALERTAS */}

            <DropdownMenuGroup className="max-h-[430px] overflow-y-auto p-1">

              {visibleAlerts.map(
                (alert) => (
                  <DropdownMenuItem
                    key={alert.id}
                    className="cursor-pointer items-start gap-3 rounded-lg px-3 py-3"
                    onClick={() => {
                      setAlertsOpen(false)
                      router.push(
                        `/incidencias/${alert.incidentId}`
                      )
                    }}
                  >
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <AlertIcon
                        type={
                          alert.type
                        }
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">

                        <span className="truncate text-sm font-medium leading-tight">
                          {
                            alert.title
                          }
                        </span>

                        {alert.severity >=
                          90 && (
                          <span className="size-2 shrink-0 rounded-full bg-priority-critical" />
                        )}
                      </div>

                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {
                          alert.description
                        }
                      </p>

                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {
                          alert.department
                        }
                      </p>
                    </div>
                  </DropdownMenuItem>
                )
              )}

              {alerts.length ===
                0 && (
                <div className="flex flex-col items-center justify-center px-4 py-10 text-center">

                  <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-success/10">
                    <Bell className="size-5 text-success" />
                  </div>

                  <p className="text-sm font-medium">
                    Todo bajo control
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    No hay alertas
                    activas en este
                    momento.
                  </p>
                </div>
              )}
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="m-0" />

            {/* VER TODAS */}

            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => {
                  setAlertsOpen(false)
                  router.push("/alertas")
                }}
              >
                Ver Centro de Alertas

                <ArrowRight className="size-4" />
              </Button>
            </div>

          </DropdownMenuContent>
        </DropdownMenu>

        {/* =====================================================
            PERFIL
        ===================================================== */}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="ml-1 h-9 gap-2 px-1.5 sm:px-2"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                  {initials}
                </span>

                <span className="hidden text-sm font-medium sm:inline">
                  {currentUser?.name ||
                    "Usuario"}
                </span>
              </Button>
            }
          />

          <DropdownMenuContent
            align="end"
            className="w-56"
          >
            <DropdownMenuLabel>
              <div className="flex flex-col">

                <span className="text-sm font-medium">
                  {currentUser?.name ||
                    "Usuario"}
                </span>

                <span className="text-xs font-normal text-muted-foreground">
                  {currentUser?.email ||
                    ""}
                </span>

              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>

              <DropdownMenuItem
                render={
                  <Link href="/mis-asignaciones" />
                }
              >
                <User />
                Mi perfil
              </DropdownMenuItem>

              <DropdownMenuItem
                render={
                  <Link href="/configuracion" />
                }
              >
                <Settings />
                Configuración
              </DropdownMenuItem>

            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              disabled={signingOut}
              onClick={signOut}
              variant="destructive"
            >
              {signingOut ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <LogOut />
              )}

              {signingOut
                ? "Cerrando sesión..."
                : "Cerrar sesión"}
            </DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  )
}
