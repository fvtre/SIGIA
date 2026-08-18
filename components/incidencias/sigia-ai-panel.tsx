"use client"
import * as React from "react"
import { Sparkles } from "lucide-react"
import type { Incident } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
export function SigiaAiPanel({incident}:{incident:Incident}){const[show,setShow]=React.useState(false);return <Card className="h-full"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4"/>SIGIA AI</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><p className="text-muted-foreground">Asistente de análisis para {incident.id}.</p><Button variant="outline" className="w-full" onClick={()=>setShow(true)}>Analizar incidencia</Button>{show&&<div className="rounded-lg bg-muted p-3"><p className="font-medium">Resumen</p><p className="mt-1 text-muted-foreground">{incident.description}</p><p className="mt-3 font-medium">Sugerencia</p><p className="mt-1 text-muted-foreground">Validar permisos, conectividad y eventos recientes relacionados con {incident.category}. Si continúa, escalar al área {incident.department}.</p></div>}</CardContent></Card>}
