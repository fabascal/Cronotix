import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Send,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import {
  whatsappApi,
  type WhatsappConfigApi,
  type CreateWhatsappPayload,
} from "@/services/whatsapp.api";

const inputCls =
  "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow";

const emptyForm: CreateWhatsappPayload = {
  name: "",
  phoneNumberId: "",
  accessToken: "",
  isDefault: false,
};

export default function WhatsappSettings() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<WhatsappConfigApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateWhatsappPayload>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const [testDialogId, setTestDialogId] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [sending, setSending] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      setConfigs(await whatsappApi.list());
    } catch {
      toast("Error al cargar configuraciones WhatsApp", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setFormOpen(true);
  };

  const openEdit = (c: WhatsappConfigApi) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      phoneNumberId: c.phoneNumberId,
      accessToken: "",
      isDefault: c.isDefault,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        const payload = { ...form };
        if (!payload.accessToken) delete (payload as Record<string, unknown>).accessToken;
        await whatsappApi.update(editingId, payload);
        toast("Configuración actualizada", "success");
      } else {
        await whatsappApi.create(form);
        toast("Configuración creada", "success");
      }
      setFormOpen(false);
      fetchConfigs();
    } catch {
      toast("Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await whatsappApi.remove(id);
      toast("Configuración eliminada", "success");
      fetchConfigs();
    } catch {
      toast("Error al eliminar", "error");
    }
  };

  const handleTestSend = async () => {
    if (!testDialogId || !testPhone.trim()) return;
    setSending(true);
    try {
      const result = await whatsappApi.testSend(testDialogId, testPhone.trim());
      toast(result.message, "success");
      setTestDialogId(null);
      setTestPhone("");
    } catch {
      toast("Error al enviar mensaje de prueba", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">WhatsApp</h1>
          <p className="text-base text-muted-foreground">
            Configura tus líneas de WhatsApp Business (Meta Cloud API) para envíos desde schedules
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-base font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nueva línea
        </button>
      </div>

      {formOpen && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.02] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">
              {editingId ? "Editar línea WhatsApp" : "Nueva línea WhatsApp"}
            </h3>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded p-1 hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre (ej: Línea soporte)"
              className={inputCls}
              autoFocus
            />
            <input
              value={form.phoneNumberId}
              onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
              placeholder="Phone Number ID (Meta Business)"
              className={inputCls}
            />
            <input
              type="password"
              value={form.accessToken}
              onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
              placeholder={editingId ? "Nuevo Access Token (dejar vacío para no cambiar)" : "Access Token permanente"}
              className="sm:col-span-2 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
            />
          </div>

          <label className="flex items-center gap-2 text-base text-foreground">
            <input
              type="checkbox"
              checked={form.isDefault ?? false}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            Línea predeterminada
          </label>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-base hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!form.name || !form.phoneNumberId || (!editingId && !form.accessToken) || saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingId ? "Guardar" : "Crear"}
            </button>
          </div>
        </div>
      )}

      {testDialogId && (
        <div className="rounded-xl border border-green-400/30 bg-green-50/50 dark:bg-green-900/10 p-4 space-y-3">
          <p className="text-base font-medium text-foreground">Enviar mensaje de prueba</p>
          <div className="flex gap-2">
            <input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="Número destino (ej: 521234567890)"
              className={inputCls + " flex-1"}
              autoFocus
            />
            <button
              type="button"
              onClick={handleTestSend}
              disabled={!testPhone.trim() || sending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-base font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Enviar
            </button>
            <button
              type="button"
              onClick={() => { setTestDialogId(null); setTestPhone(""); }}
              className="rounded p-2 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-16">
          <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-base text-muted-foreground">No hay líneas WhatsApp configuradas</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Conecta tu número de WhatsApp Business para enviar mensajes desde tus schedules
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((c) => (
            <div
              key={c.id}
              className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <h3 className="text-base font-semibold text-foreground truncate">{c.name}</h3>
                    {c.isDefault && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <Star className="h-2.5 w-2.5" />
                        Default
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>Phone ID: {c.phoneNumberId}</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => { setTestDialogId(c.id); setTestPhone(""); }}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-muted"
                    title="Enviar mensaje de prueba"
                  >
                    <Send className="h-3 w-3" />
                    Test
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
