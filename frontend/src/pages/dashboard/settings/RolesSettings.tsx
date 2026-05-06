import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckSquare,
  Square,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { DrillReveal } from "@/components/ui/DrillReveal";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

const MENU_SLUGS = [
  "dashboard",
  "documents",
  "agents",
  "settings.models",
  "settings.users",
  "settings.roles",
  "mcp",
  "billing",
] as const;

type MenuSlug = (typeof MENU_SLUGS)[number];

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: MenuSlug[];
  isActive: boolean;
  createdAt: string;
}

const SLUG_GROUPS: { heading: string; slugs: MenuSlug[] }[] = [
  {
    heading: "Plataforma",
    slugs: ["dashboard", "documents", "agents", "mcp", "billing"],
  },
  {
    heading: "Configuración",
    slugs: ["settings.models", "settings.users", "settings.roles"],
  },
];

const SLUG_LABELS: Record<MenuSlug, string> = {
  dashboard: "Dashboard",
  documents: "Documentos",
  agents: "Agentes",
  mcp: "Integraciones MCP",
  billing: "Facturación",
  "settings.models": "Modelos IA",
  "settings.users": "Usuarios",
  "settings.roles": "Roles",
};

// ── RoleForm ───────────────────────────────────────────────────────────────────

interface RoleFormProps {
  initial?: Role;
  onSave: (data: { name: string; description: string; permissions: MenuSlug[] }) => Promise<void>;
  saving: boolean;
}

function RoleForm({ initial, onSave, saving }: RoleFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [permissions, setPermissions] = useState<MenuSlug[]>(
    initial?.permissions ?? [],
  );

  const toggleSlug = (slug: MenuSlug) => {
    setPermissions((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSave({ name: name.trim(), description: description.trim(), permissions });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="role-name" className="text-base font-medium text-foreground">
          Nombre del rol <span className="text-destructive">*</span>
        </label>
        <input
          id="role-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
          spellCheck={false}
          placeholder="Ej. Operador"
          className="h-10 rounded-lg border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="role-desc" className="text-base font-medium text-foreground">
          Descripción
        </label>
        <textarea
          id="role-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Describe brevemente el rol…"
          className="rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
      </div>

      {/* Permissions */}
      <fieldset>
        <legend className="mb-3 text-base font-medium text-foreground">Acceso a módulos</legend>
        <div className="flex flex-col gap-4">
          {SLUG_GROUPS.map(({ heading, slugs }) => (
            <div key={heading}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {heading}
              </p>
              <div className="flex flex-col gap-1">
                {slugs.map((slug) => {
                  const checked = permissions.includes(slug);
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => toggleSlug(slug)}
                      aria-pressed={checked}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        checked
                          ? "border-primary/30 bg-primary/5 text-primary"
                          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {checked ? (
                        <CheckSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <Square className="h-4 w-4 shrink-0" aria-hidden="true" />
                      )}
                      {SLUG_LABELS[slug]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="h-10 rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {saving ? "Guardando…" : initial ? "Guardar cambios" : "Crear rol"}
      </button>
    </form>
  );
}

// ── RolesSettings ──────────────────────────────────────────────────────────────

export default function RolesSettings() {
  const { token } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.get<Role[]>("/api/v1/admin/roles", {
        headers: authHeaders,
      });
      setRoles(data);
    } catch {
      setError("No se pudieron cargar los roles.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { void fetchRoles(); }, [fetchRoles]);

  const openCreate = () => {
    setEditing(null);
    setPanelError(null);
    setPanelOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    setPanelError(null);
    setPanelOpen(true);
  };

  const handleSave = async (data: {
    name: string;
    description: string;
    permissions: MenuSlug[];
  }) => {
    setSaving(true);
    setPanelError(null);
    try {
      if (editing) {
        await apiClient.patch(`/api/v1/admin/roles/${editing.id}`, data, {
          headers: authHeaders,
        });
      } else {
        await apiClient.post("/api/v1/admin/roles", data, {
          headers: authHeaders,
        });
      }
      setPanelOpen(false);
      await fetchRoles();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Error al guardar el rol.";
      setPanelError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await apiClient.delete(`/api/v1/admin/roles/${id}`, { headers: authHeaders });
      setDeleteId(null);
      await fetchRoles();
    } catch {
      // keep modal open, user can retry
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Roles</h1>
          <p className="mt-0.5 text-base text-muted-foreground">
            Administra roles y los módulos a los que pueden acceder.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo rol
        </button>
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center gap-3 text-base text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Cargando roles…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-base text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && roles.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <ShieldCheck className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-base text-muted-foreground">Aún no hay roles. Crea el primero.</p>
        </div>
      )}

      {/* List */}
      {!loading && roles.length > 0 && (
        <ul className="flex flex-col gap-3">
          {roles.map((role) => (
            <li
              key={role.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm dark:shadow-none"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-foreground">{role.name}</p>
                  {!role.isActive && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Inactivo
                    </span>
                  )}
                </div>
                {role.description && (
                  <p className="mt-0.5 truncate text-base text-muted-foreground">
                    {role.description}
                  </p>
                )}
                <p className="mt-1 text-sm text-muted-foreground/70">
                  {role.permissions.length} módulo{role.permissions.length !== 1 ? "s" : ""} asignado{role.permissions.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(role)}
                  aria-label={`Editar rol ${role.name}`}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(role.id)}
                  aria-label={`Eliminar rol ${role.name}`}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Create / Edit panel */}
      <DrillReveal
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editing ? `Editar: ${editing.name}` : "Nuevo rol"}
        variant="panel"
      >
        {panelError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-base text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {panelError}
          </div>
        )}
        <RoleForm initial={editing ?? undefined} onSave={handleSave} saving={saving} />
      </DrillReveal>

      {/* Delete confirmation */}
      <DrillReveal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Eliminar rol"
        variant="modal"
      >
        <div className="flex flex-col gap-6">
          <p className="text-base text-muted-foreground">
            ¿Estás seguro de que deseas eliminar este rol? Esta acción no se puede deshacer. Los usuarios asignados a este rol perderán sus permisos.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteId(null)}
              className="rounded-lg border border-border px-4 py-2 text-base font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => deleteId && void handleDelete(deleteId)}
              className="rounded-lg bg-destructive px-4 py-2 text-base font-semibold text-white transition-colors hover:bg-destructive/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {deleting ? "Eliminando…" : "Eliminar"}
            </button>
          </div>
        </div>
      </DrillReveal>
    </div>
  );
}
