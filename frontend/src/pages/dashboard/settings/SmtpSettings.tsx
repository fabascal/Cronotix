import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Star,
  TestTube2,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import {
  smtpApi,
  type SmtpConfigApi,
  type CreateSmtpPayload,
} from "@/services/smtp.api";

const inputCls =
  "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow";

const emptyForm: CreateSmtpPayload = {
  name: "",
  host: "",
  port: 587,
  username: "",
  password: "",
  fromAddress: "",
  isDefault: false,
};

export default function SmtpSettings() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<SmtpConfigApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateSmtpPayload>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      setConfigs(await smtpApi.list());
    } catch {
      toast("Error al cargar configuraciones SMTP", "error");
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

  const openEdit = (c: SmtpConfigApi) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      host: c.host,
      port: c.port,
      username: c.username,
      password: "",
      fromAddress: c.fromAddress,
      isDefault: c.isDefault,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId) {
        const payload = { ...form };
        if (!payload.password) delete (payload as Record<string, unknown>).password;
        await smtpApi.update(editingId, payload);
        toast("Configuración actualizada", "success");
      } else {
        await smtpApi.create(form);
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
      await smtpApi.remove(id);
      toast("Configuración eliminada", "success");
      fetchConfigs();
    } catch {
      toast("Error al eliminar", "error");
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await smtpApi.test(id);
      toast(result.message, "success");
    } catch {
      toast("Error al verificar conexión", "error");
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Email / SMTP</h1>
          <p className="text-base text-muted-foreground">
            Configura las credenciales SMTP para el envío de emails desde schedules
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-base font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nueva configuración
        </button>
      </div>

      {/* Create/edit form */}
      {formOpen && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.02] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">
              {editingId ? "Editar configuración" : "Nueva configuración SMTP"}
            </h3>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded p-1 hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre (ej: Gmail corporativo)"
              className={inputCls}
              autoFocus
            />
            <input
              value={form.fromAddress}
              onChange={(e) => setForm({ ...form, fromAddress: e.target.value })}
              placeholder="Dirección From (ej: noreply@empresa.com)"
              className={inputCls}
            />
            <input
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              placeholder="Host SMTP (ej: smtp.gmail.com)"
              className={inputCls}
            />
            <input
              type="number"
              value={form.port}
              onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
              placeholder="Puerto"
              className={inputCls}
            />
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Usuario SMTP"
              className={inputCls}
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editingId ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}
              className={inputCls}
            />
          </div>

          <label className="flex items-center gap-2 text-base text-foreground">
            <input
              type="checkbox"
              checked={form.isDefault ?? false}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            Configuración predeterminada
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
              disabled={!form.name || !form.host || !form.username || (!editingId && !form.password) || saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editingId ? "Guardar" : "Crear"}
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
          <Mail className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-base text-muted-foreground">No hay configuraciones SMTP</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Configura una cuenta SMTP para enviar emails desde tus schedules
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
                    <h3 className="text-base font-semibold text-foreground truncate">{c.name}</h3>
                    {c.isDefault && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <Star className="h-2.5 w-2.5" />
                        Default
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>{c.host}:{c.port}</span>
                    <span>{c.username}</span>
                    <span>{c.fromAddress}</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleTest(c.id)}
                    disabled={testingId === c.id}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-muted"
                    title="Probar conexión"
                  >
                    {testingId === c.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <TestTube2 className="h-3 w-3" />
                    )}
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
