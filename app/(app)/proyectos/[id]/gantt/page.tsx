"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CalendarDays, ChevronDown, ChevronRight, CornerDownRight, Diamond, ZoomIn, ZoomOut } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type Project = { id:string; code:string; name:string; start_date:string|null; due_date:string|null; progress:number }
type Task = { id:string; parent_task_id:string|null; code:string; title:string; status:string; start_date:string|null; due_date:string|null; progress:number; responsible_name:string|null; blocker:string|null; is_milestone:boolean; sort_order:number }
type VTask = Task & { depth:number; hasChildren:boolean }

const DAY=86400000, ROW=52, LEFT=360
function pd(v:string){const [y,m,d]=v.split("-").map(Number);return new Date(y,m-1,d,12)}
function iso(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function add(d:Date,n:number){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function diff(a:Date,b:Date){return Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/DAY)}
function fmt(v:string|null){return v?new Intl.DateTimeFormat("es-CL",{day:"2-digit",month:"2-digit",year:"numeric"}).format(pd(v)):"Sin fecha"}

export default function ProyectoGanttPage(){
 const params=useParams<{id:string}>(), router=useRouter()
 const [project,setProject]=React.useState<Project|null>(null), [tasks,setTasks]=React.useState<Task[]>([])
 const [collapsed,setCollapsed]=React.useState<Set<string>>(new Set()), [loading,setLoading]=React.useState(true), [dayWidth,setDayWidth]=React.useState(42)

 const load=React.useCallback(async()=>{if(!params.id)return;setLoading(true);try{
  const [{data:p,error:pe},{data:t,error:te}]=await Promise.all([
   supabase.from("projects").select("id,code,name,start_date,due_date,progress").eq("id",params.id).single(),
   supabase.from("project_tasks").select("id,parent_task_id,code,title,status,start_date,due_date,progress,responsible_name,blocker,is_milestone,sort_order").eq("project_id",params.id).order("sort_order",{ascending:true}).order("code",{ascending:true})
  ])
  if(pe)throw pe;if(te)throw te;setProject(p as Project);setTasks((t||[]) as Task[])
 }catch(e:any){console.error(e);toast.error(e?.message||"No se pudo cargar el Gantt.")}finally{setLoading(false)}},[params.id])

 React.useEffect(()=>{load();const c=supabase.channel(`sigia-gantt-${params.id}`)
 .on("postgres_changes",{event:"*",schema:"public",table:"project_tasks",filter:`project_id=eq.${params.id}`},()=>load())
 .on("postgres_changes",{event:"*",schema:"public",table:"projects",filter:`id=eq.${params.id}`},()=>load()).subscribe()
 return()=>{supabase.removeChannel(c)}},[params.id,load])

 const byId=React.useMemo(()=>new Map(tasks.map(t=>[t.id,t])),[tasks])
 const children=React.useMemo(()=>{const m=new Map<string,Task[]>();for(const t of tasks){if(!t.parent_task_id)continue;const a=m.get(t.parent_task_id)||[];a.push(t);m.set(t.parent_task_id,a)}return m},[tasks])
 const visible=React.useMemo<VTask[]>(()=>{const out:VTask[]=[],seen=new Set<string>();const sort=(a:Task[])=>[...a].sort((x,y)=>(x.sort_order??0)-(y.sort_order??0)||x.code.localeCompare(y.code,"es",{numeric:true}))
  const visit=(t:Task,d:number)=>{if(seen.has(t.id))return;seen.add(t.id);const ch=sort(children.get(t.id)||[]);out.push({...t,depth:d,hasChildren:ch.length>0});if(!collapsed.has(t.id))ch.forEach(x=>visit(x,d+1))}
  sort(tasks).filter(t=>!t.parent_task_id||!byId.has(t.parent_task_id)).forEach(t=>visit(t,0));sort(tasks).filter(t=>!seen.has(t.id)).forEach(t=>visit(t,0));return out
 },[tasks,children,collapsed,byId])

 const dated=tasks.filter(t=>t.start_date||t.due_date)
 const range=React.useMemo(()=>{const a:Date[]=[];if(project?.start_date)a.push(pd(project.start_date));if(project?.due_date)a.push(pd(project.due_date));dated.forEach(t=>{if(t.start_date)a.push(pd(t.start_date));if(t.due_date)a.push(pd(t.due_date))});const now=new Date();now.setHours(12,0,0,0);if(!a.length)return{start:add(now,-3),end:add(now,14)};return{start:add(new Date(Math.min(...a.map(x=>x.getTime()))),-2),end:add(new Date(Math.max(...a.map(x=>x.getTime()))),3)}},[project,tasks])
 const days=React.useMemo(()=>Array.from({length:Math.max(1,diff(range.start,range.end)+1)},(_,i)=>add(range.start,i)),[range])
 const width=days.length*dayWidth, today=iso(new Date()), ti=days.findIndex(d=>iso(d)===today)
 const toggle=(id:string)=>setCollapsed(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n})

 if(loading)return <Card><CardContent className="py-16 text-center text-muted-foreground">Cargando Gantt...</CardContent></Card>
 if(!project)return <Card><CardContent className="py-16 text-center">Proyecto no encontrado.</CardContent></Card>

 return <TooltipProvider><div className="space-y-6">
  <Button variant="ghost" onClick={()=>router.push(`/proyectos/${project.id}`)}><ArrowLeft className="mr-2 size-4"/>Volver al proyecto</Button>
  <div className="flex flex-wrap items-end justify-between gap-4">
   <PageHeader title={`Gantt · ${project.name}`} description="Planificación visual de actividades, subtareas, hitos y avance."/>
   <div className="flex items-center gap-2"><Badge variant="outline">{project.code}</Badge>
    <Button size="icon" variant="outline" onClick={()=>setDayWidth(x=>Math.max(26,x-8))}><ZoomOut className="size-4"/></Button>
    <Button size="icon" variant="outline" onClick={()=>setDayWidth(x=>Math.min(72,x+8))}><ZoomIn className="size-4"/></Button>
   </div>
  </div>
  <div className="grid gap-4 md:grid-cols-3"><K t="Avance proyecto" v={`${project.progress}%`}/><K t="Actividades" v={String(tasks.length)}/><K t="Con fechas" v={String(dated.length)}/></div>
  <Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-5"/>Cronograma</CardTitle><p className="text-sm text-muted-foreground">Clic en una actividad para editarla. Flechas para expandir o contraer subtareas.</p></CardHeader>
   <CardContent className="p-0">{tasks.length===0?<div className="py-16 text-center text-muted-foreground">El proyecto todavía no tiene actividades.</div>:
    <ScrollArea className="w-full"><div className="relative" style={{width:LEFT+width,minWidth:"100%"}}>
     <div className="sticky top-0 z-30 flex h-[68px] border-b bg-background">
      <div className="sticky left-0 z-40 flex shrink-0 items-center border-r bg-background px-4 font-medium" style={{width:LEFT}}>Actividad</div>
      <div className="flex shrink-0" style={{width}}>{days.map(d=>{const wk=d.getDay()===0||d.getDay()===6,now=iso(d)===today;return <div key={iso(d)} className={cn("flex shrink-0 flex-col items-center justify-center border-r text-xs",wk&&"bg-muted/35",now&&"bg-primary/10")} style={{width:dayWidth}}><b>{d.toLocaleDateString("es-CL",{weekday:"short"}).replace(".","")}</b><span className="text-muted-foreground">{d.toLocaleDateString("es-CL",{day:"2-digit",month:"short"})}</span></div>})}</div>
     </div>
     <div className="relative">{ti>=0&&<div className="pointer-events-none absolute top-0 z-20 border-l-2 border-primary" style={{left:LEFT+ti*dayWidth+dayWidth/2,height:visible.length*ROW}}/>}
      {visible.map(t=>{const rs=t.start_date||t.due_date,re=t.due_date||t.start_date;let l=0,w=0;if(rs&&re){l=diff(range.start,pd(rs))*dayWidth;w=Math.max(1,diff(pd(rs),pd(re))+1)*dayWidth}
       return <div key={t.id} className="flex border-b" style={{height:ROW}}>
        <div className="sticky left-0 z-10 flex shrink-0 items-center border-r bg-background px-3" style={{width:LEFT}}>
         <div className="flex min-w-0 flex-1 items-center" style={{paddingLeft:t.depth*18}}>
          {t.hasChildren?<button className="mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded hover:bg-muted" onClick={()=>toggle(t.id)}>{collapsed.has(t.id)?<ChevronRight className="size-4"/>:<ChevronDown className="size-4"/>}</button>:t.depth>0?<CornerDownRight className="mr-2 size-4 shrink-0 text-muted-foreground"/>:<span className="mr-1 size-7 shrink-0"/>}
          <button className="min-w-0 flex-1 text-left" onClick={()=>router.push(`/proyectos/${project.id}/actividades/${t.id}`)}><div className="flex items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{t.code}</span>{t.is_milestone&&<Diamond className="size-3.5"/>}</div><p className="truncate text-sm font-medium">{t.title}</p></button>
         </div>
        </div>
        <div className="relative shrink-0" style={{width}}>
         <div className="absolute inset-0 flex">{days.map(d=><div key={iso(d)} className={cn("h-full shrink-0 border-r",(d.getDay()===0||d.getDay()===6)&&"bg-muted/25")} style={{width:dayWidth}}/>)}</div>
         {rs&&re?(t.is_milestone?
          <Tooltip><TooltipTrigger className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" style={{left:l+dayWidth/2}} onClick={()=>router.push(`/proyectos/${project.id}/actividades/${t.id}`)}><div className="size-5 rotate-45 rounded-[3px] border-2 border-primary bg-background"/></TooltipTrigger><TooltipContent><Tip t={t}/></TooltipContent></Tooltip>:
          <Tooltip><TooltipTrigger className="absolute top-1/2 z-10 h-7 -translate-y-1/2 overflow-hidden rounded-md border bg-primary/20 text-left shadow-sm" style={{left:l,width:Math.max(w,18)}} onClick={()=>router.push(`/proyectos/${project.id}/actividades/${t.id}`)}><div className="absolute inset-y-0 left-0 bg-primary/70" style={{width:`${Math.min(100,Math.max(0,t.progress))}%`}}/><span className="relative z-10 flex h-full items-center px-2 text-[11px] font-medium">{t.progress}%</span></TooltipTrigger><TooltipContent><Tip t={t}/></TooltipContent></Tooltip>
         ):<div className="absolute inset-0 flex items-center px-3 text-xs text-muted-foreground">Sin fechas</div>}
        </div>
       </div>})}
     </div>
    </div><ScrollBar orientation="horizontal"/></ScrollArea>}
   </CardContent>
  </Card>
 </div></TooltipProvider>
}
function Tip({t}:{t:Task}){return <div className="space-y-1"><p className="font-medium">{t.code} · {t.title}</p><p>{fmt(t.start_date)} → {fmt(t.due_date)}</p><p>Avance: {t.progress}%</p><p>Responsable: {t.responsible_name||"Sin asignar"}</p>{t.blocker&&<p>Bloqueo: {t.blocker}</p>}</div>}
function K({t,v}:{t:string;v:string}){return <div className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">{t}</p><p className="mt-1 text-xl font-semibold">{v}</p></div>}