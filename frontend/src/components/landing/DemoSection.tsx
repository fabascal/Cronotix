import { useState, useRef, useEffect } from "react";
import {
  Database,
  FileText,
  UploadCloud,
  Bot,
  Sparkles,
  Send,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function DemoSection() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    {
      role: "ai",
      text:
        "Hola, soy el asistente Cronotix. Tengo acceso a la documentación que subiste. ¿Cómo puedo ayudarte hoy?",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function send() {
    const t = input.trim();
    if (!t) return;
    setMessages((m) => [...m, { role: "user", text: t }]);
    setInput("");
    window.setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text:
            'Basado en "manual_empleado.pdf", la política de vacaciones permite 20 días al año tras el primer año. ¿Necesitas el formulario?',
        },
      ]);
    }, 900);
  }

  return (
    <section id="demo" className="scroll-mt-24 bg-navy-50/60 py-20 dark:bg-navy-900/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="font-display text-4xl font-bold text-navy-900 dark:text-white sm:text-5xl">
            Tus datos, tu inteligencia
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-xl text-navy-700/80 dark:text-slate-300">
            Observa cómo Cronotix ingesta tus documentos y crea al instante un experto en tu negocio.
          </p>
        </div>

        <div className="mx-auto flex max-w-5xl min-h-[520px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-navy-700 dark:bg-navy-900 md:flex-row md:min-h-[600px]">
          <div className="flex w-full flex-col border-slate-200 border-r bg-slate-50 p-6 dark:border-navy-700 dark:bg-navy-900/80 md:w-1/3">
            <div className="mb-6 flex items-center gap-2">
              <Database className="h-5 w-5 text-navy-700 dark:text-gold-500" aria-hidden="true" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Base de conocimiento</h3>
            </div>
            <div className="flex flex-1 flex-col space-y-3">
              <div className="relative cursor-pointer rounded-lg border border-gold-200 bg-gold-50/80 p-4 transition-colors dark:border-gold-700/50 dark:bg-gold-950/30">
                <div className="absolute top-2 right-2 h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <div className="flex items-center gap-3">
                  <FileText className="h-[18px] w-[18px] text-navy-700 dark:text-gold-400" aria-hidden="true" />
                  <div>
                    <p className="text-base font-medium text-slate-900 dark:text-white">manual_empleado.pdf</p>
                    <p className="text-sm text-slate-500 dark:text-navy-300">Procesado · 2.4MB</p>
                  </div>
                </div>
              </div>
              <div className="cursor-pointer rounded-lg border border-slate-200 bg-white p-4 opacity-70 transition-colors hover:bg-slate-50 dark:border-navy-600 dark:bg-navy-800/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-[18px] w-[18px] text-slate-400" aria-hidden="true" />
                  <div>
                    <p className="text-base font-medium text-slate-900 dark:text-white">precios_2024.csv</p>
                    <p className="text-sm text-slate-500 dark:text-navy-400">En cola</p>
                  </div>
                </div>
              </div>
              <div className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-6 text-center transition-colors hover:border-gold-400 hover:bg-gold-50/30 dark:border-navy-600 dark:hover:border-gold-600/50">
                <UploadCloud className="mb-2 h-6 w-6 text-slate-400" aria-hidden="true" />
                <p className="text-base font-medium text-slate-600 dark:text-navy-200">Añadir fuente de datos</p>
                <p className="mt-1 text-sm text-slate-400">PDF, DOCX, TXT, URL</p>
              </div>
            </div>
            <div className="mt-auto border-slate-200 border-t pt-6 dark:border-navy-700">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-navy-400">
                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-navy-700">
                  <div className="h-1.5 w-[85%] rounded-full bg-gold-600" />
                </div>
                <span>85% uso</span>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-1 flex-col bg-white dark:bg-navy-900 md:w-2/3">
            <div className="flex items-center justify-between border-slate-100 border-b bg-white p-4 dark:border-navy-700 dark:bg-navy-900">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-navy-700 to-gold-600 text-white">
                  <Bot className="h-[18px] w-[18px]" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">Asistente RRHH</h4>
                  <p className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    En línea
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-base text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 dark:border-navy-600 dark:text-navy-100 dark:hover:bg-navy-800"
              >
                Configurar
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 space-y-6 overflow-y-auto bg-slate-50/50 p-6 dark:bg-navy-950/30"
            >
              {messages.map((m, i) => (
                <div
                  key={`${i}-${m.text.slice(0, 12)}`}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  {m.role === "user" ? (
                    <div className="flex max-w-[80%] flex-row-reverse gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-navy-600 dark:text-navy-200">
                        <User className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="rounded-2xl rounded-tr-sm bg-navy-900 p-4 text-base leading-relaxed text-white dark:bg-navy-700">
                        {m.text}
                      </div>
                    </div>
                  ) : (
                    <div className="flex max-w-[80%] gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700 dark:bg-gold-900/40 dark:text-gold-400">
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-4 text-base leading-relaxed text-slate-800 shadow-sm dark:border-navy-600 dark:bg-navy-800 dark:text-navy-100">
                        {m.text}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="border-slate-100 border-t bg-white p-4 dark:border-navy-700 dark:bg-navy-900">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Pregunta algo sobre el manual…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-12 pl-4 text-base text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-navy-600 focus:ring-2 focus:ring-navy-600/30 dark:border-navy-600 dark:bg-navy-800 dark:text-white dark:placeholder:text-navy-400"
                  aria-label="Escribe tu pregunta"
                />
                <button
                  type="button"
                  onClick={send}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg bg-gold-600 p-2 text-white transition-colors hover:bg-gold-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
                  aria-label="Enviar"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
