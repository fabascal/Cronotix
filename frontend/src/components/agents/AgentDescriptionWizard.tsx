import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Wand2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileSearch,
  Tags,
  MessageSquare,
  Briefcase,
  HeartPulse,
  DollarSign,
  Users,
  Globe,
  Smile,
  BookOpen,
  Mic,
  AlignLeft,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/apiClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardMode = "description" | "systemPrompt";

interface WizardAnswers {
  purpose: string;
  domain: string;
  capabilities: string;
  tone: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (text: string) => void;
  mode?: WizardMode;
}

interface StepOption {
  value: string;
  label: string;
  sublabel?: string;
  Icon: React.ElementType;
  /** Clases Tailwind para el borde e icono en estado seleccionado */
  selectedBorder: string;
  selectedBg: string;
  selectedIconBg: string;
}

// ─── Opciones por paso ────────────────────────────────────────────────────────

const PURPOSE_OPTIONS: StepOption[] = [
  {
    value: "resumir",
    label: "Resumir",
    sublabel: "Condensa documentos en puntos clave",
    Icon: FileText,
    selectedBorder: "border-blue-500",
    selectedBg: "bg-blue-50 dark:bg-blue-950/40",
    selectedIconBg: "bg-blue-100 dark:bg-blue-900/60",
  },
  {
    value: "extraer",
    label: "Extraer datos",
    sublabel: "Obtiene campos estructurados en JSON",
    Icon: FileSearch,
    selectedBorder: "border-amber-500",
    selectedBg: "bg-amber-50 dark:bg-amber-950/30",
    selectedIconBg: "bg-amber-100 dark:bg-amber-900/50",
  },
  {
    value: "clasificar",
    label: "Clasificar",
    sublabel: "Categoriza y etiqueta documentos",
    Icon: Tags,
    selectedBorder: "border-emerald-500",
    selectedBg: "bg-emerald-50 dark:bg-emerald-950/30",
    selectedIconBg: "bg-emerald-100 dark:bg-emerald-900/50",
  },
  {
    value: "responder",
    label: "Responder preguntas",
    sublabel: "Dialoga sobre el contenido del documento",
    Icon: MessageSquare,
    selectedBorder: "border-purple-500",
    selectedBg: "bg-purple-50 dark:bg-purple-950/30",
    selectedIconBg: "bg-purple-100 dark:bg-purple-900/50",
  },
  {
    value: "otro",
    label: "Otro",
    sublabel: "Procesamiento personalizado",
    Icon: Wand2,
    selectedBorder: "border-slate-500",
    selectedBg: "bg-slate-50 dark:bg-slate-800/30",
    selectedIconBg: "bg-slate-100 dark:bg-slate-700/50",
  },
];

const DOMAIN_OPTIONS: StepOption[] = [
  {
    value: "legal",
    label: "Legal",
    sublabel: "Contratos, escrituras, normativas",
    Icon: Briefcase,
    selectedBorder: "border-blue-500",
    selectedBg: "bg-blue-50 dark:bg-blue-950/30",
    selectedIconBg: "bg-blue-100 dark:bg-blue-900/50",
  },
  {
    value: "médico",
    label: "Médico",
    sublabel: "Historiales, recetas, diagnósticos",
    Icon: HeartPulse,
    selectedBorder: "border-red-500",
    selectedBg: "bg-red-50 dark:bg-red-950/30",
    selectedIconBg: "bg-red-100 dark:bg-red-900/50",
  },
  {
    value: "financiero",
    label: "Financiero",
    sublabel: "Facturas, estados de cuenta, reportes",
    Icon: DollarSign,
    selectedBorder: "border-amber-500",
    selectedBg: "bg-amber-50 dark:bg-amber-950/30",
    selectedIconBg: "bg-amber-100 dark:bg-amber-900/50",
  },
  {
    value: "recursos_humanos",
    label: "Recursos Humanos",
    sublabel: "CVs, contratos laborales, nóminas",
    Icon: Users,
    selectedBorder: "border-emerald-500",
    selectedBg: "bg-emerald-50 dark:bg-emerald-950/30",
    selectedIconBg: "bg-emerald-100 dark:bg-emerald-900/50",
  },
  {
    value: "general",
    label: "General",
    sublabel: "Documentos de uso variado",
    Icon: Globe,
    selectedBorder: "border-slate-500",
    selectedBg: "bg-slate-50 dark:bg-slate-800/30",
    selectedIconBg: "bg-slate-100 dark:bg-slate-700/50",
  },
];

