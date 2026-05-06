import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Server,
  Sparkles,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/context/ToastContext";

type ProviderTab = "openai" | "ollama" | "gemini";

interface ProvidersPayload {
  openai: {
    enabled: boolean;
    baseUrl: string | null;
    hasValue: boolean;
    hint: string | null;
  };
  ollama: { enabled: boolean; baseUrl: string };
  gemini: { enabled: boolean; hasValue: boolean; hint: string | null };
}

interface SettingsResponse {
  hasTenant: boolean;
  encryptionConfigured: boolean;
  providers: ProvidersPayload;
}

interface LlmModelTemplate {
  id: string;
  provider: ProviderTab;
  acronym: string;
  modelId: string;
  displayName: string | null;
  enabled: boolean;
  isSystemModel?: boolean;
}

interface ProviderModelsResponse {
  ok: boolean;
  provider: ProviderTab;
  modelsListed: number;
  models: string[];
}

const TABS: {
  id: ProviderTab;
  label: string;
  Icon: React.ElementType;
  desc: string;
}[] = [
  {
    id: "openai",
    label: "OpenAI",
    Icon: Sparkles,
    desc: "API oficial y compatible OpenAI",
  },
  {
    id: "ollama",
    label: "Ollama",
    Icon: Server,
    desc: "Modelos locales vía HTTP",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    Icon: Cpu,
    desc: "API Google Generative AI",
  },
];

