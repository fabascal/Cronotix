import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Bot,
  MessageSquare,
  FileSearch,
  ScanText,
  Tags,
  Loader2,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/apiClient";
import { ContextTransition } from "@/components/ui/ContextTransition";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentType = "conversacional" | "extractor" | "ocr" | "clasificador";
type AgentStatus = "activo" | "inactivo";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  type: AgentType;
  llmModel: string;
  status: AgentStatus;
  createdAt: string;
}

interface LlmModelTemplateApi {
  acronym: string;
  modelId: string;
  displayName: string | null;
  provider: "openai" | "gemini" | "ollama";
  enabled: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_META: Record<
  AgentType,
  { label: string; Icon: React.ElementType; iconBg: string; iconColor: string; accentBar: string }
> = {
  conversacional: {
    label: "Conversacional",
    Icon: MessageSquare,
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    accentBar: "bg-blue-400",
  },
  extractor: {
    label: "Extractor",
    Icon: FileSearch,
    iconBg: "bg-gold-100 dark:bg-gold-900/40",
    iconColor: "text-gold-700 dark:text-gold-400",
    accentBar: "bg-gold-400",
  },
  ocr: {
    label: "OCR",
    Icon: ScanText,
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
    iconColor: "text-purple-600 dark:text-purple-400",
    accentBar: "bg-purple-400",
  },
  clasificador: {
    label: "Clasificador",
    Icon: Tags,
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    accentBar: "bg-emerald-400",
  },
};

const BASE_LLM_LABEL: Record<string, { short: string; providerColor: string }> = {
  "gpt-4o": { short: "GPT-4o", providerColor: "text-emerald-600 dark:text-emerald-400" },
  "gpt-4o-mini": { short: "GPT-4o mini", providerColor: "text-emerald-600 dark:text-emerald-400" },
  "gemini-1.5-pro": { short: "Gemini 1.5 Pro", providerColor: "text-blue-600 dark:text-blue-400" },
  "gemini-1.5-flash": { short: "Gemini Flash", providerColor: "text-blue-600 dark:text-blue-400" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

// ─── AgentCard ────────────────────────────────────────────────────────────────

function AgentCard({
  agent,
  onClick,
  modelLabels,
}: {
  agent: Agent;
  onClick: () => void;
  modelLabels: Record<string, { short: string; providerColor: string }>;
}) {
  const meta = TYPE_META[agent.type];
  const model = modelLabels[agent.llmModel] ?? BASE_LLM_LABEL[agent.llmModel];

  return (
    <article className="group relative flex flex-col rounded-2xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-gold-400/50 hover:shadow-md dark:shadow-none">
      {/* Type accent strip */}
      <div
        className={cn("absolute left-0 top-4 bottom-4 w-1 rounded-full", meta.accentBar)}
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={onClick}
        className="flex flex-1 flex-col gap-4 p-5 pl-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
        aria-label={`Configurar agente ${agent.name}`}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              meta.iconBg
            )}
          >
            <meta.Icon className={cn("h-5 w-5", meta.iconColor)} aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-foreground">{agent.name}</span>
            <span className="block text-sm text-muted-foreground">{meta.label}</span>
          </div>

          <ChevronRight
            className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
        </div>

        {/* Description */}
        {agent.description && (
          <p className="text-base text-muted-foreground line-clamp-2 leading-relaxed">
            {agent.description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center gap-3 text-sm text-muted-foreground">
          <span
            className={cn(
              "flex items-center gap-1.5 font-medium",
              agent.status === "activo"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                agent.status === "activo"
                  ? "bg-emerald-500 motion-safe:animate-pulse"
                  : "bg-muted-foreground/40"
              )}
              aria-hidden="true"
            />
            {agent.status === "activo" ? "Activo" : "Inactivo"}
          </span>

          <span aria-hidden="true">·</span>

          <span className={cn("font-medium", model?.providerColor ?? "text-muted-foreground")}>
            {model?.short ?? agent.llmModel}
          </span>

          <time className="ml-auto tabular-nums" dateTime={agent.createdAt}>
            {formatDate(agent.createdAt)}
          </time>
        </div>
      </button>
    </article>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-20 text-center">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-3xl opacity-60 dark:opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--color-navy-300, #93b4d0) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
          aria-hidden="true"
        />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-navy-200/60 bg-card shadow-sm dark:border-navy-700/60">
          <Bot className="h-12 w-12 text-navy-400 dark:text-gold-400/80" aria-hidden="true" />
          <span
            className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 shadow-sm dark:bg-blue-900/60 dark:text-blue-300"
            aria-hidden="true"
          >
            AI
          </span>
          <span
            className="absolute -bottom-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full bg-gold-100 text-[10px] font-bold text-gold-700 shadow-sm dark:bg-gold-900/50 dark:text-gold-400"
            aria-hidden="true"
          >
            LLM
          </span>
        </div>
      </div>

      <div className="max-w-xs">
        <h2 className="font-display text-3xl font-semibold text-foreground text-balance">
          Aún no tienes agentes
        </h2>
        <p className="mt-2 text-base text-muted-foreground text-pretty leading-relaxed">
          Los agentes son la inteligencia de Cronotix. Configura el primero para
          empezar a procesar documentos de forma automática.
        </p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={onCreate}
          className={cn(
            "flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold",
            "bg-primary text-primary-foreground transition-[opacity] hover:opacity-90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Crear mi primer agente
        </button>
        <p className="text-sm text-muted-foreground">
          Conversacional · Extractor · OCR · Clasificador
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [modelLabels, setModelLabels] = useState(BASE_LLM_LABEL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      setError(null);
      const agentsRes = await apiClient.get<Agent[]>("/api/v1/agents");
      setAgents(agentsRes.data);
      try {
        const modelsRes = await apiClient.get<{ items: LlmModelTemplateApi[] }>("/api/v1/settings/llm/models");
        const dynamicLabels = modelsRes.data.items
          .filter((m) => m.enabled)
          .reduce<Record<string, { short: string; providerColor: string }>>((acc, model) => {
            const providerColor =
              model.provider === "openai"
                ? "text-emerald-600 dark:text-emerald-400"
                : model.provider === "gemini"
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-600 dark:text-slate-300";
            acc[model.acronym] = {
              short: model.displayName ?? model.modelId,
              providerColor,
            };
            return acc;
          }, {});
        setModelLabels({ ...BASE_LLM_LABEL, ...dynamicLabels });
      } catch {
        setModelLabels(BASE_LLM_LABEL);
      }
    } catch {
      setError("No se pudo cargar la lista de agentes.");
      setModelLabels(BASE_LLM_LABEL);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* ── Page header ── */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground text-pretty">
            Agentes
          </h1>
          <p className="mt-0.5 text-base text-muted-foreground">
            Administra y configura los agentes IA de tu espacio de trabajo
          </p>
        </div>

        <button
          onClick={() => navigate("/dashboard/agents/new")}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-base font-semibold",
            "bg-primary text-primary-foreground transition-[opacity] hover:opacity-90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Nuevo agente</span>
          <span className="sm:hidden" aria-hidden="true">Nuevo</span>
        </button>
      </header>

      {/* ── Content ── */}
      {loading ? (
        <div
          role="status"
          aria-label="Cargando agentes…"
          className="flex items-center justify-center py-24"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
          <p className="text-base text-muted-foreground">{error}</p>
          <button
            onClick={fetchAgents}
            className="rounded text-base font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <ContextTransition transitionKey={agents.length === 0 ? "empty" : "list"}>
          {agents.length === 0 ? (
            <EmptyState onCreate={() => navigate("/dashboard/agents/new")} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  modelLabels={modelLabels}
                  onClick={() => navigate(`/dashboard/agents/${agent.id}`)}
                />
              ))}
            </div>
          )}
        </ContextTransition>
      )}
    </div>
  );
}
