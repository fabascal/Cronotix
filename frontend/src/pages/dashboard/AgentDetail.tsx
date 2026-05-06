import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Code2,
  Cpu,
  FileText,
  Globe,
  Loader2,
  MessageCircle,
  Network,
  Play,
  Search,
  Send,
  Sparkles,
  Thermometer,
  Trash2,
  TriangleAlert,
  UserRound,
  Wand2,
  Zap,
  X,
  CheckCircle2,
  Plus,
  Pencil,
  ExternalLink,
  Power,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/context/ToastContext";
import AgentDescriptionWizard from "@/components/agents/AgentDescriptionWizard";
import ScheduleList from "@/components/agents/schedules/ScheduleList";
import AgentWhatsappSection from "@/components/agents/whatsapp/AgentWhatsappSection";
import AgentTelegramSection from "@/components/agents/telegram/AgentTelegramSection";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentType = "conversacional" | "extractor" | "ocr" | "clasificador";
type AgentStatus = "activo" | "inactivo";

interface AgentConfig {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

interface Agent {
  id: string;
  name: string;
  description: string | null;
  type: AgentType;
  llmModel: string;
  status: AgentStatus;
  config: AgentConfig | null;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  name: string;
  description: string;
  type: AgentType;
  llmModel: string;
  status: AgentStatus;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

interface LlmModelTemplateApi {
  id: string;
  provider: "openai" | "gemini" | "ollama";
  acronym: string;
  modelId: string;
  displayName: string | null;
  enabled: boolean;
}

interface SkillApi {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  category: string | null;
  isGlobal: boolean;
  isActive: boolean;
}

interface AgentFunctionApi {
  id: string;
  agentId: string;
  name: string;
  description: string | null;
  parameters: Record<string, unknown>;
  webhookUrl: string;
  webhookMethod: string;
  webhookHeaders: string | null;
  timeoutMs: number;
  isActive: boolean;
}

interface FunctionFormState {
  name: string;
  description: string;
  parameters: string;
  webhookUrl: string;
  webhookMethod: string;
  webhookHeaders: string;
  timeoutMs: number;
}

const EMPTY_FN_FORM: FunctionFormState = {
  name: "",
  description: "",
  parameters: '{\n  "type": "object",\n  "properties": {},\n  "required": []\n}',
  webhookUrl: "",
  webhookMethod: "POST",
  webhookHeaders: "{}",
  timeoutMs: 10000,
};

interface McpIntegrationApi {
  id: string;
  agentId: string;
  type: string;
  config: Record<string, unknown>;
  hasSecrets: boolean;
  isActive: boolean;
}

interface McpTypeInfo {
  type: string;
  label: string;
  description: string;
  configSchema: Record<string, { type: string; label: string; required?: boolean }>;
  secretsSchema: Record<string, { type: string; label: string; required?: boolean; sensitive?: boolean }>;
  tools: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

type ModelProvider = "openai" | "gemini" | "ollama" | "legacy";

interface ModelOption {
  value: string;
  label: string;
  providerLabel: string;
  provider: ModelProvider;
  note: string;
  context: string;
}

const MAX_TOKENS_PRESETS = [512, 1024, 2048, 4096, 8192];

const PLANNED_MCP: { label: string; desc: string; badge: string }[] = [
  { label: "Filesystem", desc: "Acceso a archivos y directorios locales", badge: "Local" },
  { label: "PostgreSQL", desc: "Consultas y mutaciones en tu base de datos", badge: "DB" },
  { label: "GitHub", desc: "Gestión de repositorios, PRs e issues", badge: "Git" },
  { label: "Slack", desc: "Mensajes, canales y notificaciones", badge: "Chat" },
  { label: "Notion", desc: "Lectura y escritura en bases de datos Notion", badge: "Wiki" },
  { label: "HTTP", desc: "Llamadas a cualquier API REST externa", badge: "API" },
];

interface DocumentApi {
  id: string;
  status: string;
  pageCount: number;
  documentType: string;
  fileName: string | null;
  description: string | null;
  createdAt: string;
}

type NavId = "identity" | "intelligence" | "instructions" | "skills" | "documents" | "functions" | "mcp" | "schedules" | "whatsapp" | "telegram" | "danger";

const NAV_ITEMS: { id: NavId; label: string; Icon: React.ElementType; soon?: boolean; danger?: boolean }[] = [
  { id: "identity", label: "Identidad", Icon: UserRound },
  { id: "intelligence", label: "Inteligencia", Icon: Cpu },
  { id: "instructions", label: "Instrucciones", Icon: FileText },
  { id: "skills", label: "Habilidades", Icon: Zap },
  { id: "documents", label: "Documentos", Icon: FileText },
  { id: "functions", label: "Functions", Icon: Code2 },
  { id: "mcp", label: "MCP", Icon: Network },
  { id: "schedules", label: "Schedules", Icon: Calendar },
  { id: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
  { id: "telegram", label: "Telegram", Icon: Send },
];

const DEFAULT_FORM: FormState = {
  name: "",
  description: "",
  type: "conversacional",
  llmModel: "",
  status: "inactivo",
  systemPrompt: "",
  temperature: 0.7,
  maxTokens: 2048,
};

// ─── SectionCard ──────────────────────────────────────────────────────────────

function SectionCard({
  id,
  Icon,
  iconClass,
  title,
  subtitle,
  children,
  badge,
}: {
  id: NavId;
  Icon: React.ElementType;
  iconClass: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-20"
    >
      <div className="mb-4 flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            iconClass
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2
              id={`${id}-title`}
              className="font-display text-lg font-semibold text-foreground"
            >
              {title}
            </h2>
            {badge}
          </div>
          <p className="mt-0.5 text-base text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:shadow-none">
        {children}
      </div>
    </section>
  );
}

// ─── SoonBadge ────────────────────────────────────────────────────────────────

function SoonBadge() {
  return (
    <span className="rounded-full border border-gold-300/60 bg-gold-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-700 dark:border-gold-700/40 dark:bg-gold-900/20 dark:text-gold-400">
      Fase 2
    </span>
  );
}

// ─── ModelCombobox ────────────────────────────────────────────────────────────

const PROVIDER_COLOR: Record<ModelProvider, string> = {
  openai: "text-emerald-500 dark:text-emerald-400",
  gemini: "text-blue-500 dark:text-blue-400",
  ollama: "text-orange-500 dark:text-orange-400",
  legacy: "text-muted-foreground",
};

function ModelCombobox({
  value,
  onChange,
  models,
}: {
  value: string;
  onChange: (v: string) => void;
  models: ModelOption[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Close when clicking outside both trigger and dropdown
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Reposition the dropdown whenever it opens or the window scrolls/resizes
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      // Prefer opening upward: avoids covering elements below (temperature, tokens)
      const openUpward = spaceAbove >= spaceBelow || spaceAbove >= 200;
      if (openUpward) {
        setDropdownStyle({
          position: "fixed",
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          width: rect.width,
          maxHeight: Math.min(spaceAbove, 320),
          zIndex: 9999,
        });
      } else {
        setDropdownStyle({
          position: "fixed",
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
          maxHeight: Math.min(spaceBelow, 320),
          zIndex: 9999,
        });
      }
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const selected = models.find((m) => m.value === value);

  const filtered = models.filter((m) =>
    `${m.label} ${m.providerLabel} ${m.context} ${m.note}`.toLowerCase().includes(search.toLowerCase())
  );

  if (models.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border px-4 py-6 text-center">
        <Cpu className="mx-auto h-6 w-6 text-muted-foreground/50" aria-hidden="true" />
        <p className="mt-2 text-base text-muted-foreground">
          No hay modelos configurados.{" "}
          <Link to="/dashboard/models" className="font-medium text-primary hover:underline">
            Configura un modelo
          </Link>{" "}
          para continuar.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <p className="mb-2 text-base font-medium text-foreground">Modelo LLM</p>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-[border-color,background-color]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open
            ? "border-primary bg-primary/5 dark:bg-primary/10"
            : "border-border bg-background hover:border-primary/40"
        )}
      >
        {selected ? (
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Cpu className={cn("h-4 w-4", PROVIDER_COLOR[selected.provider])} aria-hidden="true" />
            </span>
            <span className="text-base font-semibold text-foreground truncate">{selected.label}</span>
          </div>
        ) : (
          <span className="text-base text-muted-foreground">Seleccionar modelo…</span>
        )}
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="rounded-xl border border-border bg-white shadow-xl dark:bg-slate-900 dark:shadow-2xl dark:border-slate-700"
        >
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Buscar modelo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
          <div className="overflow-y-auto px-1 pb-1" style={{ maxHeight: "inherit" }} role="listbox" aria-label="Modelos disponibles">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-base text-muted-foreground">Sin resultados</p>
            ) : (
              filtered.map((m) => {
                const isSelected = value === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(m.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-base transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Cpu className={cn("h-4 w-4 shrink-0", PROVIDER_COLOR[m.provider])} aria-hidden="true" />
                    <span className="flex-1 truncate">{m.label}</span>
                    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {m.note}
                    </span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── TemperatureSlider ────────────────────────────────────────────────────────

function TemperatureSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const labelMeta =
    value < 0.3
      ? { text: "Preciso", cls: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40" }
      : value < 0.7
      ? { text: "Equilibrado", cls: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40" }
      : value < 1.2
      ? { text: "Creativo", cls: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40" }
      : { text: "Experimental", cls: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40" };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor="temperature-range"
          className="flex items-center gap-1.5 text-base font-medium text-foreground"
        >
          <Thermometer className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Temperatura
        </label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-base text-muted-foreground tabular-nums">{value.toFixed(2)}</span>
          <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", labelMeta.cls)}>
            {labelMeta.text}
          </span>
        </div>
      </div>

      <div className="relative flex h-8 items-center">
        <div
          className="absolute h-2 w-full rounded-full"
          style={{
            background:
              "linear-gradient(to right, #3b82f6 0%, #10b981 35%, #f59e0b 68%, #ef4444 100%)",
          }}
          aria-hidden="true"
        />
        <input
          id="temperature-range"
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={value}
          aria-valuetext={`${value.toFixed(2)} — ${labelMeta.text}`}
          className="relative z-10 h-2 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md"
        />
      </div>

      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>0 · Preciso</span>
        <span>1 · Creativo</span>
        <span>2 · Experimental</span>
      </div>
    </div>
  );
}

// ─── DeleteConfirm ────────────────────────────────────────────────────────────

function DeleteConfirm({
  agentName,
  onConfirm,
  onCancel,
  deleting,
}: {
  agentName: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { confirmRef.current?.focus(); }, []);

  return (
    <div
      role="alertdialog"
      aria-modal="false"
      aria-labelledby="del-confirm-title"
      aria-describedby="del-confirm-desc"
      className="rounded-xl border border-destructive/30 bg-destructive/5 p-5"
    >
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p id="del-confirm-title" className="text-base font-semibold text-destructive">
            ¿Eliminar "{agentName}"?
          </p>
          <p id="del-confirm-desc" className="mt-1 text-base text-muted-foreground">
            Esta acción es permanente e irreversible. Todos los datos de configuración del agente se perderán.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar eliminación"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4 flex gap-3">
        <button
          ref={confirmRef}
          type="button"
          disabled={deleting}
          onClick={onConfirm}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-base font-semibold",
            "bg-destructive text-white transition-opacity hover:opacity-90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50",
            deleting && "opacity-70 cursor-not-allowed"
          )}
        >
          {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {deleting ? "Eliminando…" : "Sí, eliminar agente"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2.5 text-base font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id;

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeSection, setActiveSection] = useState<NavId>("identity");
  const [customTokens, setCustomTokens] = useState(false);
  const [customTokensValue, setCustomTokensValue] = useState("2048");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [promptWizardOpen, setPromptWizardOpen] = useState(false);

  // Skills
  const [availableSkills, setAvailableSkills] = useState<SkillApi[]>([]);
  const [assignedSkillIds, setAssignedSkillIds] = useState<Set<string>>(new Set());
  const [skillsDirty, setSkillsDirty] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);

  // Functions
  const [agentFunctions, setAgentFunctions] = useState<AgentFunctionApi[]>([]);
  const [fnModalOpen, setFnModalOpen] = useState(false);
  const [editingFnId, setEditingFnId] = useState<string | null>(null);
  const [fnForm, setFnForm] = useState<FunctionFormState>(EMPTY_FN_FORM);
  const [savingFn, setSavingFn] = useState(false);

  // Documents
  const [availableDocs, setAvailableDocs] = useState<DocumentApi[]>([]);
  const [assignedDocIds, setAssignedDocIds] = useState<Set<string>>(new Set());
  const [docsDirty, setDocsDirty] = useState(false);
  const [savingDocs, setSavingDocs] = useState(false);

  // MCP
  const [mcpTypes, setMcpTypes] = useState<McpTypeInfo[]>([]);
  const [mcpIntegrations, setMcpIntegrations] = useState<McpIntegrationApi[]>([]);
  const [mcpModalOpen, setMcpModalOpen] = useState(false);
  const [mcpModalType, setMcpModalType] = useState<McpTypeInfo | null>(null);
  const [mcpEditingId, setMcpEditingId] = useState<string | null>(null);
  const [mcpConfig, setMcpConfig] = useState<Record<string, string>>({});
  const [mcpSecrets, setMcpSecrets] = useState<Record<string, string>>({});
  const [savingMcp, setSavingMcp] = useState(false);

  // ── Scroll spy ────────────────────────────────────────────────────────────

  useEffect(() => {
    const ids: NavId[] = ["identity", "intelligence", "instructions", "skills", "documents", "functions", "mcp", "schedules"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as NavId);
          }
        });
      },
      { rootMargin: "-15% 0px -75% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [loading]);

  // ── Fetch (edit mode) ─────────────────────────────────────────────────────

  const fetchAgent = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await apiClient.get<Agent>(`/api/v1/agents/${id}`);
      setAgent(data);
      setForm({
        name: data.name,
        description: data.description ?? "",
        type: data.type,
        llmModel: data.llmModel,
        status: data.status,
        systemPrompt: data.config?.systemPrompt ?? "",
        temperature: data.config?.temperature ?? 0.7,
        maxTokens: data.config?.maxTokens ?? 2048,
      });
      const savedTokens = data.config?.maxTokens ?? 2048;
      if (!MAX_TOKENS_PRESETS.includes(savedTokens)) {
        setCustomTokens(true);
        setCustomTokensValue(String(savedTokens));
      }
    } catch {
      toast("No se pudo cargar el agente", "error");
      navigate("/dashboard/agents");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => { if (isEditing) fetchAgent(); }, [isEditing, fetchAgent]);

  const fetchModelOptions = useCallback(async () => {
    try {
      const { data } = await apiClient.get<{ items: LlmModelTemplateApi[] }>("/api/v1/settings/llm/models");
      const mapped: ModelOption[] = data.items
        .filter((m) => m.enabled)
        .map((m) => {
          const providerLabel =
            m.provider === "openai" ? "OpenAI" : m.provider === "gemini" ? "Google" : "Local";
          return {
            value: m.acronym,
            label: m.displayName || m.modelId,
            providerLabel,
            provider: m.provider,
            note: m.acronym,
            context: m.modelId,
          };
        });

      setModelOptions(mapped);
      if (!isEditing && mapped.length > 0) {
        setForm((prev) => {
          if (mapped.some((model) => model.value === prev.llmModel)) return prev;
          return { ...prev, llmModel: mapped[0].value };
        });
      }
    } catch {
      setModelOptions([]);
    }
  }, [isEditing]);

  const fetchAvailableSkills = useCallback(async () => {
    try {
      const { data } = await apiClient.get<SkillApi[]>("/api/v1/skills");
      // Exclude system/pipeline skills (generacion-*) from agent chat assignment
      setAvailableSkills(data.filter(s => !s.category?.startsWith("generacion-")));
    } catch { /* silent */ }
  }, []);

  const fetchAgentSkills = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await apiClient.get<SkillApi[]>(`/api/v1/agents/${id}/skills`);
      setAssignedSkillIds(new Set(data.map((s) => s.id)));
      setSkillsDirty(false);
    } catch { /* silent */ }
  }, [id]);

  const saveSkills = useCallback(async () => {
    if (!id) return;
    setSavingSkills(true);
    try {
      await apiClient.put(`/api/v1/agents/${id}/skills`, {
        skillIds: [...assignedSkillIds],
      });
      setSkillsDirty(false);
      toast("Habilidades guardadas", "success");
    } catch {
      toast("Error al guardar habilidades", "error");
    } finally {
      setSavingSkills(false);
    }
  }, [id, assignedSkillIds, toast]);

  // Functions CRUD
  const fetchFunctions = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await apiClient.get<AgentFunctionApi[]>(`/api/v1/agents/${id}/functions`);
      setAgentFunctions(data);
    } catch { /* silent */ }
  }, [id]);