const TONE_OPTIONS: StepOption[] = [
  {
    value: "formal",
    label: "Formal",
    sublabel: "Profesional y estructurado",
    Icon: BookOpen,
    selectedBorder: "border-blue-500",
    selectedBg: "bg-blue-50 dark:bg-blue-950/30",
    selectedIconBg: "bg-blue-100 dark:bg-blue-900/50",
  },
  {
    value: "técnico",
    label: "Técnico",
    sublabel: "Preciso con terminología especializada",
    Icon: AlignLeft,
    selectedBorder: "border-purple-500",
    selectedBg: "bg-purple-50 dark:bg-purple-950/30",
    selectedIconBg: "bg-purple-100 dark:bg-purple-900/50",
  },
  {
    value: "amigable",
    label: "Amigable",
    sublabel: "Cercano y fácil de entender",
    Icon: Smile,
    selectedBorder: "border-amber-500",
    selectedBg: "bg-amber-50 dark:bg-amber-950/30",
    selectedIconBg: "bg-amber-100 dark:bg-amber-900/50",
  },
  {
    value: "neutro",
    label: "Neutro",
    sublabel: "Objetivo y sin sesgo",
    Icon: Mic,
    selectedBorder: "border-slate-500",
    selectedBg: "bg-slate-50 dark:bg-slate-800/30",
    selectedIconBg: "bg-slate-100 dark:bg-slate-700/50",
  },
];

// Los títulos del paso 3 difieren según el modo
const STEP_3_TITLES: Record<WizardMode, { title: string; subtitle: string; placeholder: string }> = {
  description: {
    title: "Detalles",
    subtitle: "¿Qué documentos o acciones específicas?",
    placeholder: "Ej. Contratos de arrendamiento, expedientes médicos, facturas electrónicas CFDI…",
  },
  systemPrompt: {
    title: "Restricciones",
    subtitle: "¿Qué comportamientos o restricciones específicas debe tener?",
    placeholder: "Ej. Nunca revelar información confidencial, responder solo en español, limitarse al dominio financiero…",
  },
};

// ─── OptionCard ───────────────────────────────────────────────────────────────

function OptionCard({
  option,
  selected,
  onSelect,
}: {
  option: StepOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left",
        "transition-[border-color,background-color] duration-150",
        "antialiased",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        selected
          ? cn(option.selectedBorder, option.selectedBg, "ring-1 ring-black/10 dark:ring-white/10")
          : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-500 dark:hover:bg-slate-900/70"
      )}
      aria-pressed={selected}
    >
      {/* Icono */}
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
          selected ? option.selectedIconBg : "bg-muted/50 group-hover:bg-muted"
        )}
      >
        <option.Icon
          className={cn(
            "h-5 w-5 transition-colors",
            selected ? "text-foreground" : "text-muted-foreground"
          )}
          aria-hidden="true"
        />
      </span>

      {/* Texto */}
      <div className="min-w-0 flex-1">
        <p className={cn("text-base font-semibold leading-tight", selected ? "text-foreground" : "text-foreground/80")}>
          {option.label}
        </p>
        {option.sublabel && (
          <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{option.sublabel}</p>
        )}
      </div>

      {/* Check */}
      <CheckCircle2
        className={cn(
          "h-4 w-4 shrink-0 transition-opacity",
          selected ? "opacity-100 text-primary" : "opacity-0"
        )}
        aria-hidden="true"
      />
    </button>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

