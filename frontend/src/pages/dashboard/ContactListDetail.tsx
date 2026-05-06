import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import {
  contactsApi,
  type ContactListApi,
  type ContactEntryApi,
} from "@/services/contacts.api";

const inputCls =
  "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow";

export default function ContactListDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [list, setList] = useState<ContactListApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [entryName, setEntryName] = useState("");
  const [entryEmail, setEntryEmail] = useState("");
  const [entryPhone, setEntryPhone] = useState("");
  const [entryTelegramId, setEntryTelegramId] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [saving, setSaving] = useState(false);

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRe = /^\+?[\d\s\-().]{6,20}$/;

  const fetchList = useCallback(async () => {
    if (!id) return;
    try {
      setList(await contactsApi.get(id));
    } catch {
      toast("Error al cargar la lista", "error");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleAddEntry = async () => {
    if (!id || !entryName.trim()) return;
    let valid = true;
    if (entryEmail && !emailRe.test(entryEmail)) {
      setEmailError("Email inválido");
      valid = false;
    } else {
      setEmailError("");
    }
    if (entryPhone && !phoneRe.test(entryPhone)) {
      setPhoneError("Teléfono inválido (solo dígitos, +, espacios, guiones)");
      valid = false;
    } else {
      setPhoneError("");
    }
    if (!valid) return;
    setSaving(true);
    try {
      await contactsApi.addEntry(id, {
        name: entryName,
        email: entryEmail || undefined,
        phone: entryPhone || undefined,
        telegramId: entryTelegramId || undefined,
      });
      setEntryName("");
      setEntryEmail("");
      setEntryPhone("");
      setEntryTelegramId("");
      setEmailError("");
      setPhoneError("");
      setShowAdd(false);
      toast("Contacto agregado", "success");
      fetchList();
    } catch {
      toast("Error al agregar contacto", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveEntry = async (entryId: string) => {
    if (!id) return;
    try {
      await contactsApi.removeEntry(id, entryId);
      toast("Contacto eliminado", "success");
      fetchList();
    } catch {
      toast("Error al eliminar contacto", "error");
    }
  };

  const handleCsvImport = async (file: File) => {
    if (!id) return;
    setImporting(true);
    try {
      const result = await contactsApi.importCsv(id, file);
      toast(`${result.imported} contacto(s) importados`, "success");
      fetchList();
    } catch {
      toast("Error al importar CSV", "error");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="text-center py-16">
        <p className="text-base text-muted-foreground">Lista no encontrada</p>
      </div>
    );
  }

  const entries: ContactEntryApi[] = list.entries ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/dashboard/contacts")}
          className="rounded-lg p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-foreground truncate">{list.name}</h1>
          {list.description && (
            <p className="text-base text-muted-foreground">{list.description}</p>
          )}
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-base font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar contacto
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-base font-medium hover:bg-muted disabled:opacity-50"
        >
          {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Importar CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleCsvImport(f);
            e.target.value = "";
          }}
        />
        <span className="text-sm text-muted-foreground ml-auto">
          {entries.length} contacto(s)
        </span>
      </div>

      {/* Inline add form */}
      {showAdd && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.02] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Nuevo contacto</h3>
            <button type="button" onClick={() => setShowAdd(false)} className="rounded p-1 hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              value={entryName}
              onChange={(e) => setEntryName(e.target.value)}
              placeholder="Nombre *"
              className={inputCls}
              autoFocus
            />
            <div>
              <input
                type="email"
                value={entryEmail}
                onChange={(e) => { setEntryEmail(e.target.value); setEmailError(""); }}
                placeholder="Correo electrónico"
                className={cn(inputCls, emailError && "border-red-500 focus-visible:ring-red-500")}
              />
              {emailError && <p className="mt-1 text-[11px] text-red-500">{emailError}</p>}
            </div>
            <div>
              <input
                type="tel"
                value={entryPhone}
                onChange={(e) => { setEntryPhone(e.target.value); setPhoneError(""); }}
                placeholder="Teléfono"
                className={cn(inputCls, phoneError && "border-red-500 focus-visible:ring-red-500")}
              />
              {phoneError && <p className="mt-1 text-[11px] text-red-500">{phoneError}</p>}
            </div>
            <input
              value={entryTelegramId}
              onChange={(e) => setEntryTelegramId(e.target.value)}
              placeholder="Telegram Chat ID"
              className={inputCls}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-base hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddEntry}
              disabled={!entryName.trim() || saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Agregar
            </button>
          </div>
        </div>
      )}

      {/* Entries table */}
      {entries.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-base text-muted-foreground">La lista está vacía</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Agrega contactos manualmente o importa un archivo CSV
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-left text-sm font-semibold text-muted-foreground">Nombre</th>
                <th className="px-4 py-2.5 text-left text-sm font-semibold text-muted-foreground">Email</th>
                <th className="px-4 py-2.5 text-left text-sm font-semibold text-muted-foreground">Teléfono</th>
                <th className="px-4 py-2.5 text-left text-sm font-semibold text-muted-foreground">Telegram ID</th>
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="group border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium text-foreground">{entry.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{entry.email ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{entry.phone ?? "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{entry.telegramId ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => handleRemoveEntry(entry.id)}
                      className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
