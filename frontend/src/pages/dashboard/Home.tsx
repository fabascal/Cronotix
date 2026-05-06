import { useState } from "react";
import { FileText, Brain, CreditCard, TrendingUp, Clock, CheckCircle, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContextTransition } from "@/components/ui/ContextTransition";
import { DrillReveal } from "@/components/ui/DrillReveal";
import { useAuth } from "@/context/AuthContext";

/* ── Stat cards ─────────────────────────────────────────────── */
const STATS = [
  {
    id: "docs",
    title: "Documentos procesados",
    value: "—",
    change: "+0 este mes",
    icon: FileText,
    iconColor: "text-gold-700 dark:text-gold-400",
    iconBg: "bg-gold-100 border border-gold-300 dark:bg-gold-900/30 dark:border-gold-700/40",
    detail: "Aquí verás el historial de documentos OCR procesados: PDFs, imágenes y formularios.",
  },
  {
    id: "agents",
    title: "Agentes activos",
    value: "—",
    change: "0 en ejecución",
    icon: Brain,
    iconColor: "text-navy-700 dark:text-navy-200",
    iconBg: "bg-navy-100 border border-navy-200 dark:bg-navy-600/20 dark:border-navy-500/30",
    detail: "Muestra los agentes IA en ejecución: conversacionales, extractores y clasificadores.",
  },
  {
    id: "credits",
    title: "Créditos disponibles",
    value: "—",
    change: "Sin consumo reciente",
    icon: CreditCard,
    iconColor: "text-gold-700 dark:text-gold-300",
    iconBg: "bg-gold-50 border border-gold-200 dark:bg-gold-900/20 dark:border-gold-700/25",
    detail: "Balance de créditos del tenant actual. Cada operación IA descuenta según provider_pricing.",
  },
  {
    id: "tokens",
    title: "Tokens procesados",
    value: "—",
    change: "Último período",
    icon: TrendingUp,
    iconColor: "text-navy-600 dark:text-navy-300",
    iconBg: "bg-navy-50 border border-navy-100 dark:bg-navy-600/20 dark:border-navy-500/20",
    detail: "Total de tokens de entrada/salida consumidos en el período. Desglosado por modelo LLM.",
  },
];

/* ── Status ──────────────────────────────────────────────────── */
const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  done: {
    cls: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
    label: "Completado",
  },
  processing: {
    cls: "bg-gold-100 text-gold-800 border-gold-300 dark:bg-gold-500/15 dark:text-gold-400 dark:border-gold-500/30",
    label: "En proceso",
  },
  error: {
    cls: "bg-red-100 text-red-700 border-red-300 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
    label: "Error",
  },
  idle: {
    cls: "bg-slate-100 text-slate-600 border-slate-300 dark:bg-muted/40 dark:text-muted-foreground dark:border-border",
    label: "Inactivo",
  },
  pending: {
    cls: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-muted/30 dark:text-muted-foreground dark:border-border",
    label: "Pendiente",
  },
};

const SYSTEM_SERVICES = [
  { name: "API Backend (NestJS)",  status: "pending" },
  { name: "PostgreSQL + pgvector", status: "pending" },
  { name: "Redis / BullMQ",        status: "pending" },
  { name: "LLM Router",            status: "pending" },
  { name: "OCR Worker",            status: "pending" },
];

const RECENT_JOBS = [{ id: "—", type: "OCR", status: "idle", time: "—", pages: 0 }];

/* ── Tabs for the bottom section (context transition demo) ────── */
type BottomTab = "jobs" | "system";