  const openFnModal = (fn?: AgentFunctionApi) => {
    if (fn) {
      setEditingFnId(fn.id);
      setFnForm({
        name: fn.name,
        description: fn.description ?? "",
        parameters: JSON.stringify(fn.parameters, null, 2),
        webhookUrl: fn.webhookUrl,
        webhookMethod: fn.webhookMethod,
        webhookHeaders: "{}",
        timeoutMs: fn.timeoutMs,
      });
    } else {
      setEditingFnId(null);
      setFnForm(EMPTY_FN_FORM);
    }
    setFnModalOpen(true);
  };

  const saveFn = async () => {
    if (!id) return;
    setSavingFn(true);
    try {
      let params: Record<string, unknown>;
      try { params = JSON.parse(fnForm.parameters); } catch { toast("JSON Schema inválido", "error"); setSavingFn(false); return; }

      let headers: Record<string, string> | undefined;
      try {
        const parsed = JSON.parse(fnForm.webhookHeaders);
        if (Object.keys(parsed).length > 0) headers = parsed;
      } catch { /* ignore */ }

      const payload = {
        name: fnForm.name,
        description: fnForm.description || undefined,
        parameters: params,
        webhookUrl: fnForm.webhookUrl,
        webhookMethod: fnForm.webhookMethod,
        webhookHeaders: headers,
        timeoutMs: fnForm.timeoutMs,
      };

      if (editingFnId) {
        await apiClient.patch(`/api/v1/agents/${id}/functions/${editingFnId}`, payload);
      } else {
        await apiClient.post(`/api/v1/agents/${id}/functions`, payload);
      }
      toast(editingFnId ? "Función actualizada" : "Función creada", "success");
      setFnModalOpen(false);
      fetchFunctions();
    } catch {
      toast("Error al guardar función", "error");
    } finally {
      setSavingFn(false);
    }
  };

