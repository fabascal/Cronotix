import { Layers, Workflow, Zap, Shield } from "lucide-react";

export default function HowItWorksSection() {
  return (
    <section id="casos-uso" className="scroll-mt-24 bg-white py-24 dark:bg-navy-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 md:grid-cols-2">
          <div>
            <h2 className="font-display mb-6 text-4xl font-bold text-navy-900 md:text-5xl dark:text-white">
              Flujo de trabajo sin fricción
            </h2>
            <p className="mb-10 text-xl text-navy-700/80 dark:text-slate-300">
              Hemos simplificado la complejidad de los modelos LLM para que te concentres en el valor de tu negocio, no en la infraestructura.
            </p>
            <div className="space-y-8">
              {[
                {
                  Icon: Layers,
                  title: "1. Conecta tus datos",
                  desc: "Sincroniza documentos, bases de datos o sitios web con un solo clic.",
                },
                {
                  Icon: Workflow,
                  title: "2. Personaliza el flujo",
                  desc: "Define el tono, las reglas de negocio y las acciones específicas.",
                },
                {
                  Icon: Zap,
                  title: "3. Despliega en segundos",
                  desc: "Integra el agente en tu web, WhatsApp, Slack o API personalizada.",
                },
              ].map(({ Icon, title, desc }) => (
                <div key={title} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-navy-700 dark:border-navy-700 dark:bg-navy-900/50 dark:text-gold-500">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-1 text-xl font-bold text-navy-900 dark:text-white">{title}</h3>
                    <p className="text-navy-600/70 dark:text-slate-400">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 scale-95 rotate-3 rounded-3xl bg-gradient-to-tr from-navy-100/60 to-gold-100/50 dark:from-navy-900/40 dark:to-gold-900/20" />
            <div className="relative overflow-hidden rounded-2xl bg-navy-900 p-6 text-white shadow-2xl md:p-8 dark:bg-navy-950">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <Workflow className="h-[120px] w-[120px]" aria-hidden="true" />
              </div>
              <h3 className="mb-6 font-mono text-2xl text-gold-400">{"// Configuración del agente"}</h3>
              <div className="space-y-4 font-mono text-base">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-violet-400">const</span>
                  <span className="text-amber-200">agent</span>
                  <span>=</span>
                  <span className="text-sky-300">new CronotixAgent</span>
                  <span>{"({"}</span>
                </div>
                <div className="space-y-2 pl-6">
                  <p>
                    <span className="text-slate-400">model:</span>{" "}
                    <span className="text-emerald-400">{"'gpt-4o-custom'"}</span>,
                  </p>
                  <p>
                    <span className="text-slate-400">temperature:</span> <span className="text-orange-400">0.7</span>,
                  </p>
                  <p>
                    <span className="text-slate-400">knowledgeBase:</span>{" "}
                    <span>{"['docs_v2', 'api_specs']"}</span>,
                  </p>
                  <p>
                    <span className="text-slate-400">integrations:</span> <span>{"['slack', 'webhook']"}</span>
                  </p>
                </div>
                <div>{"});"}</div>
                <div className="animate-pulse pt-4">
                  <span className="text-slate-500">{"// Desplegando a producción…"}</span>
                </div>
                <div className="flex items-center gap-2 pt-2 text-emerald-400">
                  <Shield className="h-4 w-4" aria-hidden="true" />
                  <span>Verificación de seguridad completada</span>
                </div>
              </div>
              <div className="absolute bottom-6 right-6 rounded-lg border border-white/20 bg-white/10 p-3 backdrop-blur-md">
                <div className="text-sm text-slate-300">Latencia promedio</div>
                <div className="text-2xl font-bold text-white">45ms</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
