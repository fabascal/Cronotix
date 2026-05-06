import { cn } from "@/lib/utils";

type RecurrenceType = "interval" | "daily" | "weekly" | "monthly" | "once";

interface RecurrenceConfig {
  intervalMinutes?: number;
  intervalHours?: number;
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  runAt?: string;
}

interface Props {
  type: RecurrenceType;
  config: RecurrenceConfig;
  onChange: (type: RecurrenceType, config: RecurrenceConfig) => void;
}

const TYPES: { value: RecurrenceType; label: string }[] = [
  { value: "interval", label: "Cada intervalo" },
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "once", label: "Una sola vez" },
];

const DAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow";

export default function RecurrenceBuilder({ type, config, onChange }: Props) {
  const setType = (t: RecurrenceType) => {
    const defaults: Record<RecurrenceType, RecurrenceConfig> = {
      interval: { intervalMinutes: 30 },
      daily: { time: "09:00" },
      weekly: { dayOfWeek: 1, time: "09:00" },
      monthly: { dayOfMonth: 1, time: "09:00" },
      once: { runAt: new Date(Date.now() + 3600000).toISOString().slice(0, 16) },
    };
    onChange(t, defaults[t]);
  };

  const patch = (partial: Partial<RecurrenceConfig>) =>
    onChange(type, { ...config, ...partial });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              type === t.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {type === "interval" && (
        <div className="flex items-center gap-2">
          <span className="text-base text-muted-foreground">Cada</span>
          <input
            type="number"
            min={1}
            max={config.intervalHours ? 24 : 1440}
            value={config.intervalHours ?? config.intervalMinutes ?? 30}
            onChange={(e) => {
              const v = Number(e.target.value) || 1;
              if (config.intervalHours) patch({ intervalHours: v, intervalMinutes: undefined });
              else patch({ intervalMinutes: v, intervalHours: undefined });
            }}
            className={cn(inputCls, "w-20 text-center")}
          />
          <select
            value={config.intervalHours ? "hours" : "minutes"}
            onChange={(e) => {
              const val = config.intervalHours ?? config.intervalMinutes ?? 30;
              if (e.target.value === "hours") patch({ intervalHours: Math.min(val, 24), intervalMinutes: undefined });
              else patch({ intervalMinutes: val, intervalHours: undefined });
            }}
            className={cn(inputCls, "w-28")}
          >
            <option value="minutes">minutos</option>
            <option value="hours">horas</option>
          </select>
        </div>
      )}

      {(type === "daily" || type === "weekly" || type === "monthly") && (
        <div className="flex flex-wrap items-center gap-3">
          {type === "weekly" && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-muted-foreground">Día</label>
              <select
                value={config.dayOfWeek ?? 1}
                onChange={(e) => patch({ dayOfWeek: Number(e.target.value) })}
                className={cn(inputCls, "w-36")}
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          )}
          {type === "monthly" && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-muted-foreground">Día del mes</label>
              <input
                type="number"
                min={1}
                max={28}
                value={config.dayOfMonth ?? 1}
                onChange={(e) => patch({ dayOfMonth: Number(e.target.value) || 1 })}
                className={cn(inputCls, "w-20 text-center")}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold text-muted-foreground">Hora</label>
            <input
              type="time"
              value={config.time ?? "09:00"}
              onChange={(e) => patch({ time: e.target.value })}
              className={cn(inputCls, "w-32")}
            />
          </div>
        </div>
      )}

      {type === "once" && (
        <div>
          <label className="mb-1 block text-sm font-semibold text-muted-foreground">Fecha y hora de ejecución</label>
          <input
            type="datetime-local"
            value={(config.runAt ?? "").slice(0, 16)}
            onChange={(e) => patch({ runAt: new Date(e.target.value).toISOString() })}
            className={cn(inputCls, "w-60")}
          />
        </div>
      )}
    </div>
  );
}
