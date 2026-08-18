import { PageHeader } from "@/components/page-header"
import { IncidentsView } from "@/components/incidencias/incidents-view"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"
import Link from "next/link"

export default function IncidenciasPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Incidencias"
        description="Gestiona y da seguimiento a todas las incidencias reportadas."
      >
        <Button nativeButton={false} render={<Link href="/incidencias/nueva" />}>
          <PlusIcon data-icon="inline-start" />
          Nueva incidencia
        </Button>
      </PageHeader>
      <IncidentsView />
    </div>
  )
}