export default function AgentDescriptionWizard({
  open,
  onOpenChange,
  onGenerated,
  mode = "description",
}: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswers>({
    purpose: "",
    domain: "",
    capabilities: "",
    tone: "",
  });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const TOTAL_STEPS = 4;
  const isLastInputStep = step === TOTAL_STEPS - 1;
  const isResultStep = step === TOTAL_STEPS;

  const stepTitles = [
    { title: "Tarea principal", subtitle: "¿Qué hará este agente?" },
    { title: "Dominio", subtitle: "¿En qué industria se usará?" },
    { title: STEP_3_TITLES[mode].title, subtitle: STEP_3_TITLES[mode].subtitle },
    { title: "Tono", subtitle: "¿Cómo debe comunicarse?" },
  ];
  const currentStep = stepTitles[step] ?? stepTitles[0];

  const canAdvance = (): boolean => {
    if (step === 0) return Boolean(answers.purpose);
    if (step === 1) return Boolean(answers.domain);
    if (step === 2) return true;
    if (step === 3) return Boolean(answers.tone);
    return false;
  };

  // Configuración por modo
  const config = {
    description: {
      modalTitle: "Generar descripción con IA",
      endpoint: "/api/v1/agents/generate-description",
      responseKey: "description" as const,
      generatingText: "Generando descripción…",
      resultTitle: "Descripción generada",
      resultHint: "Puedes editar la descripción después de insertarla.",
      useButtonLabel: "Usar descripción",
      Icon: Wand2,
    },
    systemPrompt: {
      modalTitle: "Generar instrucciones del sistema",
      endpoint: "/api/v1/agents/generate-system-prompt",
      responseKey: "systemPrompt" as const,
      generatingText: "Generando instrucciones…",
      resultTitle: "Instrucciones generadas",
      resultHint: "Puedes revisar y ajustar el contenido antes de guardar.",
      useButtonLabel: "Usar instrucciones",
      Icon: Terminal,
    },
  }[mode];

  function reset() {
    setStep(0);
    setAnswers({ purpose: "", domain: "", capabilities: "", tone: "" });
    setGenerating(false);
    setGenerated(null);
    setError(null);
  }

  function handleClose(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setGenerated(null);
    try {
      const res = await apiClient.post<Record<string, string>>(config.endpoint, answers);
      const text = res.data[config.responseKey] ?? "";
      setGenerated(text);
    } catch (err: unknown) {
      const raw = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      setError(typeof raw === "string" ? raw : "Error al generar. Intenta de nuevo.");
    } finally {
      setGenerating(false);
    }
  }

  function handleNext() {
    if (isLastInputStep) {
      setStep((s) => s + 1);
      handleGenerate();
    } else {
      setStep((s) => s + 1);
    }
  }

  function handleUse() {
    if (generated) {
      onGenerated(generated);
      handleClose(false);
    }
  }

  function handleBack() {
    if (isResultStep) {
      setGenerated(null);
      setError(null);
    }
    setStep((s) => s - 1);
  }

  const ModalIcon = config.Icon;

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        {/* Overlay sin blur — el blur del fondo puede afectar capas en algunos navegadores */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/*
          Centrado con flex (no translate -50%) para evitar texto borroso en Chrome/Edge:
          left/top + translate sobre el panel crea subpíxeles y difumina el texto.
        */}
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 pointer-events-none"
        >
          <Dialog.Content
            className={cn(
              "pointer-events-auto relative z-50 w-full max-w-[440px] max-h-[min(90vh,720px)] overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900",
              "flex flex-col outline-none min-h-0",
              /* Solo fade: sin zoom/slide que añadan transform al panel */
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:duration-150 data-[state=open]:duration-200",
              "antialiased [text-rendering:optimizeLegibility]"
            )}
          >
          {/* ── Cabecera ── */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <ModalIcon className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <div>
                <Dialog.Title className="text-lg font-semibold leading-tight text-foreground">
                  {config.modalTitle}
                </Dialog.Title>
                <p className="text-sm text-muted-foreground">Potenciado por Ollama</p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-slate-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-slate-700"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {/* ── Cuerpo (scroll interno si el contenido es alto) ── */}
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {!isResultStep ? (
              <div className="flex flex-col gap-4">
                {/* Indicador de paso — texto claro, sin puntos microscópicos */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-medium text-muted-foreground">
                      Paso {step + 1} de {TOTAL_STEPS}
                    </p>
                    <h3 className="mt-0.5 text-xl font-semibold leading-tight text-foreground">
                      {currentStep.title}
                    </h3>
                    <p className="mt-0.5 text-base text-muted-foreground">{currentStep.subtitle}</p>
                  </div>
                  {/* Barra de progreso lineal */}
                  <div className="mt-1.5 flex shrink-0 flex-col items-end gap-1">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
                        aria-hidden="true"
                      />
                    </div>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {Math.round(((step + 1) / TOTAL_STEPS) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Contenido del paso */}
                {step === 0 && (
                  <div className="flex flex-col gap-2">
                    {PURPOSE_OPTIONS.map((opt) => (
                      <OptionCard
                        key={opt.value}
                        option={opt}
                        selected={answers.purpose === opt.value}
                        onSelect={() => setAnswers((a) => ({ ...a, purpose: opt.value }))}
                      />
                    ))}
                  </div>
                )}

                {step === 1 && (
                  <div className="flex flex-col gap-2">
                    {DOMAIN_OPTIONS.map((opt) => (
                      <OptionCard
                        key={opt.value}
                        option={opt}
                        selected={answers.domain === opt.value}
                        onSelect={() => setAnswers((a) => ({ ...a, domain: opt.value }))}
                      />
                    ))}
                  </div>
                )}

                {step === 2 && (
                  <div className="flex flex-col gap-3">
                    <p className="text-base text-muted-foreground">
                      Opcional — ayuda a la IA a generar un resultado más preciso.
                    </p>
                    <textarea
                      rows={4}
                      maxLength={500}
                      placeholder={STEP_3_TITLES[mode].placeholder}
                      value={answers.capabilities}
                      onChange={(e) => setAnswers((a) => ({ ...a, capabilities: e.target.value }))}
                      className={cn(
                        "w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base dark:border-slate-700 dark:bg-slate-950",
                        "placeholder:text-muted-foreground/65",
                        "focus:outline-none focus:ring-2 focus:ring-ring",
                        "transition-shadow"
                      )}
                    />
                    <p className="text-right text-sm tabular-nums text-muted-foreground">
                      {answers.capabilities.length}/500
                    </p>
                  </div>
                )}

                {step === 3 && (
                  <div className="flex flex-col gap-2">
                    {TONE_OPTIONS.map((opt) => (
                      <OptionCard
                        key={opt.value}
                        option={opt}
                        selected={answers.tone === opt.value}
                        onSelect={() => setAnswers((a) => ({ ...a, tone: opt.value }))}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Paso de resultado */
              <div className="flex flex-col gap-4">
                {generating ? (
                  <div className="flex flex-col items-center gap-3 py-10">
                    <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden="true" />
                    <p className="text-lg font-medium text-foreground">{config.generatingText}</p>
                    <p className="max-w-[260px] text-center text-base text-muted-foreground">
                      Ollama está procesando tu solicitud. Esto puede tomar unos segundos.
                    </p>
                  </div>
                ) : error ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
                      <div>
                        <p className="text-base font-semibold text-destructive">No se pudo generar</p>
                        <p className="mt-1 text-base leading-relaxed text-muted-foreground">{error}</p>
                      </div>
                    </div>
                  </div>
                ) : generated ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                      <p className="text-lg font-semibold text-foreground">{config.resultTitle}</p>
                    </div>
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
                      <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                        {generated}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{config.resultHint}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* ── Pie ── */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/60">
            {step > 0 && !generating ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-base font-medium text-muted-foreground transition-colors hover:bg-slate-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-slate-700"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Atrás
              </button>
            ) : (
              <div />
            )}

            {isResultStep ? (
              <button
                type="button"
                onClick={handleUse}
                disabled={!generated || generating}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-5 py-2.5 text-base font-semibold",
                  "bg-primary text-primary-foreground transition-opacity hover:opacity-90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:pointer-events-none disabled:opacity-40"
                )}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                {config.useButtonLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canAdvance()}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-5 py-2.5 text-base font-semibold",
                  "bg-primary text-primary-foreground transition-opacity hover:opacity-90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:pointer-events-none disabled:opacity-40"
                )}
              >
                {isLastInputStep ? (
                  <>
                    <Wand2 className="h-4 w-4" aria-hidden="true" />
                    Generar
                  </>
                ) : (
                  <>
                    Siguiente
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            )}
          </div>
        </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
