import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Send,
  Shield,
  ShieldOff,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import {
  telegramChannelsApi,
  type TelegramChannelApi,
} from "@/services/telegram-channels.api";
import { telegramApi, type TelegramConfigApi } from "@/services/telegram.api";

interface Props {
  agentId: string;
}

interface FormState {
  name: string;
  telegramConfigId: string;
  whitelistEnabled: boolean;
  whitelistChatIds: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  telegramConfigId: "",
  whitelistEnabled: false,
  whitelistChatIds: "",
  isActive: true,
};

const BACKEND = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function AgentTelegramSection({ agentId }: Props) {
  const { addToast } = useToast();

  const [channels, setChannels] = useState<TelegramChannelApi[]>([]);
  const [bots, setBots] = useState<TelegramConfigApi[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [chs, bs] = await Promise.all([
        telegramChannelsApi.list(agentId),
        telegramApi.list(),
      ]);
      setChannels(chs);
      setBots(bs);
    } catch {
      addToast("Error al cargar canales Telegram", "error");
    } finally {
      setLoading(false);
    }
  }, [agentId, addToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(ch: TelegramChannelApi) {
    setEditingId(ch.id);
    setForm({
      name: ch.name,
      telegramConfigId: ch.telegramConfigId ?? "",
      whitelistEnabled: ch.whitelistEnabled,
      whitelistChatIds: (ch.whitelistChatIds ?? []).join(", "),
      isActive: ch.isActive,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.telegramConfigId) {
      addToast("Nombre y bot Telegram son obligatorios", "error");
      return;
    }
    setSaving(true);
    const chatIds = form.whitelistChatIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const payload = {
        name: form.name.trim(),
        telegramConfigId: form.telegramConfigId,
        agentId,
        whitelistEnabled: form.whitelistEnabled,
        whitelistChatIds: chatIds,
        isActive: form.isActive,
      };

      if (editingId) {
        const updated = await telegramChannelsApi.update(editingId, payload);
        closeForm();
        setChannels((prev) => prev.map((ch) => (ch.id === editingId ? updated : ch)));
        addToast("Canal actualizado", "success");
      } else {
        const created = await telegramChannelsApi.create(payload);
        closeForm();
        setChannels((prev) => [created, ...prev]);
        addToast("Canal creado", "success");
      }
    } catch {
      addToast("Error al guardar canal", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este canal? Esta acción no se puede deshacer.")) return;
    setChannels((prev) => prev.filter((ch) => ch.id !== id));
    try {
      await telegramChannelsApi.remove(id);
      addToast("Canal eliminado", "success");
    } catch {
      addToast("Error al eliminar canal", "error");
      fetchAll();
    }
  }

  async function handleRegisterWebhook(channelId: string) {
    setRegisteringId(channelId);
    try {
      const res = await telegramChannelsApi.registerWebhook(channelId, BACKEND);
      addToast(`Webhook registrado: ${res.webhookUrl}`, "success");
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.message ??
        (err as any)?.message ??
        "Error al registrar webhook";
      addToast(msg, "error");
    } finally {
      setRegisteringId(null);
    }
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function webhookUrl(channelId: string) {
    return `${BACKEND}/api/v1/webhook/telegram/${channelId}`;
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-base">Cargando canales…</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-base text-muted-foreground">
          {channels.length === 0
            ? "No hay canales configurados para este agente."
            : `${channels.length} canal${channels.length > 1 ? "es" : ""} configurado${channels.length > 1 ? "s" : ""}.`}
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo canal
        </button>
      </div>

      {/* Channel list */}
      {channels.length > 0 && (
        <div className="space-y-2">
          {channels.map((ch) => {
            const isExpanded = expandedWebhook === ch.id;
            const url = webhookUrl(ch.id);
            return (
              <div
                key={ch.id}
                className="rounded-xl border border-border bg-card shadow-sm"
              >
                <div className="flex items-center gap-3 p-4">
                  <div className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    ch.isActive ? "bg-sky-100 dark:bg-sky-900/30" : "bg-muted"
                  )}>
                    <Send className={cn(
                      "h-4 w-4",
                      ch.isActive ? "text-sky-600 dark:text-sky-400" : "text-muted-foreground"
                    )} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground truncate">{ch.name}</span>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        ch.isActive
                          ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {ch.isActive ? "Activo" : "Inactivo"}
                      </span>
                      {ch.whitelistEnabled && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <Shield className="h-2.5 w-2.5" />
                          Whitelist
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground truncate">
                      Bot: {ch.telegramConfig?.botUsername ?? ch.telegramConfig?.name ?? ch.telegramConfigId}
                      {ch.whitelistEnabled && ch.whitelistChatIds?.length > 0 && (
                        <> &middot; {ch.whitelistChatIds.length} Chat ID{ch.whitelistChatIds.length > 1 ? "s" : ""}</>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setExpandedWebhook(isExpanded ? null : ch.id)}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      {isExpanded ? "Ocultar webhook" : "Ver webhook"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(ch)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ch.id)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Webhook panel */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 px-4 py-4 rounded-b-xl space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Configuración Telegram Webhook
                    </p>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">URL del Webhook</label>
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                        <code className="flex-1 truncate text-sm text-foreground">{url}</code>
                        <button
                          type="button"
                          onClick={() => copyText(url, `url-${ch.id}`)}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          {copied === `url-${ch.id}` ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Secret Token</label>
                      <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                        <code className="flex-1 truncate text-sm text-foreground">{ch.secretToken}</code>
                        <button
                          type="button"
                          onClick={() => copyText(ch.secretToken, `secret-${ch.id}`)}
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                        >
                          {copied === `secret-${ch.id}` ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground max-w-sm">
                        Registra el webhook automáticamente en Telegram para que los mensajes lleguen a este canal.
                        Asegúrate de que la URL sea accesible públicamente.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRegisterWebhook(ch.id)}
                        disabled={registeringId === ch.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 shrink-0"
                      >
                        {registeringId === ch.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="h-3.5 w-3.5" />
                        )}
                        Registrar webhook
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">
                {editingId ? "Editar canal" : "Nuevo canal Telegram"}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-1.5 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-muted-foreground">
                  Nombre *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej. Soporte clientes"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>

              {/* Bot selector */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-muted-foreground">
                  Bot Telegram *
                </label>
                {bots.length === 0 ? (
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    No hay bots configurados. Ve a MCP → Telegram para agregar uno.
                  </p>
                ) : (
                  <select
                    value={form.telegramConfigId}
                    onChange={(e) => setForm({ ...form, telegramConfigId: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-sky-500/30"
                  >
                    <option value="">Seleccionar bot…</option>
                    {bots.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}{b.botUsername ? ` (${b.botUsername})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Whitelist toggle */}
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, whitelistEnabled: !form.whitelistEnabled })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold transition-colors",
                    form.whitelistEnabled
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {form.whitelistEnabled ? (
                    <Shield className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldOff className="h-3.5 w-3.5" />
                  )}
                  {form.whitelistEnabled ? "Whitelist activa" : "Sin whitelist"}
                </button>
                <span className="text-sm text-muted-foreground">
                  {form.whitelistEnabled
                    ? "Solo los Chat IDs indicados pueden chatear"
                    : "Cualquier usuario puede chatear"}
                </span>
              </div>

              {/* Chat IDs input */}
              {form.whitelistEnabled && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-muted-foreground">
                    Chat IDs permitidos
                  </label>
                  <textarea
                    value={form.whitelistChatIds}
                    onChange={(e) => setForm({ ...form, whitelistChatIds: e.target.value })}
                    placeholder="123456789, 987654321, @username"
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-sky-500/30 resize-none"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    IDs numéricos de Telegram separados por comas. Obtén tu ID enviando un mensaje a{" "}
                    <strong>@userinfobot</strong>. También puedes usar @username.
                  </p>
                </div>
              )}

              {/* Active toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isActive}
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                    form.isActive ? "bg-sky-600" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200",
                      form.isActive ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
                <span className="text-sm font-medium text-foreground">Canal activo</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-border px-4 py-2 text-base font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.telegramConfigId}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-base font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Guardar cambios" : "Crear canal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
