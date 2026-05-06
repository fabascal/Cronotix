import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Sparkles,
  Globe,
  Building2,
  Loader2,
  Pencil,
  Trash2,
  X,
  Save,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Skill {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  category: string | null;
  isGlobal: boolean;
  tenantId: string | null;
  isActive: boolean;
  createdAt: string;
}

interface SkillForm {
  name: string;
  description: string;
  prompt: string;
  category: string;
  isGlobal: boolean;
}

const EMPTY_FORM: SkillForm = {
  name: "",
  description: "",
  prompt: "",
  category: "",
  isGlobal: false,
};

const CATEGORY_OPTIONS = [
  { value: "", label: "Sin categoría" },
  { value: "formato", label: "Formato" },
  { value: "tono", label: "Tono" },
  { value: "legal", label: "Legal" },
  { value: "médico", label: "Médico" },
  { value: "financiero", label: "Financiero" },
  { value: "técnico", label: "Técnico" },
  { value: "otro", label: "Otro" },
];

// ─── Skill Modal ──────────────────────────────────────────────────────────────

function SkillModal({
  open,
  skill,
  isSuperadmin,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  skill: SkillForm;
  isSuperadmin: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (form: SkillForm) => void;
}) {
  const [form, setForm] = useState<SkillForm>(skill);

  useEffect(() => {
    if (open) setForm(skill);
  }, [open, skill]);

  const set = <K extends keyof SkillForm>(key: K, val: SkillForm[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  if (!open) return null;

  const isValid = form.name.trim() && form.prompt.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-xl font-semibold text-foreground">
            {skill.name ? "Editar skill" : "Nuevo skill"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-6 py-5">
          <div className="space-y-1.5">
            <label htmlFor="skill-name" className="text-base font-medium text-foreground">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              id="skill-name"
              type="text"
              maxLength={255}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ej. Formato Legal"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="skill-desc" className="text-base font-medium text-foreground">
              Descripción
            </label>
            <input
              id="skill-desc"
              type="text"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="¿Qué hace este skill?"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="skill-prompt" className="text-base font-medium text-foreground">
              Instrucciones del prompt <span className="text-red-500">*</span>
            </label>
            <textarea
              id="skill-prompt"
              rows={6}
              value={form.prompt}
              onChange={(e) => set("prompt", e.target.value)}
              placeholder="Ej. Siempre responde con estructura de cláusulas, cita artículos de ley y usa lenguaje jurídico formal…"
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground">
              Estas instrucciones se inyectan al inicio del system prompt de cada agente que tenga este skill asignado.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="skill-category" className="text-base font-medium text-foreground">
              Categoría
            </label>
            <select
              id="skill-category"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {isSuperadmin && (
            <label className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <input
                type="checkbox"
                checked={form.isGlobal}
                onChange={(e) => set("isGlobal", e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus-visible:ring-1 focus-visible:ring-ring"
              />
              <div>
                <span className="text-base font-medium text-foreground">Skill global</span>
                <p className="text-[11px] text-muted-foreground">
                  Visible para todos los tenants del sistema
                </p>
              </div>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-base font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={!isValid || saving}
            className={cn(
              "flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({
  open,
  name,
  deleting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  name: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Eliminar skill</h3>
            <p className="mt-1 text-base text-muted-foreground">
              ¿Estás seguro de eliminar <strong>{name}</strong>? Se desasignará de todos los agentes.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-base font-medium text-muted-foreground hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isSuperadmin = user?.role === "superadmin";

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalForm, setModalForm] = useState<SkillForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchSkills = useCallback(async () => {
    try {
      const { data } = await apiClient.get<Skill[]>("/api/v1/skills");
      setSkills(data);
    } catch {
      toast("No se pudieron cargar los skills", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const openCreate = () => {
    setEditingId(null);
    setModalForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (skill: Skill) => {
    setEditingId(skill.id);
    setModalForm({
      name: skill.name,
      description: skill.description ?? "",
      prompt: skill.prompt,
      category: skill.category ?? "",
      isGlobal: skill.isGlobal,
    });
    setModalOpen(true);
  };

  const handleSave = async (form: SkillForm) => {
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        prompt: form.prompt.trim(),
        category: form.category || undefined,
        isGlobal: isSuperadmin ? form.isGlobal : undefined,
      };
      if (editingId) {
        await apiClient.patch(`/api/v1/skills/${editingId}`, payload);
        toast("Skill actualizado", "success");
      } else {
        await apiClient.post("/api/v1/skills", payload);
        toast("Skill creado", "success");
      }
      setModalOpen(false);
      fetchSkills();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al guardar";
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/v1/skills/${deleteTarget.id}`);
      toast("Skill eliminado", "success");
      setDeleteTarget(null);
      fetchSkills();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Error al eliminar";
      toast(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  const globalSkills = skills.filter((s) => s.isGlobal);
  const tenantSkills = skills.filter((s) => !s.isGlobal);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Skills</h1>
          <p className="text-base text-muted-foreground">
            Instrucciones de prompt reutilizables que puedes asignar a tus agentes.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nuevo skill
        </button>
      </div>

      {/* Empty state */}
      {skills.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card">
            <Sparkles className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground">Sin skills</p>
            <p className="mt-1 text-base text-muted-foreground">
              Crea tu primer skill para potenciar tus agentes con instrucciones especializadas.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Crear skill
          </button>
        </div>
      )}

      {/* Global skills */}
      {globalSkills.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" />
            <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
              Skills globales
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {globalSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                canEdit={isSuperadmin}
                onEdit={() => openEdit(skill)}
                onDelete={() => setDeleteTarget(skill)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Tenant skills */}
      {tenantSkills.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-500" />
            <h2 className="text-base font-semibold uppercase tracking-wider text-muted-foreground">
              Mis skills
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {tenantSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                canEdit={true}
                onEdit={() => openEdit(skill)}
                onDelete={() => setDeleteTarget(skill)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Modals */}
      <SkillModal
        open={modalOpen}
        skill={modalForm}
        isSuperadmin={isSuperadmin}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
      <DeleteConfirm
        open={!!deleteTarget}
        name={deleteTarget?.name ?? ""}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ─── Skill Card ───────────────────────────────────────────────────────────────

function SkillCard({
  skill,
  canEdit,
  onEdit,
  onDelete,
}: {
  skill: Skill;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              skill.isGlobal
                ? "bg-blue-100 dark:bg-blue-900/40"
                : "bg-emerald-100 dark:bg-emerald-900/40"
            )}
          >
            <Sparkles
              className={cn(
                "h-4 w-4",
                skill.isGlobal
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-foreground">{skill.name}</h3>
            {skill.category && (
              <span className="text-[11px] text-muted-foreground">{skill.category}</span>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
              aria-label="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {skill.description && (
        <p className="line-clamp-2 text-sm text-muted-foreground">{skill.description}</p>
      )}

      <div className="mt-auto rounded-lg border border-border bg-muted/30 px-3 py-2">
        <p className="line-clamp-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {skill.prompt}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {skill.isGlobal && (
          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
            Global
          </span>
        )}
        {!skill.isActive && (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            Inactivo
          </span>
        )}
      </div>
    </div>
  );
}
