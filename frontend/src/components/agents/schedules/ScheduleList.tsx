import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Loader2,
  Pencil,
  Play,
  Plus,
  Power,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import {
  schedulesApi,
  type AgentScheduleApi,
  type CreateSchedulePayload,
} from "@/services/schedules.api";
import ScheduleFormDialog from "./ScheduleFormDialog";
import ExecutionHistory from "./ExecutionHistory";

interface AgentFunctionOption {
  id: string;
  name: string;
  description: string | null;
}

interface Props {
  agentId: string;
  functions: AgentFunctionOption[];
}

const RECURRENCE_LABELS: Record<string, string> = {
  interval: "Intervalo",
  daily: "Diario",
  weekly: "Semanal",
  monthly: "Mensual",
  once: "Una vez",
};

function describeRecurrence(s: AgentScheduleApi): string {
  const c = s.recurrenceConfig;
  switch (s.recurrenceType) {
    case "interval":
      if (c.intervalHours) return `Cada ${c.intervalHours}h`;
      return `Cada ${c.intervalMinutes ?? 30} min`;
    case "daily":
      return `Diario a las ${c.time ?? "09:00"}`;
    case "weekly": {
      const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      return `${days[(c.dayOfWeek as number) ?? 1]} a las ${c.time ?? "09:00"}`;
    }
    case "monthly":
      return `Día ${c.dayOfMonth ?? 1} a las ${c.time ?? "09:00"}`;
    case "once":
      return c.runAt ? new Date(c.runAt as string).toLocaleString("es-MX") : "Pendiente";
    default:
      return s.recurrenceType;
  }
}

export default function ScheduleList({ agentId, functions }: Props) {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<AgentScheduleApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AgentScheduleApi | null>(null);
  const [historyScheduleId, setHistoryScheduleId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await schedulesApi.list(agentId);
      setSchedules(data);
    } catch {
      toast("Error al cargar schedules", "error");
    } finally {
      setLoading(false);
    }
  }, [agentId, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSave = async (data: CreateSchedulePayload) => {
    try {
      if (editing) {
        await schedulesApi.update(agentId, editing.id, data);
        toast("Schedule actualizado", "success");
      } else {
        await schedulesApi.create(agentId, data);
        toast("Schedule creado", "success");
      }
      await fetch();
    } catch {
      toast("Error al guardar schedule", "error");
      throw new Error("save failed");
    }
  };

  const handleToggle = async (s: AgentScheduleApi) => {
    try {
      await schedulesApi.toggle(agentId, s.id);
      await fetch();
    } catch {
      toast("Error al cambiar estado", "error");
    }
  };

  const handleDelete = async (s: AgentScheduleApi) => {
    try {
      await schedulesApi.remove(agentId, s.id);
      toast("Schedule eliminado", "success");
      await fetch();
    } catch {
      toast("Error al eliminar schedule", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {schedules.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-base text-muted-foreground">No hay schedules configurados</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Crea uno para ejecutar funciones automáticamente
            </p>
          </div>
        ) : (
          schedules.map((s) => (
            <div
              key={s.id}
              className={cn(
                "group rounded-xl border p-4 transition-colors",
                s.isActive
                  ? "border-primary/20 bg-primary/[0.02]"
                  : "border-border bg-muted/20 opacity-70"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-semibold text-foreground truncate">{s.name}</h4>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        s.isActive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {s.isActive ? "Activo" : "Inactivo"}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      {RECURRENCE_LABELS[s.recurrenceType] ?? s.recurrenceType}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {describeRecurrence(s)}
                    </span>
                    {s.function && (
                      <span className="font-mono text-[11px] text-primary/70">{s.function.name}</span>
                    )}
                    {s.deliveryType !== "none" && (
                      <span className="capitalize">{s.deliveryType}</span>
                    )}
                    {s.contactList && (
                      <span>→ {s.contactList.name}</span>
                    )}
                  </div>
                  {s.lastRunAt && (
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      Última ejecución: {new Date(s.lastRunAt).toLocaleString("es-MX")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setHistoryScheduleId(s.id)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                    title="Ver historial"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditing(s); setFormOpen(true); }}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(s)}
                    className={cn(
                      "rounded p-1.5",
                      s.isActive
                        ? "text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                    title={s.isActive ? "Desactivar" : "Activar"}
                  >
                    <Power className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}

        <button
          type="button"
          onClick={() => { setEditing(null); setFormOpen(true); }}
          disabled={functions.length === 0}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-base font-medium transition-colors",
            functions.length === 0
              ? "border-border text-muted-foreground/50 cursor-not-allowed"
              : "border-primary/30 text-primary hover:bg-primary/5"
          )}
        >
          <Plus className="h-4 w-4" />
          Nuevo schedule
        </button>

        {functions.length === 0 && (
          <p className="text-center text-sm text-amber-600 dark:text-amber-400">
            Necesitas crear al menos una función para poder crear schedules
          </p>
        )}
      </div>

      <ScheduleFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={handleSave}
        functions={functions}
        editing={editing}
      />

      <ExecutionHistory
        agentId={agentId}
        scheduleId={historyScheduleId ?? ""}
        open={!!historyScheduleId}
        onClose={() => setHistoryScheduleId(null)}
      />
    </>
  );
}
