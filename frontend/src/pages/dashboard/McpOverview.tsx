import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Network,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Mail,
  MessageCircle,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Star,
  TestTube2,
  Send,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/context/ToastContext";
import { smtpApi, type SmtpConfigApi } from "@/services/smtp.api";
import { whatsappApi, type WhatsappConfigApi } from "@/services/whatsapp.api";
import { telegramApi, type TelegramConfigApi } from "@/services/telegram.api";

interface McpTypeInfo {
  type: string;
  label: string;
  description: string;
  tools: number;
}

interface AgentApi {
  id: string;
  name: string;
}

interface McpIntegrationApi {
  id: string;
  agentId: string;
  type: string;
  isActive: boolean;
}

const BADGE_MAP: Record<string, string> = {
  filesystem: "Local",
  postgresql: "DB",
  github: "Git",
  slack: "Chat",
  notion: "Wiki",
  http: "API",
  gmail: "Email",
};

const COLOR_MAP: Record<string, string> = {
  filesystem: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  postgresql: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  github: "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300",
  slack: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  notion: "bg-stone-100 text-stone-700 dark:bg-stone-800/60 dark:text-stone-300",
  http: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  gmail: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const GMAIL_HOST = "smtp.gmail.com";
const inputCls =
  "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function McpOverview() {
  const { toast } = useToast();
  const [types, setTypes] = useState<McpTypeInfo[]>([]);
  const [agents, setAgents] = useState<AgentApi[]>([]);
  const [integrations, setIntegrations] = useState<Map<string, McpIntegrationApi[]>>(new Map());
  const [loading, setLoading] = useState(true);

  // WhatsApp state
  const [waConfigs, setWaConfigs] = useState<WhatsappConfigApi[]>([]);
  const [waOpen, setWaOpen] = useState(false);
  const [waFormOpen, setWaFormOpen] = useState(false);
  const [waEditingId, setWaEditingId] = useState<string | null>(null);
  const [waName, setWaName] = useState("");
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [showWaToken, setShowWaToken] = useState(false);
  const [waSaving, setWaSaving] = useState(false);
  const [waError, setWaError] = useState("");
  const [waTestPhone, setWaTestPhone] = useState("");
  const [waTestFor, setWaTestFor] = useState<string | null>(null);
  const [waSendingId, setWaSendingId] = useState<string | null>(null);

  // Telegram state
  const [tgConfigs, setTgConfigs] = useState<TelegramConfigApi[]>([]);
  const [tgOpen, setTgOpen] = useState(false);
  const [tgFormOpen, setTgFormOpen] = useState(false);
  const [tgEditingId, setTgEditingId] = useState<string | null>(null);
  const [tgName, setTgName] = useState("");
  const [tgToken, setTgToken] = useState("");
  const [showTgToken, setShowTgToken] = useState(false);
  const [tgSaving, setTgSaving] = useState(false);
  const [tgError, setTgError] = useState("");
  const [tgTestChatId, setTgTestChatId] = useState("");
  const [tgTestFor, setTgTestFor] = useState<string | null>(null);
  const [tgSendingId, setTgSendingId] = useState<string | null>(null);

  // Gmail state
  const [gmailConfigs, setGmailConfigs] = useState<SmtpConfigApi[]>([]);
  const [gmailOpen, setGmailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [gmailAddress, setGmailAddress] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Test-send state
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [testEmailTarget, setTestEmailTarget] = useState("");
  const [testSendFor, setTestSendFor] = useState<string | null>(null);

  const loadWhatsapp = useCallback(async () => {
    try { setWaConfigs(await whatsappApi.list()); } catch { /* silent */ }
  }, []);

  const loadTelegram = useCallback(async () => {
    try { setTgConfigs(await telegramApi.list()); } catch { /* silent */ }
  }, []);

  const loadGmail = useCallback(async () => {
    try {
      const all = await smtpApi.list();
      setGmailConfigs(all.filter((c) => c.host === GMAIL_HOST));
    } catch { /* silent */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const [typesRes, agentsRes] = await Promise.all([
        apiClient.get<McpTypeInfo[]>("/api/v1/mcp/types"),
        apiClient.get<AgentApi[]>("/api/v1/agents"),
      ]);
      setTypes(typesRes.data);
      setAgents(agentsRes.data);

      const map = new Map<string, McpIntegrationApi[]>();
      await Promise.all(
        agentsRes.data.map(async (a) => {
          try {
            const { data } = await apiClient.get<McpIntegrationApi[]>(`/api/v1/agents/${a.id}/mcp`);
            if (data.length > 0) map.set(a.id, data);
          } catch { /* silent */ }
        }),
      );
      setIntegrations(map);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); loadGmail(); loadWhatsapp(); loadTelegram(); }, [load, loadGmail, loadWhatsapp, loadTelegram]);

  // Gmail handlers
  const openCreate = () => {
    setEditingId(null);
    setGmailAddress("");
    setAppPassword("");
    setShowPass(false);
    setError("");
    setFormOpen(true);
    setGmailOpen(true);
  };

  const openEdit = (c: SmtpConfigApi) => {
    setEditingId(c.id);
    setGmailAddress(c.username);
    setAppPassword("");
    setShowPass(false);
    setError("");
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!gmailAddress.includes("@")) { setError("Ingresa un correo Gmail válido"); return; }
    if (!editingId && !appPassword) { setError("La App Password es requerida"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: `Gmail — ${gmailAddress}`,
        host: GMAIL_HOST,
        port: 587,
        username: gmailAddress,
        password: appPassword,
        fromAddress: gmailAddress,
        isDefault: gmailConfigs.length === 0,
      };
      if (editingId) {
        const { password, ...rest } = payload;
        await smtpApi.update(editingId, appPassword ? payload : rest);
      } else {
        await smtpApi.create(payload);
      }
      setFormOpen(false);
      toast(editingId ? "Cuenta actualizada" : "Gmail conectado", "success");
      loadGmail();
    } catch {
      setError("Error al guardar. Verifica los datos.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await smtpApi.remove(id);
      toast("Cuenta eliminada", "success");
      loadGmail();
    } catch { toast("Error al eliminar", "error"); }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    try {
      const res = await smtpApi.test(id);
      toast(res.message, "success");
    } catch {
      toast("Error de conexión SMTP", "error");
    } finally {
      setTestingId(null);
    }
  };

  const handleTestSend = async (id: string) => {
    if (!testEmailTarget.includes("@")) { toast("Ingresa un email válido", "error"); return; }
    setSendingId(id);
    try {
      const res = await smtpApi.testSend(id, testEmailTarget);
      toast(res.message, "success");
      setTestSendFor(null);
      setTestEmailTarget("");
    } catch {
      toast("Error al enviar correo de prueba", "error");
    } finally {
      setSendingId(null);
    }
  };

  // WhatsApp handlers
  const openWaCreate = () => {
    setWaEditingId(null); setWaName(""); setWaPhoneId(""); setWaToken("");
    setShowWaToken(false); setWaError(""); setWaFormOpen(true); setWaOpen(true);
  };

  const openWaEdit = (c: WhatsappConfigApi) => {
    setWaEditingId(c.id); setWaName(c.name); setWaPhoneId(c.phoneNumberId);
    setWaToken(""); setShowWaToken(false); setWaError(""); setWaFormOpen(true);
  };

  const handleWaSave = async () => {
    if (!waName.trim()) { setWaError("El nombre es requerido"); return; }
    if (!waPhoneId.trim()) { setWaError("El Phone Number ID es requerido"); return; }
    if (!waEditingId && !waToken.trim()) { setWaError("El Access Token es requerido"); return; }
    setWaSaving(true); setWaError("");
    try {
      const payload = { name: waName, phoneNumberId: waPhoneId, accessToken: waToken, isDefault: waConfigs.length === 0 };
      if (waEditingId) {
        const { accessToken, ...rest } = payload;
        await whatsappApi.update(waEditingId, waToken ? payload : rest);
      } else {
        await whatsappApi.create(payload);
      }
      setWaFormOpen(false);
      toast(waEditingId ? "Línea actualizada" : "Línea WhatsApp conectada", "success");
      loadWhatsapp();
    } catch {
      setWaError("Error al guardar. Verifica los datos.");
    } finally {
      setWaSaving(false);
    }
  };

  const handleWaDelete = async (id: string) => {
    try {
      await whatsappApi.remove(id);
      toast("Línea eliminada", "success");
      loadWhatsapp();
    } catch { toast("Error al eliminar", "error"); }
  };

  const handleWaTestSend = async (id: string) => {
    if (!waTestPhone.trim()) { toast("Ingresa un número", "error"); return; }
    setWaSendingId(id);
    try {
      const res = await whatsappApi.testSend(id, waTestPhone.trim());
      toast(res.message, "success");
      setWaTestFor(null); setWaTestPhone("");
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.message ??
        (err as any)?.message ??
        "Error al enviar mensaje de prueba";
      toast(msg, "error");
    } finally {
      setWaSendingId(null);
    }
  };

  // Telegram handlers
  const openTgCreate = () => {
    setTgEditingId(null); setTgName(""); setTgToken("");
    setShowTgToken(false); setTgError(""); setTgFormOpen(true); setTgOpen(true);
  };

  const openTgEdit = (c: TelegramConfigApi) => {
    setTgEditingId(c.id); setTgName(c.name); setTgToken("");
    setShowTgToken(false); setTgError(""); setTgFormOpen(true);
  };

  const handleTgSave = async () => {
    if (!tgName.trim()) { setTgError("El nombre es requerido"); return; }
    if (!tgEditingId && !tgToken.trim()) { setTgError("El Bot Token es requerido"); return; }
    setTgSaving(true); setTgError("");
    try {
      const payload = { name: tgName, botToken: tgToken, isDefault: tgConfigs.length === 0 };
      if (tgEditingId) {
        const { botToken, ...rest } = payload;
        await telegramApi.update(tgEditingId, tgToken ? payload : rest);
      } else {
        await telegramApi.create(payload);
      }
      setTgFormOpen(false);
      toast(tgEditingId ? "Bot actualizado" : "Bot Telegram conectado", "success");
      loadTelegram();
    } catch {
      setTgError("Error al guardar. Verifica el Bot Token.");
    } finally {
      setTgSaving(false);
    }
  };

  const handleTgDelete = async (id: string) => {
    try {
      await telegramApi.remove(id);
      toast("Bot eliminado", "success");
      loadTelegram();
    } catch { toast("Error al eliminar", "error"); }
  };

  const handleTgTestSend = async (id: string) => {
    if (!tgTestChatId.trim()) { toast("Ingresa un Chat ID", "error"); return; }
    setTgSendingId(id);
    try {
      const res = await telegramApi.testSend(id, tgTestChatId.trim());
      toast(res.message, "success");
      setTgTestFor(null); setTgTestChatId("");
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.message ??
        (err as any)?.message ??
        "Error al enviar mensaje de prueba";
      toast(msg, "error");
    } finally {
      setTgSendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalActive = Array.from(integrations.values()).flat().filter((i) => i.isActive).length;
  const agentsWithMcp = integrations.size;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
          <Network className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Integraciones MCP</h1>
          <p className="mt-1 text-base text-muted-foreground">
            Model Context Protocol — conecta herramientas externas a tus agentes de forma segura.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-3xl font-bold text-foreground">{types.length + 3}</p>
          <p className="text-sm text-muted-foreground">Tipos disponibles</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-3xl font-bold text-foreground">{totalActive + gmailConfigs.length + waConfigs.length + tgConfigs.length}</p>
          <p className="text-sm text-muted-foreground">Integraciones activas</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-3xl font-bold text-foreground">{agentsWithMcp}</p>
          <p className="text-sm text-muted-foreground">Agentes con MCP</p>
        </div>
      </div>

      {/* Available types grid */}
      <section>
        <h2 className="mb-3 text-base font-semibold uppercase tracking-wider text-muted-foreground">
          Tipos de integración
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {types.map((t) => {
            const usedCount = Array.from(integrations.values())
              .flat()
              .filter((i) => i.type === t.type && i.isActive).length;
            return (
              <div
                key={t.type}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold", COLOR_MAP[t.type] || "bg-muted text-muted-foreground")}>
                    {BADGE_MAP[t.type] || t.type}
                  </span>
                  <span className="text-base font-semibold text-foreground">{t.label}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.description}</p>
                <div className="mt-auto flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground/60">{t.tools} tools</span>
                  {usedCount > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> {usedCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Gmail card in grid */}
          <button
            type="button"
            onClick={() => setGmailOpen((v) => !v)}
            className={cn(
              "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
              gmailOpen
                ? "border-red-300 bg-red-50/50 dark:border-red-900/60 dark:bg-red-900/10"
                : "border-border bg-card hover:border-red-200 dark:hover:border-red-900/40",
            )}
          >
            <div className="flex items-center gap-2">
              <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold", COLOR_MAP.gmail)}>
                {BADGE_MAP.gmail}
              </span>
              <span className="text-base font-semibold text-foreground">Gmail</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">Envía emails via Gmail SMTP</p>
            <div className="mt-auto flex items-center justify-between pt-1">
              <span className="text-[10px] text-muted-foreground/60">Tenant</span>
              {gmailConfigs.length > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> {gmailConfigs.length}
                </span>
              )}
            </div>
          </button>

          {/* WhatsApp card in grid */}
          <button
            type="button"
            onClick={() => setWaOpen((v) => !v)}
            className={cn(
              "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
              waOpen
                ? "border-green-300 bg-green-50/50 dark:border-green-900/60 dark:bg-green-900/10"
                : "border-border bg-card hover:border-green-200 dark:hover:border-green-900/40",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                WA
              </span>
              <span className="text-base font-semibold text-foreground">WhatsApp</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">Envía mensajes via Meta Cloud API</p>
            <div className="mt-auto flex items-center justify-between pt-1">
              <span className="text-[10px] text-muted-foreground/60">Tenant</span>
              {waConfigs.length > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> {waConfigs.length}
                </span>
              )}
            </div>
          </button>

          {/* Telegram card in grid */}
          <button
            type="button"
            onClick={() => setTgOpen((v) => !v)}
            className={cn(
              "flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors",
              tgOpen
                ? "border-sky-300 bg-sky-50/50 dark:border-sky-900/60 dark:bg-sky-900/10"
                : "border-border bg-card hover:border-sky-200 dark:hover:border-sky-900/40",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                TG
              </span>
              <span className="text-base font-semibold text-foreground">Telegram</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">Chatea via Telegram Bot API</p>
            <div className="mt-auto flex items-center justify-between pt-1">
              <span className="text-[10px] text-muted-foreground/60">Tenant</span>
              {tgConfigs.length > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> {tgConfigs.length}
                </span>
              )}
            </div>
          </button>
        </div>
      </section>

      {/* Gmail expanded section */}
      {gmailOpen && (
        <section className="rounded-xl border border-red-200 bg-red-50/20 p-5 dark:border-red-900/40 dark:bg-red-900/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
                <Mail className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Gmail</h2>
                <p className="text-[11px] text-muted-foreground">Configura el envío de emails via Google SMTP a nivel tenant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                + Conectar cuenta
              </button>
              <button type="button" onClick={() => setGmailOpen(false)} className="rounded p-1 hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Connect/edit form */}
          {formOpen && (
            <div className="rounded-xl border border-red-200 bg-white/80 p-4 dark:border-red-900/30 dark:bg-card/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-foreground">
                  {editingId ? "Editar cuenta" : "Conectar cuenta Gmail"}
                </span>
                <button type="button" onClick={() => setFormOpen(false)} className="rounded p-1 hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                <input
                  type="email"
                  value={gmailAddress}
                  onChange={(e) => setGmailAddress(e.target.value)}
                  placeholder="tucorreo@gmail.com"
                  autoFocus
                  className={inputCls}
                />
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={appPassword}
                    onChange={(e) => setAppPassword(e.target.value)}
                    placeholder={editingId ? "Nueva App Password (dejar vacío para mantener)" : "App Password de Google"}
                    className={cn(inputCls, "pr-10")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Genera una{" "}
                  <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    App Password de Google
                  </a>{" "}
                  (requiere verificación en 2 pasos). Cronotix no accede a tu cuenta directamente.
                </p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-border px-3 py-1.5 text-base hover:bg-muted">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-base font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingId ? "Guardar" : "Conectar"}
                </button>
              </div>
            </div>
          )}

          {/* Connected accounts */}
          {gmailConfigs.length === 0 && !formOpen ? (
            <div className="rounded-xl border border-dashed border-border bg-white/40 p-6 text-center dark:bg-card/30">
              <Mail className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-base text-muted-foreground">No hay cuentas conectadas</p>
              <p className="mt-0.5 text-sm text-muted-foreground/70">
                Conecta tu Gmail para enviar resultados de schedules por correo
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {gmailConfigs.map((c) => (
                <div key={c.id} className="space-y-0">
                  <div className="group flex items-center justify-between rounded-xl border border-border bg-card p-3 transition-colors hover:border-red-200 dark:hover:border-red-900/40">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                        <Mail className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-medium text-foreground">{c.username}</span>
                          {c.isDefault && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <Star className="h-2 w-2" /> Principal
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">smtp.gmail.com:587</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleTestConnection(c.id)}
                        disabled={testingId === c.id}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm text-muted-foreground hover:bg-muted"
                        title="Verificar conexión"
                      >
                        {testingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube2 className="h-3 w-3" />}
                        Verificar
                      </button>
                      <button
                        type="button"
                        onClick={() => { setTestSendFor(testSendFor === c.id ? null : c.id); setTestEmailTarget(""); }}
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-muted",
                          testSendFor === c.id ? "text-red-600" : "text-muted-foreground",
                        )}
                        title="Enviar correo de prueba"
                      >
                        <Send className="h-3 w-3" />
                        Prueba
                      </button>
                      <button type="button" onClick={() => openEdit(c)} className="rounded p-1.5 text-muted-foreground hover:bg-muted" title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDelete(c.id)} className="rounded p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30" title="Eliminar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Test send inline form */}
                  {testSendFor === c.id && (
                    <div className="ml-11 mt-1 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                      <input
                        type="email"
                        value={testEmailTarget}
                        onChange={(e) => setTestEmailTarget(e.target.value)}
                        placeholder="Email destino para la prueba"
                        className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleTestSend(c.id)}
                      />
                      <button
                        type="button"
                        onClick={() => handleTestSend(c.id)}
                        disabled={sendingId === c.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {sendingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Enviar
                      </button>
                      <button type="button" onClick={() => setTestSendFor(null)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* WhatsApp expanded section */}
      {waOpen && (
        <section className="rounded-xl border border-green-200 bg-green-50/20 p-5 dark:border-green-900/40 dark:bg-green-900/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">WhatsApp Business</h2>
                <p className="text-[11px] text-muted-foreground">Configura líneas via Meta Cloud API</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openWaCreate}
                className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
              >
                + Conectar línea
              </button>
              <button type="button" onClick={() => setWaOpen(false)} className="rounded p-1 hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Create/edit form */}
          {waFormOpen && (
            <div className="rounded-xl border border-green-200 bg-white/80 p-4 dark:border-green-900/30 dark:bg-card/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-foreground">
                  {waEditingId ? "Editar línea" : "Conectar línea WhatsApp"}
                </span>
                <button type="button" onClick={() => setWaFormOpen(false)} className="rounded p-1 hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                <input
                  value={waName}
                  onChange={(e) => setWaName(e.target.value)}
                  placeholder="Nombre de la línea (ej: Soporte)"
                  autoFocus
                  className={inputCls}
                />
                <input
                  value={waPhoneId}
                  onChange={(e) => setWaPhoneId(e.target.value)}
                  placeholder="Phone Number ID (Meta Business)"
                  className={inputCls}
                />
                <div className="relative">
                  <input
                    type={showWaToken ? "text" : "password"}
                    value={waToken}
                    onChange={(e) => setWaToken(e.target.value)}
                    placeholder={waEditingId ? "Nuevo Access Token (dejar vacío para mantener)" : "Access Token permanente"}
                    className={cn(inputCls, "pr-10")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowWaToken((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showWaToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Obtén tu <strong>Phone Number ID</strong> y el <strong>Access Token permanente</strong> desde{" "}
                  <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Meta for Developers
                  </a>.
                </p>
              </div>
              {waError && <p className="text-sm text-red-600">{waError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setWaFormOpen(false)} className="rounded-lg border border-border px-3 py-1.5 text-base hover:bg-muted">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleWaSave}
                  disabled={waSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-1.5 text-base font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {waSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {waEditingId ? "Guardar" : "Conectar"}
                </button>
              </div>
            </div>
          )}

          {/* Connected lines */}
          {waConfigs.length === 0 && !waFormOpen ? (
            <div className="rounded-xl border border-dashed border-border bg-white/40 p-6 text-center dark:bg-card/30">
              <MessageCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-base text-muted-foreground">No hay líneas conectadas</p>
              <p className="mt-0.5 text-sm text-muted-foreground/70">
                Conecta una línea WhatsApp Business para enviar mensajes desde tus schedules
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {waConfigs.map((c) => (
                <div key={c.id} className="space-y-0">
                  <div className="group flex items-center justify-between rounded-xl border border-border bg-card p-3 transition-colors hover:border-green-200 dark:hover:border-green-900/40">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                        <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-medium text-foreground">{c.name}</span>
                          {c.isDefault && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <Star className="h-2 w-2" /> Principal
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">Phone ID: {c.phoneNumberId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => { setWaTestFor(waTestFor === c.id ? null : c.id); setWaTestPhone(""); }}
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-muted",
                          waTestFor === c.id ? "text-green-600" : "text-muted-foreground",
                        )}
                        title="Enviar mensaje de prueba"
                      >
                        <Send className="h-3 w-3" />
                        Prueba
                      </button>
                      <button type="button" onClick={() => openWaEdit(c)} className="rounded p-1.5 text-muted-foreground hover:bg-muted" title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => handleWaDelete(c.id)} className="rounded p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30" title="Eliminar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Test send inline form */}
                  {waTestFor === c.id && (
                    <div className="ml-11 mt-1 space-y-1">
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                      <input
                        type="tel"
                        value={waTestPhone}
                        onChange={(e) => setWaTestPhone(e.target.value)}
                        placeholder="521234567890 (sin +)"
                        className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleWaTestSend(c.id)}
                      />
                      <button
                        type="button"
                        onClick={() => handleWaTestSend(c.id)}
                        disabled={waSendingId === c.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {waSendingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        Enviar
                      </button>
                      <button type="button" onClick={() => setWaTestFor(null)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground pl-1">Código de país + número, sin espacios ni +</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Telegram expanded section */}
      {tgOpen && (
        <section className="rounded-xl border border-sky-200 bg-sky-50/20 p-5 dark:border-sky-900/40 dark:bg-sky-900/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/30">
                <Send className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Telegram</h2>
                <p className="text-[11px] text-muted-foreground">Configura bots via Telegram Bot API</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openTgCreate}
                className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700"
              >
                + Conectar bot
              </button>
              <button type="button" onClick={() => setTgOpen(false)} className="rounded p-1 hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Create/edit form */}
          {tgFormOpen && (
            <div className="rounded-xl border border-sky-200 bg-white/80 p-4 dark:border-sky-900/30 dark:bg-card/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-foreground">
                  {tgEditingId ? "Editar bot" : "Conectar bot Telegram"}
                </span>
                <button type="button" onClick={() => setTgFormOpen(false)} className="rounded p-1 hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                <input
                  value={tgName}
                  onChange={(e) => setTgName(e.target.value)}
                  placeholder="Nombre del bot (ej: Bot Soporte)"
                  autoFocus
                  className={inputCls}
                />
                <div className="relative">
                  <input
                    type={showTgToken ? "text" : "password"}
                    value={tgToken}
                    onChange={(e) => setTgToken(e.target.value)}
                    placeholder={tgEditingId ? "Nuevo Bot Token (dejar vacío para mantener)" : "Bot Token de BotFather"}
                    className={cn(inputCls, "pr-10")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowTgToken((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showTgToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Obtén tu <strong>Bot Token</strong> enviando <code>/newbot</code> a{" "}
                  <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    @BotFather
                  </a>{" "}
                  en Telegram.
                </p>
              </div>
              {tgError && <p className="text-sm text-red-600">{tgError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setTgFormOpen(false)} className="rounded-lg border border-border px-3 py-1.5 text-base hover:bg-muted">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleTgSave}
                  disabled={tgSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-1.5 text-base font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  {tgSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {tgEditingId ? "Guardar" : "Conectar"}
                </button>
              </div>
            </div>
          )}

          {/* Connected bots */}
          {tgConfigs.length === 0 && !tgFormOpen ? (
            <div className="rounded-xl border border-dashed border-border bg-white/40 p-6 text-center dark:bg-card/30">
              <Send className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-base text-muted-foreground">No hay bots conectados</p>
              <p className="mt-0.5 text-sm text-muted-foreground/70">
                Conecta un bot de Telegram para chatear con tus agentes
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tgConfigs.map((c) => (
                <div key={c.id} className="space-y-0">
                  <div className="group flex items-center justify-between rounded-xl border border-border bg-card p-3 transition-colors hover:border-sky-200 dark:hover:border-sky-900/40">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                        <Send className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-medium text-foreground">{c.name}</span>
                          {c.isDefault && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <Star className="h-2 w-2" /> Principal
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{c.botUsername ?? "username no disponible"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => { setTgTestFor(tgTestFor === c.id ? null : c.id); setTgTestChatId(""); }}
                        className={cn(
                          "inline-flex items-center gap-1 rounded px-2 py-1 text-sm hover:bg-muted",
                          tgTestFor === c.id ? "text-sky-600" : "text-muted-foreground",
                        )}
                        title="Enviar mensaje de prueba"
                      >
                        <Send className="h-3 w-3" />
                        Prueba
                      </button>
                      <button type="button" onClick={() => openTgEdit(c)} className="rounded p-1.5 text-muted-foreground hover:bg-muted" title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => handleTgDelete(c.id)} className="rounded p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30" title="Eliminar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Test send inline form */}
                  {tgTestFor === c.id && (
                    <div className="ml-11 mt-1 space-y-1">
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                        <input
                          type="text"
                          value={tgTestChatId}
                          onChange={(e) => setTgTestChatId(e.target.value)}
                          placeholder="Tu Telegram Chat ID (ej: 123456789)"
                          className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          autoFocus
                          onKeyDown={(e) => e.key === "Enter" && handleTgTestSend(c.id)}
                        />
                        <button
                          type="button"
                          onClick={() => handleTgTestSend(c.id)}
                          disabled={tgSendingId === c.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                        >
                          {tgSendingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          Enviar
                        </button>
                        <button type="button" onClick={() => setTgTestFor(null)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground pl-1">Obtén tu Chat ID enviando un mensaje a @userinfobot en Telegram</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Agents with MCP */}
      {agentsWithMcp > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold uppercase tracking-wider text-muted-foreground">
            Agentes con integraciones
          </h2>
          <div className="space-y-2">
            {agents
              .filter((a) => integrations.has(a.id))
              .map((agent) => {
                const agentIntegs = integrations.get(agent.id) ?? [];
                return (
                  <Link
                    key={agent.id}
                    to={`/dashboard/agents/${agent.id}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold text-foreground">{agent.name}</span>
                      <div className="flex gap-1">
                        {agentIntegs.map((integ) => (
                          <span
                            key={integ.id}
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-bold",
                              integ.isActive
                                ? COLOR_MAP[integ.type] || "bg-muted text-muted-foreground"
                                : "bg-muted text-muted-foreground opacity-50",
                            )}
                          >
                            {BADGE_MAP[integ.type] || integ.type}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
          </div>
        </section>
      )}

      {agentsWithMcp === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
          <Network className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-base text-muted-foreground">
            Ningún agente tiene integraciones MCP configuradas aún.{" "}
            <Link to="/dashboard/agents" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
              Selecciona un agente
            </Link>{" "}
            y configura desde la sección MCP.
          </p>
        </div>
      )}
    </div>
  );
}
