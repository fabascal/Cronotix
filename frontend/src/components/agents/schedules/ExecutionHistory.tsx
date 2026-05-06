import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { schedulesApi, type ScheduleExecutionApi } from "@/services/schedules.api";

interface Props {
  agentId: string;
  scheduleId: string;
  open: boolean;
  onClose: () => void;
}

const STATUS_META: Record<string, { icon: typeof CheckCircle2; cls: string; label: string }> = {
  success: { icon: CheckCircle2, cls: "text-emerald-600", label: "Éxito" },
  failed: { icon: XCircle, cls: "text-red-500", label: "Fallido" },
  pending: { icon: Clock, cls: "text-amber-500", label: "Pendiente" },
};

export default function ExecutionHistory({ agentId, scheduleId, open, onClose }: Props) {
  const [executions, setExecutions] = useState<ScheduleExecutionApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    schedulesApi
      .executions(agentId, scheduleId)
      .then(setExecutions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentId, scheduleId, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-xl font-bold text-foreground">Historial de ejecuciones</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : executions.length === 0 ? (
            <p className="text-center text-base text-muted-foreground py-12">Sin ejecuciones registradas</p>
          ) : (
            <div className="space-y-2">
              {executions.map((exec) => {
                const meta = STATUS_META[exec.status] ?? STATUS_META.pending;
                const Icon = meta.icon;
                const isOpen = expanded === exec.id;

                return (
                  <div key={exec.id} className="rounded-xl border border-border bg-muted/20">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : exec.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", meta.cls)} />
                      <span className="flex-1 text-base font-medium text-foreground">
                        {new Date(exec.executedAt).toLocaleString("es-MX")}
                      </span>
                      <span className={cn("text-sm font-semibold", meta.cls)}>{meta.label}</span>
                      {exec.deliveryStatus !== "skipped" && (
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          exec.deliveryStatus === "sent"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        )}>
                          {exec.deliveryStatus === "sent" ? "Enviado" : "Envío fallido"}
                        </span>
                      )}
                    </button>
                    {isOpen && (
                      <div className="border-t border-border px-4 py-3 space-y-2">
                        {exec.errorMessage && (
                          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3">
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400">Error</p>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{exec.errorMessage}</p>
                          </div>
                        )}
                        {exec.functionRequest && (
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-1">Request</p>
                            <pre className="rounded-lg bg-muted p-3 text-sm overflow-x-auto max-h-40">
                              {JSON.stringify(exec.functionRequest, null, 2)}
                            </pre>
                          </div>
                        )}
                        {exec.functionResponse && (
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground mb-1">Response</p>
                            <pre className="rounded-lg bg-muted p-3 text-sm overflow-x-auto max-h-40">
                              {JSON.stringify(exec.functionResponse, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
