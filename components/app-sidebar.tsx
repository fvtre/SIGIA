"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  ClipboardList,
  BookOpen,
  BarChart3,
  Timer,
  Users,
  Settings,
  ShieldCheck,
  Database,
  FolderKanban,
  GanttChartSquare,
  History,
  Bell,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useSigia } from "@/lib/store"

const mainNav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Incidencias", href: "/incidencias", icon: Ticket, badge: undefined },
  { title: "Nueva incidencia", href: "/incidencias/nueva", icon: PlusCircle },
  { title: "Mis asignaciones", href: "/mis-asignaciones", icon: ClipboardList, badge: undefined },
  { title: "Centro de Alertas", href: "/alertas", icon: Bell },
]

const projectsNav = [
  { title: "Proyectos", href: "/proyectos", icon: FolderKanban },
  { title: "Gantt", href: "/proyectos/gantt", icon: GanttChartSquare },
]

const knowledgeNav = [
  { title: "Base de conocimiento", href: "/base-conocimiento", icon: BookOpen },
  { title: "Reportes", href: "/reportes", icon: BarChart3 },
  { title: "SLA", href: "/sla", icon: Timer },
]

const adminNav = [
  { title: "Usuarios", href: "/usuarios", icon: Users },
  { title: "Importar datos", href: "/importar", icon: Database },
  { title: "Auditoría", href: "/auditoria", icon: History },
  { title: "Configuración", href: "/configuracion", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { currentUser, incidents } = useSigia()
  const initials = (currentUser?.name || "Usuario").split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase()

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href)

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">SIGIA</span>
            <span className="text-[11px] text-muted-foreground">Gestión de Incidencias</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                    render={
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    }
                  />
                  {item.badge ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Gestión de Proyectos</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {projectsNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                    render={
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Conocimiento & análisis</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {knowledgeNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                    render={
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Administración</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    tooltip={item.title}
                    render={
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
            {initials}
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-medium">{currentUser?.name || "Usuario"}</span>
            <span className="truncate text-xs text-muted-foreground">{currentUser?.role || "usuario"}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
