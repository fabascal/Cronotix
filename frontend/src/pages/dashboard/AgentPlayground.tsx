import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Check,
  ChevronDown,
  Cpu,
  Loader2,
  RotateCcw,
  Save,
  Send,
  Thermometer,
  User,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient, API_BASE_URL } from "@/lib/apiClient";
import { useToast } from "@/context/ToastContext";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AgentConfig {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

interface Agent {
  id: string;
  name: string;
  description?: string;
  type: string;
  llmModel: string;
  status: string;
  config?: AgentConfig;
}

interface ToolEvent {
  type: "call" | "result";
  name: string;
  data: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  error?: boolean;
  toolEvents?: ToolEvent[];
}

interface SseChunk {
  chunk?: string;
  error?: string;
  toolCall?: { name: string; arguments: Record<string, unknown> };
  toolResult?: { name: string; result: string };
}

// ─── Constants ─────────────────────────────────────────────────────────────

const MAX_TOKENS_PRESETS = [512, 1024, 2048, 4096, 8192];

function msgId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── TemperatureSlider (local copy, same as AgentDetail) ───────────────────

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
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor="pg-temperature"
          className="flex items-center gap-1.5 text-base font-medium text-foreground"
        >
          <Thermometer className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          Temperatura
        </label>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm text-muted-foreground tabular-nums">
            {value.toFixed(2)}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", labelMeta.cls)}>
            {labelMeta.text}
          </span>
        </div>
      </div>
      <div className="relative flex h-7 items-center">
        <div
          className="absolute h-1.5 w-full rounded-full"
          style={{
            background:
              "linear-gradient(to right, #3b82f6 0%, #10b981 35%, #f59e0b 68%, #ef4444 100%)",
          }}
          aria-hidden="true"
        />
        <input
          id="pg-temperature"
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="relative z-10 h-1.5 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md"
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0 · Preciso</span>
        <span>1 · Creativo</span>
        <span>2 · Exp.</span>
      </div>
    </div>
  );
}

// ─── Message Bubble ─────────────────────────────────────────────────────────

function MessageBubble({ msg, streaming }: { msg: Message; streaming?: boolean }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm",
          isUser
            ? "bg-primary/20 text-primary"
            : msg.error
            ? "bg-red-500/20 text-red-400"
            : "bg-secondary text-secondary-foreground"
        )}
        aria-hidden="true"
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-base leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : msg.error
            ? "bg-red-950/60 border border-red-500/40 text-red-100 rounded-tl-sm"
            : "bg-card border border-border text-foreground rounded-tl-sm"
        )}
      >
        <p className="whitespace-pre-wrap break-words">
          {msg.content}
          {streaming && (
            <span
              className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-[1px] bg-current align-middle"
              style={{ animation: "cursor-blink 1s step-start infinite" }}
              aria-hidden="true"
            />
          )}
        </p>
      </div>
    </div>
  );
}

// ─── Thinking bubble ────────────────────────────────────────────────────────