export default function Home() {
  const { user } = useAuth();

  /* Drill: which stat card is open */
  const [drillStat, setDrillStat] = useState<string | null>(null);
  const activeStat = STATS.find((s) => s.id === drillStat) ?? null;

  /* Context: active bottom tab */
  const [bottomTab, setBottomTab] = useState<BottomTab>("jobs");

  return (
    <div className="flex flex-col gap-6">

      {/* ── Welcome banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-navy-100 bg-navy-50 p-6 shadow-sm dark:border-transparent dark:bg-navy-700 dark:shadow-md animate-fade-up">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold-500 to-transparent opacity-60 dark:opacity-100"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-10 -top-10 hidden h-40 w-40 rounded-full bg-gold-600/10 blur-2xl dark:block"
          aria-hidden="true"
        />

        <h1 className="text-3xl font-bold text-pretty text-navy-900 dark:text-white">
          Bienvenido{user ? `, ${user.name}` : ""}
        </h1>
        <p className="mt-1 text-base text-navy-600 dark:text-navy-200">
          Portal de Agentes IA — Procesamiento de documentos legales, médicos y financieros.
        </p>

        {user && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge className="tabular-nums border border-gold-400/60 bg-gold-100 text-gold-800 hover:bg-gold-200 dark:border-gold-500/40 dark:bg-gold-600/20 dark:text-gold-200 dark:hover:bg-gold-600/30">
              {user.credits.toLocaleString()} créditos
            </Badge>
            <Badge className="capitalize border border-navy-300/60 bg-navy-100 text-navy-700 hover:bg-navy-200 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15">
              {user.role}
            </Badge>
          </div>
        )}
      </div>

      {/* ── Stat cards — Continuity transition demo ──────────────────
          Each card has a unique view-transition-name so the browser
          can morph it when opening the DrillReveal panel.
          Click a card → DrillReveal slides in with the detail.
      ─────────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map(({ id, title, value, change, icon: Icon, iconColor, iconBg }, i) => (
          <button
            key={id}
            onClick={() => setDrillStat(id)}
            /* view-transition-name enables continuity morph */
            style={{ viewTransitionName: `stat-card-${id}` }}
            className={[
              "group text-left w-full rounded-xl border border-border bg-card shadow-sm",
              "transition-[transform,box-shadow] duration-200",
              "hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              /* staggered entrance */
              `animate-stagger-${Math.min(i + 1, 4) as 1 | 2 | 3 | 4}`,
            ].join(" ")}
            aria-label={`Ver detalle: ${title}`}
          >
            <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
              <p className="text-base font-medium text-muted-foreground">{title}</p>
              <span className={`rounded-xl p-2.5 ${iconBg}`} aria-hidden="true">
                <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
              </span>
            </div>
            <div className="px-6 pb-5">
              <p className="text-4xl font-bold tracking-tight text-foreground tabular-nums">
                {value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{change}</p>
              <span className="mt-3 flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Ver detalle
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* ── Drill reveal for stat detail ── */}
      <DrillReveal
        open={drillStat !== null}
        onClose={() => setDrillStat(null)}
        title={activeStat?.title ?? "Detalle"}
        variant="panel"
      >
        {activeStat && (
          <div className="flex flex-col gap-4">
            <div className={`inline-flex w-fit rounded-xl p-3 ${activeStat.iconBg}`}>
              <activeStat.icon className={`h-6 w-6 ${activeStat.iconColor}`} aria-hidden="true" />
            </div>
            <div>
              <p className="text-5xl font-bold tabular-nums text-foreground">{activeStat.value}</p>
              <p className="mt-1 text-base text-muted-foreground">{activeStat.change}</p>
            </div>
            <p className="text-base leading-relaxed text-muted-foreground border-t border-border pt-4">
              {activeStat.detail}
            </p>
            <p className="text-sm text-muted-foreground/60 italic">
              Los datos reales estarán disponibles cuando el sistema esté en producción.
            </p>
          </div>
        )}
      </DrillReveal>

      {/* ── Bottom section: tabs with Context transition ──────────────
          Switching between "Trabajos recientes" and "Estado del sistema"
          is a context transition — structure (tabs) stays, content swaps.
      ─────────────────────────────────────────────────────────────── */}
      <Card className="animate-stagger-4">
        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-border px-5 pt-4">
          {(
            [
              { id: "jobs" as BottomTab,   icon: Clock,         label: "Trabajos recientes" },
              { id: "system" as BottomTab, icon: CheckCircle,   label: "Estado del sistema" },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setBottomTab(id)}
              className={[
                "flex items-center gap-1.5 rounded-t-md px-4 py-2.5 text-base font-medium",
                "border-b-2 -mb-px transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                bottomTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <CardContent className="pt-4">
          {/* Context transition — tab content fades/slides on switch */}
          <ContextTransition transitionKey={bottomTab}>
            {bottomTab === "jobs" ? (
              <div className="flex flex-col gap-2">
                <p className="mb-1 text-sm text-muted-foreground">
                  Últimas operaciones OCR y análisis de IA
                </p>
                {RECENT_JOBS.map((job) => {
                  const s = STATUS_MAP[job.status] ?? STATUS_MAP.idle;
                  return (
                    <div
                      key={job.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="truncate text-base font-medium text-foreground">{job.type}</p>
                          <p className="text-sm text-muted-foreground">{job.time}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-sm font-medium ${s.cls}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="mb-1 text-sm text-muted-foreground">
                  Servicios de infraestructura
                </p>
                {SYSTEM_SERVICES.map(({ name, status }) => {
                  const s = STATUS_MAP[status] ?? STATUS_MAP.idle;
                  return (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3"
                    >
                      <span className="min-w-0 truncate text-base text-foreground">{name}</span>
                      <span className={`ml-3 shrink-0 rounded-full border px-2.5 py-0.5 text-sm font-medium ${s.cls}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </ContextTransition>
        </CardContent>
      </Card>
    </div>
  );
}
