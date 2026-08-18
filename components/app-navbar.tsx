"use client"

import Link from "next/link"
import * as React from "react"
import { useRouter } from "next/navigation"
import { Bell, LogOut, User, Settings, TriangleAlert, LoaderCircle } from "lucide-react"

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

export function AppNavbar() {
  const router = useRouter()
  const { currentUser, incidents } = useSigia()
  const [signingOut,setSigningOut]=React.useState(false)
  const notifications = incidents.filter(i=>!["resuelta","cerrada"].includes(i.status) && (i.slaBreached || i.priority==="critica")).slice(0,5)
  const initials=(currentUser?.name||"Usuario").split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md sm:px-4">
      <SidebarTrigger className="text-muted-foreground" />
      <Separator orientation="vertical" className="mr-1 hidden h-6 sm:block" />

      <div className="flex flex-1 items-center">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-0.5">
        <ThemeToggle />
        <Button variant="ghost" className="hidden gap-2 md:flex" disabled={signingOut} onClick={async()=>{if(signingOut)return;setSigningOut(true);try{await supabase.auth.signOut({scope:"local"});window.location.href="/"}catch(e){console.error(e);setSigningOut(false)}}}>
          {signingOut?<LoaderCircle className="animate-spin"/>:<LogOut/>}<span>{signingOut?"Cerrando...":"Cerrar sesión"}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Notificaciones" className="relative">
                <Bell />
                {notifications.length>0&&<span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-priority-critical ring-2 ring-background" />}
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-semibold">Notificaciones</span>
              <span className="rounded-full bg-primary/12 px-1.5 text-xs font-medium text-primary">{notifications.length} activas</span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {notifications.map((n) => (
                <DropdownMenuItem key={n.id} className="items-start gap-2.5 py-2" onClick={()=>router.push(`/incidencias/${n.id}`)}>
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-priority-critical" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium leading-tight">{n.slaBreached?`SLA vencido · ${n.id}`:`Prioridad crítica · ${n.id}`}</span>
                    <span className="text-xs text-muted-foreground">{n.title}</span>
                    <span className="text-[11px] text-muted-foreground">{n.department}</span>
                  </div>
                </DropdownMenuItem>
              ))}
              {notifications.length===0&&<DropdownMenuItem disabled>Sin alertas activas</DropdownMenuItem>}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/incidencias")}
              className="justify-center text-sm font-medium text-primary"
            >
              Ver todas
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="ml-1 h-9 gap-2 px-1.5 sm:px-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                  {initials}
                </span>
                <span className="hidden text-sm font-medium sm:inline">{currentUser?.name||"Usuario"}</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{currentUser?.name||"Usuario"}</span>
                <span className="text-xs font-normal text-muted-foreground">{currentUser?.email||""}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/mis-asignaciones" />}>
                <User />
                Mi perfil
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/configuracion" />}>
                <Settings />
                Configuración
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={signingOut} onClick={async () => {
              if(signingOut)return; setSigningOut(true);
              try {
                const { error } = await supabase.auth.signOut({ scope: "local" });
                if(error) throw error;
                window.location.assign("/");
              } catch (e) {
                console.error("Error al cerrar sesión",e);
                setSigningOut(false);
              }
            }} variant="destructive">
              {signingOut ? <LoaderCircle className="animate-spin"/> : <LogOut />}
              {signingOut ? "Cerrando sesión..." : "Cerrar sesión"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