function ThinkingBubble() {
  return (
    <div className="flex gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <Bot className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-card border border-border px-4 py-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            style={{ animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Tool Events Display ─────────────────────────────────────────────────────

function ToolEventsBubble({ events }: { events: ToolEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  const calls = events.filter((e) => e.type === "call");
  const results = events.filter((e) => e.type === "result");
  const allResolved = calls.length > 0 && results.length >= calls.length;

  return (
    <div className="flex gap-2.5">
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        allResolved
          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
          : "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400"
      )}>
        {allResolved
          ? <Check className="h-3.5 w-3.5" aria-hidden="true" />
          : <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
      </div>
      <div className={cn(
        "max-w-[80%] rounded-2xl rounded-tl-sm border px-4 py-2.5",
        allResolved
          ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-900/10"
          : "border-sky-200 bg-sky-50/50 dark:border-sky-800/40 dark:bg-sky-900/10"
      )}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex items-center gap-1.5 text-sm font-semibold",
            allResolved
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-sky-700 dark:text-sky-300"
          )}
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
          {allResolved
            ? `${calls.length} herramienta(s) completada(s)`
            : `Procesando ${calls.length} herramienta(s)…`}
        </button>
        {expanded && (
          <div className="mt-2 space-y-1.5">
            {calls.map((call, i) => {
              const hasResult = results.some((r) => r.name === call.name);
              const resultData = results.find((r) => r.name === call.name)?.data ?? "";
              const isError = resultData.includes('"error"');
              return (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-background/80 px-2.5 py-1.5 text-sm">
                  {hasResult
                    ? isError
                      ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      : <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    : <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />}
                  <span className="font-medium text-foreground">{call.name}</span>
                  <span className={cn(
                    "ml-auto text-[10px] font-semibold",
                    hasResult
                      ? isError ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                  )}>
                    {hasResult ? (isError ? "Error" : "OK") : "Ejecutando…"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AgentPlayground() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  // Agent data
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  // Playground config (local overrides, not saved until user clicks Save)
  const [systemPrompt, setSystemPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [customTokens, setCustomTokens] = useState(false);
  const [customTokensValue, setCustomTokensValue] = useState("2048");

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [saving, setSaving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Load agent ─────────────────────────────────────────────────────────

  const fetchAgent = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await apiClient.get<Agent>(`/api/v1/agents/${id}`);
      setAgent(data);
      const cfg = data.config ?? {};
      setSystemPrompt(cfg.systemPrompt ?? "");
      setTemperature(cfg.temperature ?? 0.7);
      const tokens = cfg.maxTokens ?? 2048;
      setMaxTokens(tokens);
      if (!MAX_TOKENS_PRESETS.includes(tokens)) {
        setCustomTokens(true);
        setCustomTokensValue(String(tokens));
      }
    } catch {
      toast("No se pudo cargar el agente", "error");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { fetchAgent(); }, [fetchAgent]);

  // ── Auto-scroll ────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking, streaming]);

  // ── Send message (streaming) ────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || thinking || streaming || !id) return;

    const userMsg: Message = { id: msgId(), role: "user", content: text };
    const history = messages
      .filter((m) => m.role !== "tool")
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    const effectiveTokens = customTokens ? parseInt(customTokensValue) || 2048 : maxTokens;
    const assistantMsgId = msgId();
    let started = false;
    let textStarted = false;

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE_URL}/api/v1/agents/${id}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          history,
          systemPrompt: systemPrompt || undefined,
          temperature,
          maxTokens: effectiveTokens,
        }),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(errData?.message ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";
      let currentEvent = "data";
      // ID for the live tool-events bubble (created on first tool_call)
      const toolBubbleId = msgId();
      let toolBubbleAdded = false;
      const liveToolEvents: ToolEvent[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();

          if (trimmed.startsWith("event: ")) {
            currentEvent = trimmed.slice(7).trim();
            continue;
          }

          if (!trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          if (payload === "[DONE]") {
            setStreaming(false);
            break;
          }

          try {
            const json = JSON.parse(payload) as SseChunk;
            if (json.error) throw new Error(json.error);

            if (currentEvent === "tool_call" && json.toolCall) {
              const ev: ToolEvent = {
                type: "call",
                name: json.toolCall.name,
                data: JSON.stringify(json.toolCall.arguments, null, 2),
              };
              liveToolEvents.push(ev);
              if (!toolBubbleAdded) {
                // First tool event: stop thinking and create the tool bubble immediately
                toolBubbleAdded = true;
                started = true;
                setThinking(false);
                setMessages((prev) => [
                  ...prev,
                  { id: toolBubbleId, role: "tool" as const, content: "", toolEvents: [ev] },
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === toolBubbleId
                      ? { ...m, toolEvents: [...liveToolEvents] }
                      : m
                  )
                );
              }
              currentEvent = "data";
              continue;
            }

            if (currentEvent === "tool_result" && json.toolResult) {
              const ev: ToolEvent = {
                type: "result",
                name: json.toolResult.name,
                data: json.toolResult.result,
              };
              liveToolEvents.push(ev);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === toolBubbleId
                    ? { ...m, toolEvents: [...liveToolEvents] }
                    : m
                )
              );
              currentEvent = "data";
              continue;
            }

            if (json.chunk !== undefined) {
              content += json.chunk;
              if (!textStarted) {
                textStarted = true;
                started = true;
                setThinking(false);
                setStreaming(true);
                setMessages((prev) => [
                  ...prev,
                  { id: assistantMsgId, role: "assistant", content },
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantMsgId ? { ...m, content } : m))
                );
              }
            }
          } catch (parseErr) {
            if (parseErr instanceof Error) throw parseErr;
          }

          currentEvent = "data";
        }
      }

      if (!started) {
        setMessages((prev) => [
          ...prev,
          { id: assistantMsgId, role: "assistant", content: "(respuesta vacía)" },
        ]);
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "Error al comunicarse con el agente";
      if (textStarted) {
        // Text was streaming — append error note to the assistant bubble
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: m.content + "\n\n⚠ Se interrumpió la respuesta.", error: true }
              : m
          )
        );
      } else {
        // No text yet — add a new error bubble (tool events bubble may already be visible)
        setMessages((prev) => [
          ...prev,
          { id: assistantMsgId, role: "assistant", content: errMsg, error: true },
        ]);
      }
      toast(errMsg, "error");
    } finally {
      setThinking(false);
      setStreaming(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, thinking, streaming, id, messages, systemPrompt, temperature, maxTokens, customTokens, customTokensValue, toast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  // ── Save config ────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!id || !agent) return;
    setSaving(true);
    const effectiveTokens = customTokens
      ? parseInt(customTokensValue) || 2048
      : maxTokens;
    try {
      await apiClient.patch(`/api/v1/agents/${id}`, {
        config: {
          systemPrompt: systemPrompt.trim() || null,
          temperature,
          maxTokens: effectiveTokens,
        },
      });
      toast("Configuración guardada", "success");
    } catch {
      toast("No se pudo guardar la configuración", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-muted-foreground">Agente no encontrado.</p>
        <Link
          to="/dashboard/agents"
          className="text-base font-medium text-primary hover:underline"
        >
          Volver a Agentes
        </Link>
      </div>
    );
  }

  const effectiveTokens = customTokens
    ? parseInt(customTokensValue) || 2048
    : maxTokens;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card/50 px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/dashboard/agents/${id}`}
            className="flex items-center gap-1.5 text-base text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Volver al agente</span>
          </Link>
          <span className="text-muted-foreground/40" aria-hidden="true">/</span>
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate font-semibold text-foreground">{agent.name}</span>
            <span className="hidden shrink-0 items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground sm:flex">
              <Cpu className="h-3 w-3" aria-hidden="true" />
              {agent.llmModel}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-500">
            Playground
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Config panel ── */}
        <aside className="hidden w-72 shrink-0 flex-col gap-0 overflow-y-auto border-r border-border bg-card/30 lg:flex">
          <div className="flex flex-col gap-5 p-5">
            {/* Temperature */}
            <TemperatureSlider value={temperature} onChange={setTemperature} />

            {/* Max tokens */}
            <div className="space-y-2">
              <p className="text-base font-medium text-foreground">Máx. tokens de salida</p>
              <div className="flex flex-wrap gap-1.5">
                {MAX_TOKENS_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setMaxTokens(t); setCustomTokens(false); }}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-sm font-medium tabular-nums transition-[border-color,background-color]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      !customTokens && maxTokens === t
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
                    "rounded-md border px-2.5 py-1 text-sm font-medium transition-[border-color,background-color]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    customTokens
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  Custom
                </button>
              </div>
              {customTokens && (
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={128000}
                  value={customTokensValue}
                  onChange={(e) => setCustomTokensValue(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-base font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Ej. 16384"
                />
              )}
            </div>

            {/* System prompt */}
            <div className="space-y-2">
              <label
                htmlFor="pg-system-prompt"
                className="text-base font-medium text-foreground"
              >
                Instrucciones del sistema
              </label>
              <textarea
                id="pg-system-prompt"
                rows={8}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Eres un agente especializado en…"
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="text-[11px] text-muted-foreground">
                Los cambios son temporales hasta que guardes.
              </p>
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-auto flex flex-col gap-2 border-t border-border p-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-base font-semibold",
                "bg-primary text-primary-foreground transition-[opacity] hover:opacity-90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                saving && "opacity-50 cursor-not-allowed"
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={() => setMessages([])}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Nueva conversación
            </button>
          </div>
        </aside>

        {/* ── Chat area ── */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-5 sm:px-6"
            role="log"
            aria-label="Conversación con el agente"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card">
                  <Bot className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{agent.name}</p>
                  <p className="max-w-xs text-base text-muted-foreground">
                    {agent.description ||
                      "Envía un mensaje para comenzar la conversación."}
                  </p>
                </div>
                {effectiveTokens !== 2048 || temperature !== 0.7 ? (
                  <div className="flex flex-wrap justify-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-md border border-border bg-muted px-2 py-0.5">
                      Temperatura: {temperature.toFixed(2)}
                    </span>
                    <span className="rounded-md border border-border bg-muted px-2 py-0.5">
                      Máx. tokens: {effectiveTokens.toLocaleString()}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((msg, idx) => {
                  if (msg.role === "tool" && msg.toolEvents) {
                    return <ToolEventsBubble key={msg.id} events={msg.toolEvents} />;
                  }
                  return (
                    <MessageBubble
                      key={msg.id}
                      msg={msg}
                      streaming={
                        streaming &&
                        idx === messages.length - 1 &&
                        msg.role === "assistant"
                      }
                    />
                  );
                })}
                {thinking && <ThinkingBubble />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input bar */}
          <div className="shrink-0 border-t border-border bg-card/30 px-4 py-3 sm:px-6">
            {/* Mobile config strip */}
            <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1 lg:hidden">
              <span className="shrink-0 text-[11px] text-muted-foreground">Temp: {temperature.toFixed(1)}</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-border focus-visible:outline-none"
                aria-label="Temperatura (móvil)"
              />
              <span className="shrink-0 text-[11px] text-muted-foreground">
                Tokens: {effectiveTokens.toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => setMessages([])}
                className="ml-auto shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Nueva conversación"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                }}
                onKeyDown={handleKeyDown}
                disabled={thinking || streaming}
                placeholder={`Mensaje a ${agent.name}…`}
                className={cn(
                  "flex-1 resize-none overflow-hidden rounded-xl border border-input bg-background px-4 py-2.5 text-base leading-relaxed",
                  "text-foreground placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                style={{ minHeight: "42px", maxHeight: "160px" }}
                aria-label="Escribe un mensaje"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!input.trim() || thinking || streaming}
                aria-label="Enviar mensaje"
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  "bg-primary text-primary-foreground transition-[opacity] hover:opacity-90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  (!input.trim() || thinking || streaming) && "opacity-40 cursor-not-allowed"
                )}
              >
                {thinking || streaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Enter para enviar · Shift+Enter para nueva línea
            </p>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
