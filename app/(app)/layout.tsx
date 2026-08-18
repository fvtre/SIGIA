import type { ReactNode } from "react"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AppNavbar } from "@/components/app-navbar"
import { SigiaProvider } from "@/lib/store"
import { AuthGuard } from "@/components/auth-guard"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard><SigiaProvider>
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppNavbar />
        <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
    </SigiaProvider></AuthGuard>
  )
}
