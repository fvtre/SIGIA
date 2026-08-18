"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PriorityBadge, StatusBadge } from "@/components/status-badges"
import { useSigia } from "@/lib/store"
import { relativeTime } from "@/lib/format"

export function RecentIncidents() {
  const { incidents: INCIDENTS } = useSigia()
  const rows = [...INCIDENTS]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Incidencias recientes</CardTitle>
        <CardDescription>Últimas incidencias registradas en la plataforma</CardDescription>
        <CardAction>
          <Button nativeButton={false} variant="outline" size="sm" render={<Link href="/incidencias" />}>
            Ver todas
            <ArrowUpRight data-icon="inline-end" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">ID</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="hidden md:table-cell">Departamento</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden pr-6 text-right lg:table-cell">Creada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((i) => (
              <TableRow key={i.id} className="group">
                <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                  <Link href={`/incidencias/${i.id}`} className="hover:text-primary">
                    {i.id}
                  </Link>
                </TableCell>
                <TableCell className="max-w-[280px]">
                  <Link
                    href={`/incidencias/${i.id}`}
                    className="line-clamp-1 font-medium group-hover:text-primary"
                  >
                    {i.title}
                  </Link>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                  {i.department}
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={i.priority} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={i.status} />
                </TableCell>
                <TableCell className="hidden pr-6 text-right text-sm text-muted-foreground lg:table-cell">
                  {relativeTime(i.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
