import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ExternalLink, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import RecurrenceBuilder from "./RecurrenceBuilder";
import { contactsApi, type ContactListApi } from "@/services/contacts.api";
import { smtpApi, type SmtpConfigApi } from "@/services/smtp.api";
import { whatsappApi, type WhatsappConfigApi } from "@/services/whatsapp.api";
import { telegramApi, type TelegramConfigApi } from "@/services/telegram.api";
import type {
  AgentScheduleApi,
  CreateSchedulePayload,
} from "@/services/schedules.api";

interface AgentFunctionOption {
  id: string;
  name: string;
  description: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateSchedulePayload) => Promise<void>;
  functions: AgentFunctionOption[];
  editing?: AgentScheduleApi | null;
}

type RecurrenceType = "interval" | "daily" | "weekly" | "monthly" | "once";
type DeliveryType = "none" | "email" | "whatsapp" | "telegram";

const STEPS = ["Función", "Parámetros", "Procesamiento IA", "Recurrencia", "Entrega"];

const inputCls =
  "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow";

const selectCls =
  "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow";

export default function ScheduleFormDialog({ open, onClose, onSave, functions, editing }: Props) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [functionId, setFunctionId] = useState("");
  const [staticParams, setStaticParams] = useState("{}");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("daily");
  const [recurrenceConfig, setRecurrenceConfig] = useState<Record<string, unknown>>({ time: "09:00" });
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("none");
  const [contactListId, setContactListId] = useState("");
  const [smtpConfigId, setSmtpConfigId] = useState("");
  const [whatsappConfigId, setWhatsappConfigId] = useState("");
  const [processingPrompt, setProcessingPrompt] = useState("");

  const [paramsError, setParamsError] = useState<string | null>(null);

  const [contactLists, setContactLists] = useState<ContactListApi[]>([]);
  const [smtpConfigs, setSmtpConfigs] = useState<SmtpConfigApi[]>([]);
  const [whatsappConfigs, setWhatsappConfigs] = useState<WhatsappConfigApi[]>([]);
  const [telegramConfigs, setTelegramConfigs] = useState<TelegramConfigApi[]>([]);
  const [telegramConfigId, setTelegramConfigId] = useState("");

  useEffect(() => {
    if (!open) return;

    contactsApi.list().then(setContactLists).catch(() => {});
    smtpApi.list().then(setSmtpConfigs).catch(() => {});
    whatsappApi.list().then(setWhatsappConfigs).catch(() => {});
    telegramApi.list().then(setTelegramConfigs).catch(() => {});

    if (editing) {
      setName(editing.name);
      setDescription(editing.description ?? "");
      setFunctionId(editing.functionId ?? "");
      setStaticParams(JSON.stringify(editing.staticParams, null, 2));
      setRecurrenceType(editing.recurrenceType);
      setRecurrenceConfig(editing.recurrenceConfig);
      setDeliveryType(editing.deliveryType);
      setContactListId(editing.contactListId ?? "");
      setSmtpConfigId(editing.smtpConfigId ?? "");
      setWhatsappConfigId(editing.whatsappConfigId ?? "");
      setTelegramConfigId(editing.telegramConfigId ?? "");
      setProcessingPrompt(editing.processingPrompt ?? "");
    } else {
      setName("");
      setDescription("");
      setFunctionId(functions[0]?.id ?? "");
      setStaticParams("{}");
      setRecurrenceType("daily");
      setRecurrenceConfig({ time: "09:00" });
      setDeliveryType("none");
      setContactListId("");
      setSmtpConfigId("");
      setWhatsappConfigId("");
      setTelegramConfigId("");
      setProcessingPrompt("");
    }
    setStep(0);
    setParamsError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const handleSave = async () => {
    let parsedParams: Record<string, unknown> = {};
    try {
      parsedParams = JSON.parse(staticParams);
    } catch { /* keep empty */ }

    setSaving(true);
    try {
      await onSave({
        name,
        description: description || undefined,
        functionId,
        staticParams: parsedParams,
        processingPrompt:
          processingPrompt.trim() === ""
            ? (editing ? null : undefined)
            : processingPrompt.trim(),
        recurrenceType,
        recurrenceConfig,
        deliveryType,
        contactListId: contactListId || undefined,
        smtpConfigId: smtpConfigId || undefined,
        whatsappConfigId: whatsappConfigId || undefined,
        telegramConfigId: telegramConfigId || undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const canNext = () => {
    if (step === 0) return !!name.trim() && !!functionId;
    if (step === 1) return !paramsError;
    return true;
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-xl font-bold text-foreground">
            {editing ? "Editar schedule" : "Nuevo schedule"}
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 px-6 pt-4">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => i <= step && setStep(i)}
              className={cn(
                "flex-1 rounded-full py-1 text-[11px] font-semibold transition-colors text-center",
                i === step
                  ? "bg-primary/15 text-primary"
                  : i < step
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {step === 0 && (
            <>
              <div>
                <label className="mb-1 block text-sm font-semibold text-muted-foreground">Nombre *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Reporte diario de ventas"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-muted-foreground">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className={cn(inputCls, "resize-none")}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-muted-foreground">Función a ejecutar *</label>
                {functions.length === 0 ? (
                  <p className="text-base text-amber-600 dark:text-amber-400">
                    Este agente no tiene funciones configuradas. Crea una función primero.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {functions.map((fn) => (
                      <button
                        key={fn.id}
                        type="button"
                        onClick={() => setFunctionId(fn.id)}
                        className={cn(
                          "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                          functionId === fn.id
                            ? "border-primary bg-primary/5"
                            : "border-input hover:bg-muted/50"
                        )}
                      >
                        <span className="text-base font-semibold text-foreground">{fn.name}</span>
                        {fn.description && (
                          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{fn.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-muted-foreground">
                Parámetros estáticos (JSON)
              </label>
              <textarea
                value={staticParams}
                onChange={(e) => {
                  const v = e.target.value;
                  setStaticParams(v);
                  try { JSON.parse(v); setParamsError(null); }
                  catch { setParamsError("JSON inválido"); }
                }}
                rows={8}
                spellCheck={false}
                className={cn(inputCls, "font-mono text-sm resize-none", paramsError && "border-destructive focus-visible:ring-destructive")}
              />
              {paramsError ? (
                <p className="mt-1 text-sm text-destructive">{paramsError}</p>
              ) : (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Estos parámetros se enviarán al webhook de la función en cada ejecución.
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-muted-foreground">
                Procesamiento IA (opcional)
              </label>
              <textarea
                value={processingPrompt}
                onChange={(e) => setProcessingPrompt(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder='Ej: "Resume los datos del Pokémon en español, destacando tipo, peso y las estadísticas más altas."'
                className={cn(inputCls, "resize-none")}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Si lo completas, el resultado del webhook se pasa al modelo del agente junto con las skills
                asignadas; el correo llevará el texto generado, no el JSON crudo.
              </p>
            </div>
          )}

          {step === 3 && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-muted-foreground">
                ¿Cuándo se ejecuta?
              </label>
              <RecurrenceBuilder
                type={recurrenceType}
                config={recurrenceConfig}
                onChange={(t, c) => {
                  setRecurrenceType(t);
                  setRecurrenceConfig(c);
                }}
              />
            </div>
          )}

          {step === 4 && (
            <>
              <div>
                <label className="mb-2 block text-sm font-semibold text-muted-foreground">
                  Método de entrega del resultado
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["none", "email", "whatsapp", "telegram"] as const).map((dt) => (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => setDeliveryType(dt)}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        deliveryType === dt
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {dt === "none" ? "Sin entrega" : dt === "email" ? "Email" : dt === "whatsapp" ? "WhatsApp" : "Telegram"}
                    </button>
                  ))}
                </div>
              </div>

              {deliveryType !== "none" && (
                <>
                  {/* Contact list selector */}
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-muted-foreground">
                      Lista de contacto
                    </label>
                    {contactLists.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-base dark:border-amber-800 dark:bg-amber-900/20">
                        <p className="text-amber-700 dark:text-amber-300">No tienes listas de contacto.</p>
                        <Link
                          to="/dashboard/contacts"
                          className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          Crear lista <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      <select
                        value={contactListId}
                        onChange={(e) => setContactListId(e.target.value)}
                        className={selectCls}
                      >
                        <option value="">Seleccionar lista…</option>
                        {contactLists.map((cl) => (
                          <option key={cl.id} value={cl.id}>
                            {cl.name} ({cl.entryCount ?? 0} contactos)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {deliveryType === "email" && (
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-muted-foreground">
                        Configuración SMTP
                      </label>
                      {smtpConfigs.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-base dark:border-amber-800 dark:bg-amber-900/20">
                          <p className="text-amber-700 dark:text-amber-300">No tienes credenciales SMTP.</p>
                          <Link
                            to="/dashboard/settings/smtp"
                            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                          >
                            Configurar SMTP <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      ) : (
                        <select
                          value={smtpConfigId}
                          onChange={(e) => setSmtpConfigId(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">Seleccionar configuración…</option>
                          {smtpConfigs.map((sc) => (
                            <option key={sc.id} value={sc.id}>
                              {sc.name} ({sc.host})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {deliveryType === "whatsapp" && (
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-muted-foreground">
                        Línea WhatsApp
                      </label>
                      {whatsappConfigs.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-base dark:border-amber-800 dark:bg-amber-900/20">
                          <p className="text-amber-700 dark:text-amber-300">No tienes líneas WhatsApp configuradas.</p>
                          <Link
                            to="/dashboard/mcp"
                            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                          >
                            Configurar WhatsApp <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      ) : (
                        <select
                          value={whatsappConfigId}
                          onChange={(e) => setWhatsappConfigId(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">Seleccionar línea…</option>
                          {whatsappConfigs.map((wc) => (
                            <option key={wc.id} value={wc.id}>
                              {wc.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {deliveryType === "telegram" && (
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-muted-foreground">
                        Bot Telegram
                      </label>
                      {telegramConfigs.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-base dark:border-amber-800 dark:bg-amber-900/20">
                          <p className="text-amber-700 dark:text-amber-300">No tienes bots Telegram configurados.</p>
                          <Link
                            to="/dashboard/mcp"
                            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                          >
                            Configurar Telegram <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>
                      ) : (
                        <select
                          value={telegramConfigId}
                          onChange={(e) => setTelegramConfigId(e.target.value)}
                          className={selectCls}
                        >
                          <option value="">Seleccionar bot…</option>
                          {telegramConfigs.map((tc) => (
                            <option key={tc.id} value={tc.id}>
                              {tc.name}{tc.botUsername ? ` (${tc.botUsername})` : ""}
                            </option>
                          ))}
                        </select>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Se enviará a los contactos de la lista que tengan un <strong>Telegram Chat ID</strong> configurado.
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
            className="rounded-lg border border-border px-4 py-2 text-base font-medium hover:bg-muted"
          >
            {step > 0 ? "Anterior" : "Cancelar"}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="rounded-lg bg-primary px-4 py-2 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name.trim() || !functionId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Guardar cambios" : "Crear schedule"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
