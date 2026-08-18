"use client"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useSigia } from "@/lib/store"
import { IncidentDetail } from "@/components/incidencias/incident-detail"
import { Button } from "@/components/ui/button"
export default function IncidentPage(){const {id}=useParams<{id:string}>(); const {incidents}=useSigia(); const incident=incidents.find(i=>i.id===decodeURIComponent(id)); if(!incident)return <div className="py-20 text-center"><h1 className="text-xl font-semibold">Incidencia no encontrada</h1><Button nativeButton={false} className="mt-4" render={<Link href="/incidencias"/>}>Volver</Button></div>; return <div className="flex flex-col gap-5"><Button nativeButton={false} variant="ghost" className="w-fit" render={<Link href="/incidencias"/>}><ArrowLeft data-icon="inline-start"/>Incidencias</Button><IncidentDetail incident={incident}/></div>}
