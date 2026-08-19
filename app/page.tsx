import { LoginForm } from "@/components/login-form"
import { ShieldCheck, Sparkles, Timer, BarChart3 } from "lucide-react"


const HIGHLIGHTS = [
  { icon: Sparkles, title: "Clasificación con IA", desc: "SIGIA AI sugiere categoría, prioridad y solución en segundos." },
  { icon: Timer, title: "Control de SLA", desc: "Monitorea el cumplimiento y anticipa vencimientos críticos." },
  { icon: BarChart3, title: "Reportes accionables", desc: "Detecta problemas recurrentes con análisis Pareto 80/20." },
]

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-16">
        <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-semibold tracking-tight">SIGIA</span>
              <span className="text-xs text-muted-foreground">Gestión Inteligente de Incidencias</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-balance">Bienvenido de vuelta</h1>
            <p className="text-sm text-muted-foreground text-pretty">
              Ingresa a tu cuenta para gestionar y resolver incidencias de TI.
            </p>
          </div>

          <LoginForm />

          <p className="text-center text-xs text-muted-foreground">
            Capstone — Ingeniería en Informática · SIGIA {"\u00A9"} 2026
          </p>
        </div>
      </div>

      {/* Brand side */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative flex items-center gap-2 text-sm font-medium">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1 ring-1 ring-inset ring-primary-foreground/20">
            <span className="size-1.5 rounded-full bg-primary-foreground" />
            Plataforma de TI
          </span>
        </div>

        <div className="relative flex flex-col gap-8">
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-balance">
            Resuelve incidencias más rápido, con el apoyo de la inteligencia artificial.
          </h2>
          <div className="flex flex-col gap-5">
            {HIGHLIGHTS.map((h) => (
              <div key={h.title} className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 ring-1 ring-inset ring-primary-foreground/20">
                  <h.icon className="size-4.5" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium">{h.title}</p>
                  <p className="text-sm text-primary-foreground/70">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-6 text-sm text-primary-foreground/70">
          <div><p className="font-medium text-primary-foreground">Datos reales, trazabilidad y seguimiento</p><p>Los indicadores se calculan al iniciar sesión.</p></div>
        </div>
      </div>
    </div>
  )
}