export default function ModelSettings() {
  const { toast } = useToast();
  const [tab, setTab] = useState<ProviderTab>("openai");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SettingsResponse | null>(null);

  const [openaiEnabled, setOpenaiEnabled] = useState(false);
  const [openaiBase, setOpenaiBase] = useState("https://api.openai.com/v1");
  const [openaiKey, setOpenaiKey] = useState("");

  const [ollamaEnabled, setOllamaEnabled] = useState(false);
  const [ollamaBase, setOllamaBase] = useState("http://127.0.0.1:11434");

  const [geminiEnabled, setGeminiEnabled] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [models, setModels] = useState<LlmModelTemplate[]>([]);
  const [newModelId, setNewModelId] = useState("");
  const [newModelName, setNewModelName] = useState("");

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [creatingModel, setCreatingModel] = useState(false);
  const [settingSystemModel, setSettingSystemModel] = useState<string | null>(null);
  const [listingModels, setListingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<Record<ProviderTab, string[]>>({
    openai: [],
    ollama: [],
    gemini: [],
  });

  const getApiMessage = (e: unknown, fallback: string) => {
    if (!(e && typeof e === "object" && "response" in e)) return fallback;
    const message = (e as { response?: { data?: { message?: unknown } } }).response?.data?.message;
    if (Array.isArray(message)) return message.map(String).join(", ");
    if (typeof message === "string" && message.trim()) return message;
    return fallback;
  };

  const load = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get<SettingsResponse>("/api/v1/settings/llm");
      setData(res);
      const p = res.providers;
      setOpenaiEnabled(p.openai.enabled);
      setOpenaiBase(p.openai.baseUrl ?? "https://api.openai.com/v1");
      setOpenaiKey("");
      setOllamaEnabled(p.ollama.enabled);
      setOllamaBase(p.ollama.baseUrl);
      setGeminiEnabled(p.gemini.enabled);
      setGeminiKey("");
      if (res.hasTenant) {
        const { data: modelRes } = await apiClient.get<{ items: LlmModelTemplate[] }>("/api/v1/settings/llm/models");
        setModels(modelRes.items);
      } else {
        setModels([]);
      }
    } catch {
      toast("No se pudo cargar la configuración de modelos", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const inputCls =
    "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  async function saveOpenAI() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        openai: {
          enabled: openaiEnabled,
          baseUrl: openaiBase.trim() || null,
        },
      };
      if (openaiKey.trim()) (body.openai as Record<string, unknown>).apiKey = openaiKey.trim();
      const { data: res } = await apiClient.put<SettingsResponse>("/api/v1/settings/llm", body);
      setData(res);
      setOpenaiKey("");
      toast("Configuración de OpenAI guardada", "success");
    } catch (e: unknown) {
      toast(getApiMessage(e, "Error al guardar"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function clearOpenAIKey() {
    setSaving(true);
    try {
      const { data: res } = await apiClient.put<SettingsResponse>("/api/v1/settings/llm", {
        openai: { enabled: openaiEnabled, baseUrl: openaiBase.trim() || null, apiKey: "" },
      });
      setData(res);
      setOpenaiKey("");
      toast("Clave de OpenAI eliminada", "success");
    } catch {
      toast("Error al eliminar la clave", "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveOllama() {
    setSaving(true);
    try {
      const { data: res } = await apiClient.put<SettingsResponse>("/api/v1/settings/llm", {
        ollama: { enabled: ollamaEnabled, baseUrl: ollamaBase.trim() },
      });
      setData(res);
      toast("Configuración de Ollama guardada", "success");
    } catch {
      toast("Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveGemini() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        gemini: { enabled: geminiEnabled },
      };
      if (geminiKey.trim()) (body.gemini as Record<string, unknown>).apiKey = geminiKey.trim();
      const { data: res } = await apiClient.put<SettingsResponse>("/api/v1/settings/llm", body);
      setData(res);
      setGeminiKey("");
      toast("Configuración de Gemini guardada", "success");
    } catch {
      toast("Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function clearGeminiKey() {
    setSaving(true);
    try {
      const { data: res } = await apiClient.put<SettingsResponse>("/api/v1/settings/llm", {
        gemini: { enabled: geminiEnabled, apiKey: "" },
      });
      setData(res);
      setGeminiKey("");
      toast("Clave de Gemini eliminada", "success");
    } catch {
      toast("Error al eliminar la clave", "error");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection(provider: ProviderTab) {
    setTesting(true);
    try {
      const body = getProviderPayload(provider);
      const { data: res } = await apiClient.post<{
        ok: boolean;
        message: string;
        detail?: { modelsListed?: number; baseUrl?: string; sampleModels?: string[] };
      }>(`/api/v1/settings/llm/${provider}/test`, body);
      const sample = res.detail?.sampleModels?.slice(0, 3).join(", ");
      toast(
        `${res.message}${res.detail?.modelsListed != null ? ` · ${res.detail.modelsListed} modelos` : ""}${sample ? ` · ${sample}` : ""}`,
        "success"
      );
    } catch (e: unknown) {
      toast(getApiMessage(e, "Error en la prueba de conexión"), "error");
    } finally {
      setTesting(false);
    }
  }

  const getProviderPayload = (provider: ProviderTab): { apiKey?: string; baseUrl?: string } => {
    const body: { apiKey?: string; baseUrl?: string } = {};
    if (provider === "openai") {
      if (openaiKey.trim()) body.apiKey = openaiKey.trim();
      body.baseUrl = openaiBase.trim();
    } else if (provider === "ollama") {
      body.baseUrl = ollamaBase.trim();
    } else if (provider === "gemini") {
      if (geminiKey.trim()) body.apiKey = geminiKey.trim();
    }
    return body;
  };

  async function listProviderModels(provider: ProviderTab) {
    setListingModels(true);
    try {
      const body = getProviderPayload(provider);
      const { data: res } = await apiClient.post<ProviderModelsResponse>(
        `/api/v1/settings/llm/${provider}/models`,
        body
      );
      setAvailableModels((prev) => ({ ...prev, [provider]: res.models || [] }));
      if (!newModelId.trim() && Array.isArray(res.models) && res.models.length > 0) {
        setNewModelId(res.models[0]);
      }
      toast(
        res.models.length > 0
          ? `${res.models.length} modelos disponibles en ${provider}`
          : `No se encontraron modelos disponibles en ${provider}`,
        "success"
      );
    } catch (e: unknown) {
      toast(getApiMessage(e, "No se pudo listar modelos disponibles"), "error");
    } finally {
      setListingModels(false);
    }
  }

  async function createModelTemplate(provider: ProviderTab) {
    const modelId = newModelId.trim();
    if (!modelId) {
      toast("Escribe un modelId (ej: gpt-5.4, gemini-1.5-pro, deepseek-r1)", "error");
      return;
    }
    setCreatingModel(true);
    try {
      await apiClient.post("/api/v1/settings/llm/models", {
        provider,
        modelId,
        displayName: newModelName.trim() || undefined,
      });
      setNewModelId("");
      setNewModelName("");
      const { data: modelRes } = await apiClient.get<{ items: LlmModelTemplate[] }>("/api/v1/settings/llm/models");
      setModels(modelRes.items);
      toast("Template de modelo creado", "success");
    } catch (e: unknown) {
      toast(getApiMessage(e, "No se pudo crear el template del modelo"), "error");
    } finally {
      setCreatingModel(false);
    }
  }

  async function setSystemModel(modelId: string) {
    setSettingSystemModel(modelId);
    try {
      const { data: modelRes } = await apiClient.post<{ items: LlmModelTemplate[] }>(
        `/api/v1/settings/llm/models/${modelId}/set-system-model`
      );
      setModels(modelRes.items);
      toast("Modelo del sistema actualizado", "success");
    } catch (e: unknown) {
      toast(getApiMessage(e, "No se pudo designar el modelo del sistema"), "error");
    } finally {
      setSettingSystemModel(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24" role="status" aria-label="Cargando…">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-base text-muted-foreground" role="alert">
        No se pudo cargar la configuración. Revisa la conexión e intenta de nuevo.
      </p>
    );
  }

  const p = data.providers;
  const noTenant = data && !data.hasTenant;
  const noEncryption = data && !data.encryptionConfigured;
  const tabModels = models.filter((m) => m.provider === tab);

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <header>
        <h1 className="font-display text-3xl font-semibold text-foreground text-pretty">
          Modelos IA
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Configura y valida las conexiones con OpenAI, Ollama (local) y Google Gemini.
        </p>
      </header>

      {noTenant && (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-base text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            Tu usuario no tiene un espacio de trabajo (tenant) asignado. Asigna un tenant en la
            base de datos para poder guardar claves y probar conexiones.
          </p>
        </div>
      )}

      {noEncryption && data?.hasTenant && (
        <div
          role="alert"
          className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-base text-destructive"
        >
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            El servidor no tiene <code className="rounded bg-muted px-1 py-0.5 text-sm">ENCRYPTION_KEY</code>{" "}
            (64 caracteres hex). No se pueden guardar claves hasta configurarla.
          </p>
        </div>
      )}

      {/* Vertical selector — 3 columnas en desktop */}
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav
          className="flex flex-col gap-1 lg:sticky lg:top-0 lg:self-start"
          aria-label="Proveedores de modelos"
        >
          {TABS.map(({ id, label, Icon, desc }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border-2 px-3 py-3 text-left transition-[border-color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === id
                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                  : "border-transparent bg-muted/30 hover:bg-muted/50"
              )}
              aria-current={tab === id ? "true" : undefined}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  tab === id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-base font-semibold text-foreground">{label}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground leading-snug">
                  {desc}
                </span>
                {p && (
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium">
                    {id === "openai" && p.openai.enabled && (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-hidden="true" />
                        Activo
                      </>
                    )}
                    {id === "ollama" && p.ollama.enabled && (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-hidden="true" />
                        Activo
                      </>
                    )}
                    {id === "gemini" && p.gemini.enabled && (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-hidden="true" />
                        Activo
                      </>
                    )}
                  </span>
                )}
              </span>
            </button>
          ))}
        </nav>

        <div className="min-w-0 rounded-2xl border border-border bg-card p-6 shadow-sm dark:shadow-none">
          {tab === "openai" && p && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">OpenAI</h2>
                <p className="text-base text-muted-foreground">
                  Clave API y URL base (compatible con OpenAI o proxies).
                </p>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
                <span className="text-base font-medium">Habilitar proveedor</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={openaiEnabled}
                  onClick={() => setOpenaiEnabled((v) => !v)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    openaiEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                  )}
                >
                  <span
                    className={cn(
                      "block h-5 w-5 rounded-full bg-white shadow transition-transform",
                      openaiEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                    aria-hidden="true"
                  />
                </button>
              </label>

              <div>
                <label htmlFor="openai-base" className="mb-1.5 block text-base font-medium">
                  URL base
                </label>
                <input
                  id="openai-base"
                  name="openaiBaseUrl"
                  type="url"
                  autoComplete="off"
                  spellCheck={false}
                  className={inputCls}
                  value={openaiBase}
                  onChange={(e) => setOpenaiBase(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="openai-key" className="mb-1.5 block text-base font-medium">
                  Clave API
                </label>
                <input
                  id="openai-key"
                  name="openaiApiKey"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  className={inputCls}
                  placeholder={
                    p.openai.hasValue
                      ? `Clave guardada ${p.openai.hint ?? ""} — escribe una nueva para sustituir…`
                      : "sk-…"
                  }
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                />
                {p.openai.hasValue && (
                  <button
                    type="button"
                    onClick={clearOpenAIKey}
                    disabled={saving || noTenant || noEncryption}
                    className="mt-2 text-sm font-medium text-destructive hover:underline disabled:opacity-50"
                  >
                    Eliminar clave guardada
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={saving || noTenant || noEncryption}
                  onClick={saveOpenAI}
                  className={cn(
                    "rounded-xl bg-primary px-4 py-2.5 text-base font-semibold text-primary-foreground",
                    "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  )}
                >
                  {saving ? "Guardando…" : "Guardar OpenAI"}
                </button>
                <button
                  type="button"
                  disabled={testing || noTenant}
                  onClick={() => testConnection("openai")}
                  className="rounded-xl border border-border px-4 py-2.5 text-base font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {testing ? "Probando…" : "Probar conexión"}
                </button>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Templates de modelos OpenAI</h3>
                  <p className="text-sm text-muted-foreground">
                    Primero valida el pilar con "Probar conexión", luego crea modelos con acrónimo automático.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={listingModels || noTenant}
                    onClick={() => listProviderModels("openai")}
                    className="rounded-xl border border-border px-4 py-2.5 text-base font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {listingModels ? "Listando…" : "Listar modelos disponibles"}
                  </button>
                </div>
                {availableModels.openai.length > 0 && (
                  <div>
                    <label htmlFor="openai-available-models" className="mb-1.5 block text-sm font-medium text-muted-foreground">
                      Modelos detectados (selecciona para autocompletar modelId)
                    </label>
                    <select
                      id="openai-available-models"
                      className={inputCls}
                      value={newModelId}
                      onChange={(e) => setNewModelId(e.target.value)}
                    >
                      <option value="">Seleccionar modelo…</option>
                      {availableModels.openai.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={newModelId}
                    onChange={(e) => setNewModelId(e.target.value)}
                    placeholder="gpt-5.4"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="Nombre visible (opcional)"
                    className={inputCls}
                  />
                </div>
                <button
                  type="button"
                  disabled={creatingModel || noTenant}
                  onClick={() => createModelTemplate("openai")}
                  className="rounded-xl border border-border px-4 py-2.5 text-base font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {creatingModel ? "Creando…" : "Crear template OpenAI"}
                </button>
                <div className="space-y-2">
                  {tabModels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aún no hay modelos registrados para OpenAI.</p>
                  ) : (
                    tabModels.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-base font-medium text-foreground truncate">{m.displayName ?? m.modelId}</p>
                          <p className="text-sm text-muted-foreground font-mono">{m.modelId}</p>
                        </div>
                        <span className="text-sm font-semibold rounded-md bg-emerald-100 text-emerald-700 px-2 py-1 dark:bg-emerald-900/30 dark:text-emerald-300">
                          {m.acronym}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "ollama" && p && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">Ollama</h2>
                <p className="text-base text-muted-foreground">
                  Servidor local (por defecto <code className="rounded bg-muted px-1 text-sm">http://127.0.0.1:11434</code>
                  ).
                </p>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
                <span className="text-base font-medium">Habilitar proveedor</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={ollamaEnabled}
                  onClick={() => setOllamaEnabled((v) => !v)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    ollamaEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                  )}
                >
                  <span
                    className={cn(
                      "block h-5 w-5 rounded-full bg-white shadow transition-transform",
                      ollamaEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                    aria-hidden="true"
                  />
                </button>
              </label>

              <div>
                <label htmlFor="ollama-base" className="mb-1.5 block text-base font-medium">
                  URL del servidor Ollama
                </label>
                <input
                  id="ollama-base"
                  name="ollamaBaseUrl"
                  type="url"
                  autoComplete="off"
                  spellCheck={false}
                  className={inputCls}
                  value={ollamaBase}
                  onChange={(e) => setOllamaBase(e.target.value)}
                  placeholder="http://127.0.0.1:11434"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={saving || noTenant}
                  onClick={saveOllama}
                  className={cn(
                    "rounded-xl bg-primary px-4 py-2.5 text-base font-semibold text-primary-foreground",
                    "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  )}
                >
                  {saving ? "Guardando…" : "Guardar Ollama"}
                </button>
                <button
                  type="button"
                  disabled={testing || noTenant}
                  onClick={() => testConnection("ollama")}
                  className="rounded-xl border border-border px-4 py-2.5 text-base font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {testing ? "Probando…" : "Probar conexión"}
                </button>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Templates de modelos Ollama</h3>
                  <p className="text-sm text-muted-foreground">
                    Ejemplos: deepseek-r1, llama3.1, mistral. Acrónimo automático tipo CL-000.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={listingModels || noTenant}
                    onClick={() => listProviderModels("ollama")}
                    className="rounded-xl border border-border px-4 py-2.5 text-base font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {listingModels ? "Listando…" : "Listar modelos disponibles"}
                  </button>
                </div>
                {availableModels.ollama.length > 0 && (
                  <div>
                    <label htmlFor="ollama-available-models" className="mb-1.5 block text-sm font-medium text-muted-foreground">
                      Modelos detectados (selecciona para autocompletar modelId)
                    </label>
                    <select
                      id="ollama-available-models"
                      className={inputCls}
                      value={newModelId}
                      onChange={(e) => setNewModelId(e.target.value)}
                    >
                      <option value="">Seleccionar modelo…</option>
                      {availableModels.ollama.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={newModelId}
                    onChange={(e) => setNewModelId(e.target.value)}
                    placeholder="deepseek-r1"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="Nombre visible (opcional)"
                    className={inputCls}
                  />
                </div>
                <button
                  type="button"
                  disabled={creatingModel || noTenant}
                  onClick={() => createModelTemplate("ollama")}
                  className="rounded-xl border border-border px-4 py-2.5 text-base font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {creatingModel ? "Creando…" : "Crear template Ollama"}
                </button>
                <div className="space-y-2">
                  {tabModels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aún no hay modelos registrados para Ollama.</p>
                  ) : (
                    tabModels.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-base font-medium text-foreground truncate">{m.displayName ?? m.modelId}</p>
                            {m.isSystemModel && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 text-violet-700 px-2 py-0.5 text-[11px] font-semibold dark:bg-violet-900/30 dark:text-violet-300">
                                <Wand2 className="h-3 w-3" aria-hidden="true" />
                                Sistema
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">{m.modelId}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!m.isSystemModel && (
                            <button
                              type="button"
                              disabled={settingSystemModel !== null || noTenant}
                              onClick={() => setSystemModel(m.id)}
                              className="text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md px-2 py-1 transition-colors disabled:opacity-50"
                              title="Usar este modelo para la generación IA del wizard"
                            >
                              {settingSystemModel === m.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                              ) : (
                                "Usar para generación IA"
                              )}
                            </button>
                          )}
                          <span className="text-sm font-semibold rounded-md bg-slate-200 text-slate-700 px-2 py-1 dark:bg-slate-800 dark:text-slate-300">
                            {m.acronym}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "gemini" && p && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">Google Gemini</h2>
                <p className="text-base text-muted-foreground">
                  API key de Google AI Studio o GCP con Generative Language habilitado.
                </p>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
                <span className="text-base font-medium">Habilitar proveedor</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={geminiEnabled}
                  onClick={() => setGeminiEnabled((v) => !v)}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    geminiEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                  )}
                >
                  <span
                    className={cn(
                      "block h-5 w-5 rounded-full bg-white shadow transition-transform",
                      geminiEnabled ? "translate-x-5" : "translate-x-0"
                    )}
                    aria-hidden="true"
                  />
                </button>
              </label>

              <div>
                <label htmlFor="gemini-key" className="mb-1.5 block text-base font-medium">
                  Clave API
                </label>
                <input
                  id="gemini-key"
                  name="geminiApiKey"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  className={inputCls}
                  placeholder={
                    p.gemini.hasValue
                      ? `Clave guardada ${p.gemini.hint ?? ""} — escribe una nueva para sustituir…`
                      : "AIza…"
                  }
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                />
                {p.gemini.hasValue && (
                  <button
                    type="button"
                    onClick={clearGeminiKey}
                    disabled={saving || noTenant || noEncryption}
                    className="mt-2 text-sm font-medium text-destructive hover:underline disabled:opacity-50"
                  >
                    Eliminar clave guardada
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={saving || noTenant || noEncryption}
                  onClick={saveGemini}
                  className={cn(
                    "rounded-xl bg-primary px-4 py-2.5 text-base font-semibold text-primary-foreground",
                    "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  )}
                >
                  {saving ? "Guardando…" : "Guardar Gemini"}
                </button>
                <button
                  type="button"
                  disabled={testing || noTenant}
                  onClick={() => testConnection("gemini")}
                  className="rounded-xl border border-border px-4 py-2.5 text-base font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {testing ? "Probando…" : "Probar conexión"}
                </button>
              </div>

              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Templates de modelos Gemini</h3>
                  <p className="text-sm text-muted-foreground">
                    Crea modelos con acrónimo automático tipo CG-000.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={listingModels || noTenant}
                    onClick={() => listProviderModels("gemini")}
                    className="rounded-xl border border-border px-4 py-2.5 text-base font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {listingModels ? "Listando…" : "Listar modelos disponibles"}
                  </button>
                </div>
                {availableModels.gemini.length > 0 && (
                  <div>
                    <label htmlFor="gemini-available-models" className="mb-1.5 block text-sm font-medium text-muted-foreground">
                      Modelos detectados (selecciona para autocompletar modelId)
                    </label>
                    <select
                      id="gemini-available-models"
                      className={inputCls}
                      value={newModelId}
                      onChange={(e) => setNewModelId(e.target.value)}
                    >
                      <option value="">Seleccionar modelo…</option>
                      {availableModels.gemini.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={newModelId}
                    onChange={(e) => setNewModelId(e.target.value)}
                    placeholder="gemini-1.5-pro"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="Nombre visible (opcional)"
                    className={inputCls}
                  />
                </div>
                <button
                  type="button"
                  disabled={creatingModel || noTenant}
                  onClick={() => createModelTemplate("gemini")}
                  className="rounded-xl border border-border px-4 py-2.5 text-base font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {creatingModel ? "Creando…" : "Crear template Gemini"}
                </button>
                <div className="space-y-2">
                  {tabModels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aún no hay modelos registrados para Gemini.</p>
                  ) : (
                    tabModels.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-base font-medium text-foreground truncate">{m.displayName ?? m.modelId}</p>
                          <p className="text-sm text-muted-foreground font-mono">{m.modelId}</p>
                        </div>
                        <span className="text-sm font-semibold rounded-md bg-blue-100 text-blue-700 px-2 py-1 dark:bg-blue-900/30 dark:text-blue-300">
                          {m.acronym}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