  const toggleFnActive = async (fn: AgentFunctionApi) => {
    if (!id) return;
    try {
      await apiClient.patch(`/api/v1/agents/${id}/functions/${fn.id}`, { isActive: !fn.isActive });
      fetchFunctions();
    } catch { toast("Error al cambiar estado", "error"); }
  };

  const deleteFn = async (fnId: string) => {
    if (!id) return;
    try {
      await apiClient.delete(`/api/v1/agents/${id}/functions/${fnId}`);
      toast("Función eliminada", "success");
      fetchFunctions();
    } catch { toast("Error al eliminar función", "error"); }
  };

  // MCP CRUD
  const fetchMcpTypes = useCallback(async () => {
    try {
      const { data } = await apiClient.get<McpTypeInfo[]>("/api/v1/mcp/types");
      setMcpTypes(data);
    } catch { /* silent */ }
  }, []);

  const fetchMcpIntegrations = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await apiClient.get<McpIntegrationApi[]>(`/api/v1/agents/${id}/mcp`);
      setMcpIntegrations(data);
    } catch { /* silent */ }
  }, [id]);

  const openMcpModal = (typeInfo: McpTypeInfo, existing?: McpIntegrationApi) => {
    setMcpModalType(typeInfo);
    if (existing) {
      setMcpEditingId(existing.id);
      const cfg: Record<string, string> = {};
      for (const key of Object.keys(typeInfo.configSchema)) {
        cfg[key] = String(existing.config[key] ?? "");
      }
      setMcpConfig(cfg);
      setMcpSecrets({});
    } else {
      setMcpEditingId(null);
      setMcpConfig({});
      setMcpSecrets({});
    }
    setMcpModalOpen(true);
  };

  const saveMcpIntegration = async () => {
    if (!id || !mcpModalType) return;
    setSavingMcp(true);
    try {
      const configObj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(mcpConfig)) {
        if (v) configObj[k] = v;
      }
      const secretsObj: Record<string, string> = {};
      for (const [k, v] of Object.entries(mcpSecrets)) {
        if (v) secretsObj[k] = v;
      }

      const payload: Record<string, unknown> = {
        type: mcpModalType.type,
        config: configObj,
      };
      if (Object.keys(secretsObj).length > 0) payload.secrets = secretsObj;

      if (mcpEditingId) {
        await apiClient.patch(`/api/v1/agents/${id}/mcp/${mcpEditingId}`, payload);
      } else {
        await apiClient.post(`/api/v1/agents/${id}/mcp`, payload);
      }
      toast(mcpEditingId ? "Integración actualizada" : "Integración configurada", "success");
      setMcpModalOpen(false);
      fetchMcpIntegrations();
    } catch {
      toast("Error al guardar integración", "error");
    } finally {
      setSavingMcp(false);
    }
  };

  const toggleMcpActive = async (integ: McpIntegrationApi) => {
    if (!id) return;
    try {
      await apiClient.patch(`/api/v1/agents/${id}/mcp/${integ.id}`, { isActive: !integ.isActive });
      fetchMcpIntegrations();
    } catch { toast("Error al cambiar estado", "error"); }
  };

  const deleteMcpIntegration = async (integId: string) => {
    if (!id) return;
    try {
      await apiClient.delete(`/api/v1/agents/${id}/mcp/${integId}`);
      toast("Integración eliminada", "success");
      fetchMcpIntegrations();
    } catch { toast("Error al eliminar integración", "error"); }
  };

  const fetchAvailableDocs = useCallback(async () => {
    try {
      const { data } = await apiClient.get<DocumentApi[]>("/api/v1/dashboard/documents");
      setAvailableDocs(data.filter((d) => d.status === "done"));
    } catch { /* silent */ }
  }, []);

  const fetchAgentDocs = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await apiClient.get<DocumentApi[]>(`/api/v1/agents/${id}/documents`);
      setAssignedDocIds(new Set(data.map((d) => d.id)));
      setDocsDirty(false);
    } catch { /* silent */ }
  }, [id]);

  const saveDocs = useCallback(async () => {
    if (!id) return;
    setSavingDocs(true);
    try {
      await apiClient.post(`/api/v1/agents/${id}/documents`, {
        documentIds: [...assignedDocIds],
      });
      setDocsDirty(false);
      toast("Documentos asignados", "success");
    } catch {
      toast("Error al asignar documentos", "error");
    } finally {
      setSavingDocs(false);
    }
  }, [id, assignedDocIds, toast]);

  useEffect(() => {
    fetchAvailableSkills();
  }, [fetchAvailableSkills]);

  useEffect(() => {
    fetchModelOptions();
  }, [fetchModelOptions]);

  useEffect(() => {
    if (isEditing) fetchAgentSkills();
  }, [isEditing, fetchAgentSkills]);

  useEffect(() => {
    if (isEditing) fetchFunctions();
  }, [isEditing, fetchFunctions]);

  useEffect(() => {
    fetchMcpTypes();
  }, [fetchMcpTypes]);

  useEffect(() => {
    if (isEditing) fetchMcpIntegrations();
  }, [isEditing, fetchMcpIntegrations]);

  useEffect(() => {
    fetchAvailableDocs();
  }, [fetchAvailableDocs]);

  useEffect(() => {
    if (isEditing) fetchAgentDocs();
  }, [isEditing, fetchAgentDocs]);

  useEffect(() => {
    if (!isEditing || !form.llmModel) return;
    if (modelOptions.some((m) => m.value === form.llmModel)) return;
    setModelOptions((prev) => {
      if (prev.some((m) => m.value === form.llmModel)) return prev;
      return [
        {
          value: form.llmModel,
          label: form.llmModel,
          providerLabel: "Legacy",
          provider: "legacy",
          note: "Compatibilidad",
          context: "Modelo existente",
        },
        ...prev,
      ];
    });
  }, [form.llmModel, isEditing, modelOptions]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const scrollToSection = (sectionId: NavId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast("El nombre del agente es requerido", "error");
      document.getElementById("agent-name")?.focus();
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: form.type,
      llmModel: form.llmModel,
      status: form.status,
      config: {
        systemPrompt: form.systemPrompt.trim() || null,
        temperature: form.temperature,
        maxTokens: customTokens ? parseInt(customTokensValue) || 2048 : form.maxTokens,
      },
    };
    try {
      let agentId = id;
      if (isEditing) {
        await apiClient.patch(`/api/v1/agents/${id}`, payload);
      } else {
        const { data } = await apiClient.post<Agent>("/api/v1/agents", payload);
        agentId = data.id;
      }
      // For new agents, persist skill assignments with the initial save
      if (agentId && !isEditing) {
        await apiClient.put(`/api/v1/agents/${agentId}/skills`, {
          skillIds: [...assignedSkillIds],
        });
      }
      toast(isEditing ? "Agente actualizado correctamente" : "Agente creado correctamente", "success");
      if (!isEditing) navigate(`/dashboard/agents/${agentId}`, { replace: true });
    } catch {
      toast("Error al guardar el agente", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/v1/agents/${id}`);
      toast("Agente eliminado", "success");
      navigate("/dashboard/agents");
    } catch {
      toast("Error al eliminar el agente", "error");
      setDeleting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex -mx-6 -mt-6 min-h-full items-center justify-center py-32" role="status" aria-label="Cargando agente…">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const inputCls =
    "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow";

  const navItems = isEditing
    ? [...NAV_ITEMS, { id: "danger" as NavId, label: "Zona de peligro", Icon: TriangleAlert, danger: true }]
    : NAV_ITEMS;

  return (
    <div className="flex flex-col -mx-6 -mt-6 min-h-full">
      {/* ── Sticky sub-header ── */}
      <header className="sticky -top-6 z-20 flex h-18 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/95 px-6 backdrop-blur-sm">
        <Link
          to="/dashboard/agents"
          className="flex items-center gap-1.5 text-base font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Agentes
        </Link>

        <div className="flex items-center gap-3">
          {isEditing && (
            <Link
              to={`/dashboard/agents/${id}/playground`}
              className={cn(
                "flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-base font-medium",
                "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              Probar
            </Link>
          )}

          <button
            type="button"
            role="switch"
            aria-checked={form.status === "activo"}
            aria-label={`Estado: ${form.status === "activo" ? "activo" : "inactivo"}`}
            onClick={() => set("status", form.status === "activo" ? "inactivo" : "activo")}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-[border-color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              form.status === "activo"
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-400"
                : "border-navy-300/70 bg-navy-50 text-navy-600 hover:bg-navy-100 dark:border-navy-600/50 dark:bg-navy-900/30 dark:text-navy-300 dark:hover:bg-navy-800/40"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                form.status === "activo"
                  ? "bg-emerald-500 motion-safe:animate-pulse"
                  : "bg-navy-400 dark:bg-navy-500"
              )}
              aria-hidden="true"
            />
            {form.status === "activo" ? "Activo" : "Inactivo"}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-base font-semibold",
              "bg-primary text-primary-foreground transition-[opacity] hover:opacity-90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              (saving || !form.name.trim()) && "opacity-50 cursor-not-allowed"
            )}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear agente"}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 gap-8 px-6 py-8">
        {/* Left nav */}
        <nav
          className="hidden lg:flex w-44 shrink-0 flex-col gap-0.5 sticky top-14 h-fit"
          aria-label="Secciones de configuración"
        >
          {navItems.map((item) => {
            const { id: sId, label, Icon } = item;
            const soon = "soon" in item ? item.soon : undefined;
            const danger = "danger" in item ? item.danger : undefined;
            return (
            <button
              key={sId}
              type="button"
              onClick={() => scrollToSection(sId)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-base transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                danger
                  ? activeSection === sId
                    ? "bg-destructive/10 text-destructive"
                    : "text-muted-foreground hover:bg-destructive/5 hover:text-destructive"
                  : activeSection === sId
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-current={activeSection === sId ? "true" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{label}</span>
              {soon && (
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Pronto
                </span>
              )}
            </button>
            );
          })}
        </nav>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-10 pb-20">

          {/* ── 1. Identity ── */}
          <SectionCard
            id="identity"
            Icon={UserRound}
            iconClass="bg-navy-100 text-navy-600 dark:bg-navy-800 dark:text-gold-400"
            title="Identidad"
            subtitle="Define el nombre y propósito de este agente"
          >
            <div className="space-y-5">
              <div>
                <label htmlFor="agent-name" className="mb-1.5 block text-base font-medium text-foreground">
                  Nombre del agente{" "}
                  <span className="text-destructive" aria-hidden="true">*</span>
                  <span className="sr-only">(requerido)</span>
                </label>
                <input
                  id="agent-name"
                  name="agentName"
                  type="text"
                  required
                  maxLength={255}
                  autoComplete="off"
                  spellCheck={false}
                  className={inputCls}
                  placeholder="Ej. Extractor de contratos legales…"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="agent-desc" className="block text-base font-medium text-foreground">
                    Descripción{" "}
                    <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setWizardOpen(true)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-sm font-medium text-primary",
                      "transition-colors hover:bg-primary/10 hover:border-primary/50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    <Wand2 className="h-3 w-3" aria-hidden="true" />
                    Generar con IA
                  </button>
                </div>
                <textarea
                  id="agent-desc"
                  name="agentDescription"
                  rows={3}
                  className={cn(inputCls, "resize-none")}
                  placeholder="¿Qué hace este agente? ¿Qué documentos procesa? ¿Quién lo usa?…"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>

              <AgentDescriptionWizard
                open={wizardOpen}
                onOpenChange={setWizardOpen}
                onGenerated={(text) => set("description", text)}
              />
            </div>
          </SectionCard>

          {/* ── 2. Intelligence / Model ── */}
          <SectionCard
            id="intelligence"
            Icon={Cpu}
            iconClass="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
            title="Inteligencia"
            subtitle="Configura el modelo LLM y los parámetros de generación"
          >
            <div className="space-y-8">
              <ModelCombobox
                value={form.llmModel}
                onChange={(v) => set("llmModel", v)}
                models={modelOptions}
              />

              <div className="border-t border-border pt-6">
                <TemperatureSlider
                  value={form.temperature}
                  onChange={(v) => set("temperature", v)}
                />
              </div>

              <div className="border-t border-border pt-6">
                <p className="mb-3 text-base font-medium text-foreground">
                  Máximo de tokens de salida
                </p>
                <div className="flex flex-wrap gap-2">
                  {MAX_TOKENS_PRESETS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        set("maxTokens", t);
                        setCustomTokens(false);
                      }}
                      className={cn(
                        "rounded-lg border px-3.5 py-1.5 text-base font-medium tabular-nums transition-[border-color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        !customTokens && form.maxTokens === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {t.toLocaleString()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomTokens(true)}
                    className={cn(
                      "rounded-lg border px-3.5 py-1.5 text-base font-medium transition-[border-color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      customTokens
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    Personalizado
                  </button>
                </div>
                {customTokens && (
                  <div className="mt-3">
                    <label htmlFor="custom-tokens" className="sr-only">
                      Tokens personalizados
                    </label>
                    <input
                      id="custom-tokens"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={128000}
                      className={cn(inputCls, "w-40 font-mono")}
                      placeholder="Ej. 16384"
                      value={customTokensValue}
                      onChange={(e) => setCustomTokensValue(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          {/* ── 3. Instructions / System prompt ── */}
          <SectionCard
            id="instructions"
            Icon={FileText}
            iconClass="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
            title="Instrucciones del sistema"
            subtitle="Define el comportamiento, tono y restricciones del agente"
          >
            <div className="space-y-4">
              <div className="relative">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <label htmlFor="system-prompt" className="text-base font-medium text-foreground">
                    Instrucciones del sistema
                  </label>
                  <button
                    type="button"
                    onClick={() => setPromptWizardOpen(true)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-sm font-medium text-primary",
                      "transition-colors hover:bg-primary/10 hover:border-primary/50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                  >
                    <Wand2 className="h-3 w-3" aria-hidden="true" />
                    Generar con IA
                  </button>
                </div>
                <textarea
                  id="system-prompt"
                  name="systemPrompt"
                  rows={10}
                  className={cn(inputCls, "resize-y font-mono text-sm leading-relaxed")}
                  placeholder="Eres un agente especializado en… Define aquí el comportamiento del agente."
                  value={form.systemPrompt}
                  onChange={(e) => set("systemPrompt", e.target.value)}
                />

                <AgentDescriptionWizard
                  mode="systemPrompt"
                  open={promptWizardOpen}
                  onOpenChange={setPromptWizardOpen}
                  onGenerated={(text) => set("systemPrompt", text)}
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    El system prompt define la personalidad, tono y restricciones del agente.
                  </p>
                  <span
                    className={cn(
                      "font-mono text-sm tabular-nums",
                      form.systemPrompt.length > 3500
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                    )}
                    aria-live="polite"
                  >
                    {form.systemPrompt.length.toLocaleString()} / 4 000
                  </span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── 4. Skills ── */}
          <SectionCard
            id="skills"
            Icon={Zap}
            iconClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-400"
            title="Habilidades"
            subtitle="Asigna instrucciones especializadas que se inyectan en el system prompt del agente"
            badge={
              assignedSkillIds.size > 0 ? (
                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                  {assignedSkillIds.size}
                </span>
              ) : undefined
            }
          >
            {availableSkills.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-10">
                <Sparkles className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-base text-muted-foreground">
                  Aún no hay skills disponibles.{" "}
                  <Link to="/dashboard/skills" className="font-medium text-primary hover:underline">
                    Crea tu primer skill
                  </Link>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Global skills */}
                {availableSkills.some((s) => s.isGlobal) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Globales
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {availableSkills.filter((s) => s.isGlobal).map((skill) => {
                        const selected = assignedSkillIds.has(skill.id);
                        return (
                          <button
                            key={skill.id}
                            type="button"
                            onClick={() => {
                              setAssignedSkillIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(skill.id)) next.delete(skill.id);
                                else next.add(skill.id);
                                return next;
                              });
                              setSkillsDirty(true);
                            }}
                            className={cn(
                              "flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-[border-color,background-color]",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              selected
                                ? "border-primary bg-primary/5"
                                : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30"
                            )}
                          >
                            <div className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                              selected ? "bg-primary/10" : "bg-muted"
                            )}>
                              <Sparkles className={cn("h-4 w-4", selected ? "text-primary" : "text-muted-foreground")} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-semibold text-foreground">{skill.name}</p>
                              {skill.description && (
                                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{skill.description}</p>
                              )}
                              {skill.category && (
                                <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {skill.category}
                                </span>
                              )}
                            </div>
                            {selected && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tenant skills */}
                {availableSkills.some((s) => !s.isGlobal) && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Mis skills
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {availableSkills.filter((s) => !s.isGlobal).map((skill) => {
                        const selected = assignedSkillIds.has(skill.id);
                        return (
                          <button
                            key={skill.id}
                            type="button"
                            onClick={() => {
                              setAssignedSkillIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(skill.id)) next.delete(skill.id);
                                else next.add(skill.id);
                                return next;
                              });
                              setSkillsDirty(true);
                            }}
                            className={cn(
                              "flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-[border-color,background-color]",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              selected
                                ? "border-emerald-500 bg-emerald-500/5"
                                : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30"
                            )}
                          >
                            <div className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                              selected ? "bg-emerald-500/10" : "bg-muted"
                            )}>
                              <Sparkles className={cn("h-4 w-4", selected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-base font-semibold text-foreground">{skill.name}</p>
                              {skill.description && (
                                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{skill.description}</p>
                              )}
                              {skill.category && (
                                <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {skill.category}
                                </span>
                              )}
                            </div>
                            {selected && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-sm text-muted-foreground">
                    {assignedSkillIds.size > 0
                      ? `${assignedSkillIds.size} skill${assignedSkillIds.size !== 1 ? "s" : ""} asignado${assignedSkillIds.size !== 1 ? "s" : ""} — se inyectarán en el system prompt al chatear.`
                      : "Ningún skill asignado — el agente usará solo su system prompt base."}
                  </p>
                  {isEditing && skillsDirty && (
                    <button
                      type="button"
                      onClick={saveSkills}
                      disabled={savingSkills}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold",
                        "bg-primary text-primary-foreground transition-opacity hover:opacity-90",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        savingSkills && "opacity-70 cursor-not-allowed"
                      )}
                    >
                      {savingSkills
                        ? <><Loader2 className="h-3 w-3 animate-spin" />Guardando…</>
                        : <><Check className="h-3 w-3" />Guardar habilidades</>}
                    </button>
                  )}
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── 5. Documents ── */}
          <SectionCard
            id="documents"
            Icon={FileText}
            iconClass="bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400"
            title="Documentos"
            subtitle="Asigna documentos vectorizados que el agente usará como contexto RAG al chatear"
            badge={
              assignedDocIds.size > 0 ? (
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                  {assignedDocIds.size}
                </span>
              ) : undefined
            }
          >
            {!isEditing ? (
              <p className="text-base text-muted-foreground">Guarda el agente para poder asignar documentos.</p>
            ) : availableDocs.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-10">
                <FileText className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-base text-muted-foreground">
                  No hay documentos listos.{" "}
                  <a href="/dashboard/documents" className="font-medium text-primary hover:underline">
                    Sube un documento
                  </a>{" "}
                  primero.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {availableDocs.map((doc) => {
                    const selected = assignedDocIds.has(doc.id);
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          setAssignedDocIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(doc.id)) next.delete(doc.id);
                            else next.add(doc.id);
                            return next;
                          });
                          setDocsDirty(true);
                        }}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-[border-color,background-color]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected
                            ? "border-teal-500 bg-teal-500/5"
                            : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30"
                        )}
                      >
                        <div className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          selected ? "bg-teal-500/10" : "bg-muted"
                        )}>
                          <FileText className={cn("h-4 w-4", selected ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground")} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-foreground">
                            {doc.fileName ?? "Sin nombre"}
                          </p>
                          {doc.description && (
                            <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{doc.description}</p>
                          )}
                          <div className="mt-1 flex items-center gap-2">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {doc.pageCount} pág.
                            </span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              {doc.documentType}
                            </span>
                          </div>
                        </div>
                        {selected && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-sm text-muted-foreground">
                    {assignedDocIds.size > 0
                      ? `${assignedDocIds.size} documento${assignedDocIds.size !== 1 ? "s" : ""} asignado${assignedDocIds.size !== 1 ? "s" : ""} — se usarán como contexto RAG.`
                      : "Ningún documento asignado — el agente no tendrá contexto de documentos."}
                  </p>
                  {docsDirty && (
                    <button
                      type="button"
                      onClick={saveDocs}
                      disabled={savingDocs}
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold",
                        "bg-teal-600 text-white transition-opacity hover:opacity-90",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        savingDocs && "opacity-70 cursor-not-allowed"
                      )}
                    >
                      {savingDocs
                        ? <><Loader2 className="h-3 w-3 animate-spin" />Guardando…</>
                        : <><Check className="h-3 w-3" />Guardar documentos</>}
                    </button>
                  )}
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── 6. Functions ── */}
          <SectionCard
            id="functions"
            Icon={Code2}
            iconClass="bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400"
            title="Function Calling"
            subtitle="Define funciones externas que el agente puede invocar para actuar en tus sistemas"
            badge={
              agentFunctions.length > 0 ? (
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                  {agentFunctions.length}
                </span>
              ) : undefined
            }
          >
            {!isEditing ? (
              <p className="text-base text-muted-foreground">Guarda el agente para poder agregar funciones.</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">{agentFunctions.length} función(es) configurada(s)</p>
                  <button
                    type="button"
                    onClick={() => openFnModal()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
                  >
                    <Plus className="h-3.5 w-3.5" /> Agregar función
                  </button>
                </div>

                {agentFunctions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
                    <Code2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                    <p className="text-base text-muted-foreground">
                      Aún no has definido funciones. Agrega una para permitir que el agente interactúe con tus APIs.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {agentFunctions.map((fn) => (
                      <div
                        key={fn.id}
                        className={cn(
                          "flex items-center justify-between rounded-xl border p-3 transition-colors",
                          fn.isActive
                            ? "border-sky-200 bg-sky-50/50 dark:border-sky-800/40 dark:bg-sky-900/10"
                            : "border-border bg-muted/20 opacity-60"
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-sky-100 px-1.5 py-0.5 font-mono text-sm font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                              {fn.webhookMethod}
                            </span>
                            <span className="text-base font-semibold text-foreground">{fn.name}</span>
                          </div>
                          {fn.description && (
                            <p className="mt-0.5 text-sm text-muted-foreground truncate">{fn.description}</p>
                          )}
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground/70 truncate">
                            <ExternalLink className="h-3 w-3" />
                            {fn.webhookUrl}
                          </p>
                        </div>
                        <div className="ml-3 flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleFnActive(fn)}
                            title={fn.isActive ? "Desactivar" : "Activar"}
                            className={cn(
                              "rounded-lg p-1.5 transition-colors",
                              fn.isActive ? "text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30" : "text-muted-foreground hover:bg-muted"
                            )}
                          >
                            <Power className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openFnModal(fn)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteFn(fn.id)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </SectionCard>

          {/* Functions Modal */}
          {fnModalOpen && createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-foreground">{editingFnId ? "Editar función" : "Nueva función"}</h3>
                  <button type="button" onClick={() => setFnModalOpen(false)} className="rounded-lg p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-muted-foreground">Nombre (snake_case)</label>
                    <input
                      value={fnForm.name}
                      onChange={(e) => setFnForm({ ...fnForm, name: e.target.value })}
                      placeholder="buscar_cliente"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-muted-foreground">Descripción</label>
                    <input
                      value={fnForm.description}
                      onChange={(e) => setFnForm({ ...fnForm, description: e.target.value })}
                      placeholder="Busca un cliente por RFC o nombre"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-muted-foreground">URL del webhook</label>
                      <input
                        value={fnForm.webhookUrl}
                        onChange={(e) => setFnForm({ ...fnForm, webhookUrl: e.target.value })}
                        placeholder="https://api.example.com/search"
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-sky-500/30"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-muted-foreground">Método</label>
                        <select
                          value={fnForm.webhookMethod}
                          onChange={(e) => setFnForm({ ...fnForm, webhookMethod: e.target.value })}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-sky-500/30"
                        >
                          <option>POST</option>
                          <option>GET</option>
                          <option>PUT</option>
                          <option>PATCH</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-muted-foreground">Timeout (ms)</label>
                        <input
                          type="number"
                          value={fnForm.timeoutMs}
                          onChange={(e) => setFnForm({ ...fnForm, timeoutMs: parseInt(e.target.value) || 10000 })}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-sky-500/30"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-muted-foreground">Parameters (JSON Schema)</label>
                    <textarea
                      value={fnForm.parameters}
                      onChange={(e) => setFnForm({ ...fnForm, parameters: e.target.value })}
                      rows={6}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-muted-foreground">Headers (JSON, se encriptan)</label>
                    <textarea
                      value={fnForm.webhookHeaders}
                      onChange={(e) => setFnForm({ ...fnForm, webhookHeaders: e.target.value })}
                      rows={2}
                      placeholder='{"Authorization": "Bearer ..."}'
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setFnModalOpen(false)} className="rounded-lg border border-border px-4 py-2 text-base font-medium hover:bg-muted">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveFn}
                    disabled={savingFn || !fnForm.name || !fnForm.webhookUrl}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
                  >
                    {savingFn && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editingFnId ? "Guardar cambios" : "Crear función"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* ── 6. MCP ── */}
          <SectionCard
            id="mcp"
            Icon={Network}
            iconClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
            title="Integraciones MCP"
            subtitle="Conecta servidores MCP para expandir las capacidades del agente con herramientas externas"
            badge={
              mcpIntegrations.filter((i) => i.isActive).length > 0 ? (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                  {mcpIntegrations.filter((i) => i.isActive).length}
                </span>
              ) : undefined
            }
          >
            {!isEditing ? (
              <p className="text-base text-muted-foreground">Guarda el agente para poder configurar integraciones MCP.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
                {mcpTypes.map((typeInfo) => {
                  const existing = mcpIntegrations.find((i) => i.type === typeInfo.type);
                  const badge = PLANNED_MCP.find((p) => p.label === typeInfo.label)?.badge ?? typeInfo.type.slice(0, 3).toUpperCase();
                  return (
                    <div
                      key={typeInfo.type}
                      className={cn(
                        "group relative flex flex-col gap-1.5 rounded-xl border p-3.5 transition-colors cursor-pointer",
                        existing?.isActive
                          ? "border-indigo-200 bg-indigo-50/50 dark:border-indigo-800/40 dark:bg-indigo-900/10"
                          : existing
                          ? "border-border bg-muted/20 opacity-70"
                          : "border-border bg-muted/20 hover:border-indigo-300 hover:bg-indigo-50/30 dark:hover:border-indigo-700/50"
                      )}
                      onClick={() => openMcpModal(typeInfo, existing)}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                          existing?.isActive
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {badge}
                        </span>
                        <span className="text-base font-semibold text-foreground">{typeInfo.label}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{typeInfo.description}</span>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground/60">{typeInfo.tools} tools</span>
                        {existing && (
                          <span className={cn(
                            "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                            existing.isActive
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {existing.isActive ? "Activo" : "Inactivo"}
                          </span>
                        )}
                      </div>
                      {existing && (
                        <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleMcpActive(existing); }}
                            className={cn("rounded p-1", existing.isActive ? "text-emerald-600 hover:bg-emerald-100" : "text-muted-foreground hover:bg-muted")}
                          >
                            <Power className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); deleteMcpIntegration(existing.id); }}
                            className="rounded p-1 text-muted-foreground hover:bg-red-100 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {/* MCP Config Modal */}
          {mcpModalOpen && mcpModalType && createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-foreground">
                    {mcpEditingId ? "Editar" : "Configurar"} {mcpModalType.label}
                  </h3>
                  <button type="button" onClick={() => setMcpModalOpen(false)} className="rounded-lg p-1.5 hover:bg-muted">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="mb-4 text-sm text-muted-foreground">{mcpModalType.description}</p>

                <div className="space-y-3">
                  {Object.entries(mcpModalType.configSchema).map(([key, schema]) => (
                    <div key={key}>
                      <label className="mb-1 block text-sm font-semibold text-muted-foreground">
                        {schema.label}{schema.required ? " *" : ""}
                      </label>
                      <input
                        value={mcpConfig[key] ?? ""}
                        onChange={(e) => setMcpConfig({ ...mcpConfig, [key]: e.target.value })}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>
                  ))}

                  {Object.keys(mcpModalType.secretsSchema).length > 0 && (
                    <div className="border-t border-border pt-3">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Credenciales (se encriptan con AES-256)
                      </p>
                      {Object.entries(mcpModalType.secretsSchema).map(([key, schema]) => (
                        <div key={key} className="mb-2">
                          <label className="mb-1 block text-sm font-semibold text-muted-foreground">
                            {schema.label}{schema.required ? " *" : ""}
                          </label>
                          <input
                            type={schema.sensitive ? "password" : "text"}
                            value={mcpSecrets[key] ?? ""}
                            onChange={(e) => setMcpSecrets({ ...mcpSecrets, [key]: e.target.value })}
                            placeholder={mcpEditingId ? "Dejar vacío para mantener" : ""}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-indigo-500/30"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => setMcpModalOpen(false)} className="rounded-lg border border-border px-4 py-2 text-base font-medium hover:bg-muted">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveMcpIntegration}
                    disabled={savingMcp}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {savingMcp && <Loader2 className="h-4 w-4 animate-spin" />}
                    {mcpEditingId ? "Guardar cambios" : "Activar integración"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* ── 7. Schedules ── */}
          <SectionCard
            id="schedules"
            Icon={Calendar}
            iconClass="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
            title="Schedules"
            subtitle="Programa la ejecución automática de funciones del agente"
          >
            {!isEditing ? (
              <p className="text-base text-muted-foreground">Guarda el agente para configurar schedules.</p>
            ) : (
              <ScheduleList
                agentId={id!}
                functions={agentFunctions.filter((f) => f.isActive).map((f) => ({
                  id: f.id,
                  name: f.name,
                  description: f.description,
                }))}
              />
            )}
          </SectionCard>

          {/* ── 8. WhatsApp Channels ── */}
          <SectionCard
            id="whatsapp"
            Icon={MessageCircle}
            iconClass="bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400"
            title="Canales WhatsApp"
            subtitle="Conecta una línea WhatsApp a este agente para chat bidireccional"
          >
            {!isEditing ? (
              <p className="text-base text-muted-foreground">Guarda el agente para configurar canales WhatsApp.</p>
            ) : (
              <AgentWhatsappSection agentId={id!} />
            )}
          </SectionCard>

          {/* ── 9. Telegram Channels ── */}
          <SectionCard
            id="telegram"
            Icon={Send}
            iconClass="bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400"
            title="Canales Telegram"
            subtitle="Conecta un bot de Telegram a este agente para chat bidireccional"
          >
            {!isEditing ? (
              <p className="text-base text-muted-foreground">Guarda el agente para configurar canales Telegram.</p>
            ) : (
              <AgentTelegramSection agentId={id!} />
            )}
          </SectionCard>

          {/* ── 10. Danger zone (edit only) ── */}
          {isEditing && (
            <section
              id="danger"
              aria-labelledby="danger-title"
              className="scroll-mt-20"
            >
              <div className="mb-4 flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <TriangleAlert className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="danger-title" className="font-display text-lg font-semibold text-foreground">
                    Zona de peligro
                  </h2>
                  <p className="mt-0.5 text-base text-muted-foreground">
                    Acciones destructivas e irreversibles sobre este agente
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-sm dark:shadow-none">
                {!confirmDelete ? (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-base font-medium text-foreground">Eliminar agente</p>
                      <p className="mt-0.5 text-base text-muted-foreground">
                        Elimina este agente y toda su configuración de forma permanente.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2.5 text-base font-semibold",
                        "text-destructive transition-[background-color] hover:bg-destructive/5",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                      )}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Eliminar agente
                    </button>
                  </div>
                ) : (
                  <DeleteConfirm
                    agentName={agent?.name ?? form.name}
                    onConfirm={handleDelete}
                    onCancel={() => setConfirmDelete(false)}
                    deleting={deleting}
                  />
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
