"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

import { useSigia } from "@/lib/store"
import { PRIORITIES, priorityLabel } from "@/lib/types"

const createdConfig = {
  creadas: { label: "Creadas", color: "var(--chart-1)" },
  resueltas: { label: "Resueltas", color: "var(--chart-3)" },
} satisfies ChartConfig

const priorityConfig = {
  value: { label: "Incidencias" },
  critica: { label: "Crítica", color: "var(--priority-critical)" },
  alta: { label: "Alta", color: "var(--priority-high)" },
  media: { label: "Media", color: "var(--priority-medium)" },
  baja: { label: "Baja", color: "var(--priority-low)" },
} satisfies ChartConfig

const deptConfig = {
  value: { label: "Incidencias", color: "var(--chart-2)" },
} satisfies ChartConfig

const moduleConfig = {
  value: { label: "Incidencias", color: "var(--chart-4)" },
} satisfies ChartConfig

const slaDeptConfig = {
  cumplimiento: { label: "Cumplimiento SLA", color: "var(--chart-3)" },
} satisfies ChartConfig

export function DashboardCharts() {
  const { incidents } = useSigia()

  const monthly = new Map<string, { month: string; creadas: number; resueltas: number }>()

  incidents.forEach((i) => {
    const d = new Date(i.createdAt)
    if (Number.isNaN(d.getTime())) return

    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString("es-CL", { month: "short", year: "2-digit" })

    const item = monthly.get(key) || { month: label, creadas: 0, resueltas: 0 }
    item.creadas++

    if (["resuelta", "cerrada"].includes(i.status)) item.resueltas++

    monthly.set(key, item)
  })

  const created = [...monthly.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => value)

  const PRIORITY_FILL: Record<string, string> = {
    critica: "var(--color-critica)",
    alta: "var(--color-alta)",
    media: "var(--color-media)",
    baja: "var(--color-baja)",
  }

  const priorityData = PRIORITIES.map((p) => ({
    name: priorityLabel(p.value),
    key: p.value,
    value: incidents.filter((i) => i.priority === p.value).length,
    fill: PRIORITY_FILL[p.value] ?? "var(--muted-foreground)",
  })).filter((item) => item.value > 0)

  const totalPriority = priorityData.reduce((sum, item) => sum + item.value, 0)

  const deptMap = new Map<string, number>()
  incidents.forEach((i) => {
    const department = i.department || "Sin departamento"
    deptMap.set(department, (deptMap.get(department) || 0) + 1)
  })

  const deptData = [...deptMap]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  const moduleMap = new Map<string, number>()
  incidents.forEach((i) => {
    const name = i.category || "Sin módulo"
    moduleMap.set(name, (moduleMap.get(name) || 0) + 1)
  })

  const moduleData = [...moduleMap]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const slaDeptMap = new Map<string, { total: number; breached: number }>()

  incidents.forEach((i) => {
    const department = i.department || "Sin departamento"
    const item = slaDeptMap.get(department) || { total: 0, breached: 0 }
    item.total++
    if (i.slaBreached) item.breached++
    slaDeptMap.set(department, item)
  })

  const slaDeptData = [...slaDeptMap.entries()]
    .map(([name, value]) => ({
      name,
      cumplimiento: Math.round(
        ((value.total - value.breached) / Math.max(1, value.total)) * 100
      ),
    }))
    .sort((a, b) => a.cumplimiento - b.cumplimiento)
    .slice(0, 8)

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card className="overflow-hidden rounded-2xl lg:col-span-2">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Creadas vs. resueltas</CardTitle>
              <CardDescription>Evolución mensual de la carga y capacidad de resolución</CardDescription>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[var(--chart-1)]" />
                Creadas
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-[var(--chart-3)]" />
                Resueltas
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={createdConfig} className="h-72 w-full">
            <AreaChart data={created}>
              <CartesianGrid vertical={false} strokeDasharray="4 4" opacity={0.25} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis tickLine={false} axisLine={false} width={32} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="creadas" stroke="var(--color-creadas)" fill="var(--color-creadas)" fillOpacity={0.12} strokeWidth={2.5} />
              <Area type="monotone" dataKey="resueltas" stroke="var(--color-resueltas)" fill="var(--color-resueltas)" fillOpacity={0.12} strokeWidth={2.5} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader>
          <CardTitle>Por prioridad</CardTitle>
          <CardDescription>Distribución actual según criticidad</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={priorityConfig} className="mx-auto h-[290px] w-full">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" hideLabel />} />
              <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={78} outerRadius={112} paddingAngle={4} cornerRadius={8} strokeWidth={0}>
                {priorityData.map((item) => (
                  <Cell key={item.key} fill={item.fill} stroke="var(--background)" strokeWidth={3} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-4xl font-bold">
                            {totalPriority}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground text-xs">
                            incidencias
                          </tspan>
                        </text>
                      )
                    }
                    return null
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader>
          <CardTitle>Por departamento</CardTitle>
          <CardDescription>Incidencias según área responsable</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={deptConfig} className="h-[360px] w-full">
            <BarChart data={deptData} layout="vertical">
              <CartesianGrid horizontal={false} strokeDasharray="4 4" opacity={0.2} />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[0, 9, 9, 0]} barSize={34}>
                <LabelList dataKey="value" position="right" className="fill-foreground text-xs font-semibold" />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader>
          <CardTitle>Top módulos con incidencias</CardTitle>
          <CardDescription>Principales focos de demanda registrados</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={moduleConfig} className="h-[360px] w-full">
            <BarChart data={moduleData} layout="vertical">
              <CartesianGrid horizontal={false} strokeDasharray="4 4" opacity={0.2} />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={125} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[0, 9, 9, 0]} barSize={30}>
                <LabelList dataKey="value" position="right" className="fill-foreground text-xs font-semibold" />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader>
          <CardTitle>Cumplimiento SLA por área</CardTitle>
          <CardDescription>Porcentaje de incidencias dentro de SLA por departamento</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={slaDeptConfig} className="h-[360px] w-full">
            <BarChart data={slaDeptData} layout="vertical">
              <CartesianGrid horizontal={false} strokeDasharray="4 4" opacity={0.2} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="cumplimiento" fill="var(--color-cumplimiento)" radius={[0, 9, 9, 0]} barSize={30}>
                <LabelList dataKey="cumplimiento" position="right" formatter={(value: number) => `${value}%`} className="fill-foreground text-xs font-semibold" />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}