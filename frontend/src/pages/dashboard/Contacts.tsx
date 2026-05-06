import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { contactsApi, type ContactListApi } from "@/services/contacts.api";

const inputCls =
  "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow";

export default function ContactsPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [lists, setLists] = useState<ContactListApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLists = useCallback(async () => {
    try {
      setLists(await contactsApi.list());
    } catch {
      toast("Error al cargar listas", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const created = await contactsApi.create({ name, description: description || undefined });
      toast("Lista creada", "success");
      setShowCreate(false);
      setName("");
      setDescription("");
      navigate(`/dashboard/contacts/${created.id}`);
    } catch {
      toast("Error al crear lista", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await contactsApi.remove(id);
      toast("Lista eliminada", "success");
      fetchLists();
    } catch {
      toast("Error al eliminar", "error");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Listas de contacto</h1>
          <p className="text-base text-muted-foreground">
            Gestiona listas de destinatarios para tus schedules
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-base font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nueva lista
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.02] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Crear lista</h3>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded p-1 hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la lista"
            className={inputCls}
            autoFocus
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción (opcional)"
            rows={2}
            className={cn(inputCls, "resize-none")}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-border px-3 py-1.5 text-base hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim() || saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Crear
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : lists.length === 0 ? (
        <div className="text-center py-16">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-base text-muted-foreground">No hay listas de contacto</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Crea una lista para usar en tus schedules
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {lists.map((l) => (
            <div
              key={l.id}
              className="group rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-colors cursor-pointer"
              onClick={() => navigate(`/dashboard/contacts/${l.id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-foreground truncate">{l.name}</h3>
                  {l.description && (
                    <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{l.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{l.entryCount ?? 0} contacto(s)</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(l.id);
                  }}
                  className="rounded p-1.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                  title="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
