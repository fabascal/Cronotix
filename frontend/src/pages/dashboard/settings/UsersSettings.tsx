import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { DrillReveal } from "@/components/ui/DrillReveal";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Role {
  id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: "superadmin" | "admin" | "user";
  roleId: string | null;
  rbacRole: Role | null;
  isActive: boolean;
  createdAt: string;
}

const LEGACY_ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  user: "Usuario",
};

// ── UserForm ───────────────────────────────────────────────────────────────────

interface UserFormProps {
  initial?: User;
  roles: Role[];
  onSave: (data: {
    name: string;
    email: string;
    password?: string;
    role: "superadmin" | "admin" | "user";
    roleId: string | null;
    isActive: boolean;
  }) => Promise<void>;
  saving: boolean;
}

function UserForm({ initial, roles, onSave, saving }: UserFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [legacyRole, setLegacyRole] = useState<"superadmin" | "admin" | "user">(
    initial?.role ?? "user",
  );
  const [roleId, setRoleId] = useState<string>(initial?.roleId ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onSave({
      name: name.trim(),
      email: email.trim(),
      ...(password ? { password } : {}),
      role: legacyRole,
      roleId: roleId || null,
      isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="u-name" className="text-base font-medium text-foreground">
          Nombre <span className="text-destructive">*</span>
        </label>
        <input
          id="u-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={255}
          spellCheck={false}
          placeholder="Ana López"
          className="h-10 rounded-lg border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="u-email" className="text-base font-medium text-foreground">
          Email <span className="text-destructive">*</span>
        </label>
        <input
          id="u-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          spellCheck={false}
          placeholder="ana@empresa.com"
          className="h-10 rounded-lg border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="u-password" className="text-base font-medium text-foreground">
          {initial ? "Nueva contraseña" : "Contraseña"}{" "}
          {!initial && <span className="text-destructive">*</span>}
          {initial && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              (dejar vacío para no cambiar)
            </span>
          )}
        </label>
        <div className="relative">
          <input
            id="u-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!initial}
            minLength={8}
            spellCheck={false}
            placeholder={initial ? "••••••••" : "Mínimo 8 caracteres"}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 pr-10 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* RBAC Role */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="u-rbac-role" className="text-base font-medium text-foreground">
          Rol RBAC
        </label>
        <select
          id="u-rbac-role"
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">— Sin rol asignado —</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">
          El rol RBAC define qué módulos puede ver el usuario.
        </p>
      </div>

      {/* Legacy system role */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="u-sys-role" className="text-base font-medium text-foreground">
          Rol de sistema
        </label>
        <select
          id="u-sys-role"
          value={legacyRole}
          onChange={(e) =>
            setLegacyRole(e.target.value as "superadmin" | "admin" | "user")
          }
          className="h-10 rounded-lg border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="user">Usuario</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
        </select>
        <p className="text-sm text-muted-foreground">
          "Super Admin" tiene acceso irrestricto y sobreescribe al rol RBAC.
        </p>
      </div>

      {/* Active toggle */}
      <label className="flex cursor-pointer items-center gap-3">
        <div className="relative">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="peer sr-only"
          />
          <div className="h-5 w-9 rounded-full border border-input bg-muted transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring" />
          <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-base font-medium text-foreground">Usuario activo</span>
      </label>

      <button
        type="submit"
        disabled={saving || !name.trim() || !email.trim()}
        className="h-10 rounded-lg bg-primary px-4 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {saving ? "Guardando…" : initial ? "Guardar cambios" : "Crear usuario"}
      </button>
    </form>
  );
}

// ── UsersSettings ──────────────────────────────────────────────────────────────

export default function UsersSettings() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiClient.get<User[]>("/api/v1/admin/users", { headers: authHeaders }),
        apiClient.get<Role[]>("/api/v1/admin/roles", { headers: authHeaders }),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch {
      setError("No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(null);
    setPanelError(null);
    setPanelOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setPanelError(null);
    setPanelOpen(true);
  };

  const handleSave = async (data: Parameters<UserFormProps["onSave"]>[0]) => {
    setSaving(true);
    setPanelError(null);
    try {
      if (editing) {
        await apiClient.patch(`/api/v1/admin/users/${editing.id}`, data, {
          headers: authHeaders,
        });
      } else {
        await apiClient.post("/api/v1/admin/users", data, {
          headers: authHeaders,
        });
      }
      setPanelOpen(false);
      await fetchData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Error al guardar el usuario.";
      setPanelError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await apiClient.delete(`/api/v1/admin/users/${id}`, { headers: authHeaders });
      setDeleteId(null);
      await fetchData();
    } catch {
      // keep modal open
    } finally {
      setDeleting(false);
    }
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((s) => s[0])
      .join("")
      .toUpperCase();

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Usuarios</h1>
          <p className="mt-0.5 text-base text-muted-foreground">
            Gestiona los usuarios con acceso al portal.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Nuevo usuario
        </button>
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center gap-3 text-base text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Cargando usuarios…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-base text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && users.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
          <p className="text-base text-muted-foreground">No hay usuarios registrados.</p>
        </div>
      )}

      {/* List */}
      {!loading && users.length > 0 && (
        <ul className="flex flex-col gap-3">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm dark:shadow-none"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                {/* Avatar */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary"
                  aria-hidden="true"
                >
                  {initials(u.name)}
                </div>

                {/* Info */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-foreground">{u.name}</p>
                    {!u.isActive && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Inactivo
                      </span>
                    )}
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        u.role === "superadmin"
                          ? "bg-gold-50 text-gold-700 dark:bg-gold-900/30 dark:text-gold-300"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {LEGACY_ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </div>
                  <p className="truncate text-base text-muted-foreground">{u.email}</p>
                  {u.rbacRole && (
                    <p className="mt-0.5 text-sm text-muted-foreground/70">
                      Rol RBAC: {u.rbacRole.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(u)}
                  aria-label={`Editar usuario ${u.name}`}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(u.id)}
                  aria-label={`Eliminar usuario ${u.name}`}
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
        title={editing ? `Editar: ${editing.name}` : "Nuevo usuario"}
        variant="panel"
      >
        {panelError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-base text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {panelError}
          </div>
        )}
        <UserForm
          initial={editing ?? undefined}
          roles={roles}
          onSave={handleSave}
          saving={saving}
        />
      </DrillReveal>

      {/* Delete confirmation */}
      <DrillReveal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Eliminar usuario"
        variant="modal"
      >
        <div className="flex flex-col gap-6">
          <p className="text-base text-muted-foreground">
            ¿Estás seguro de que deseas eliminar este usuario? Esta acción es permanente y no se puede deshacer.
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
