import Icons from "@/assets/icons";

const FEATURES = [
  {
    icon: <Icons.ChatBubbleLeftRightIcon className="h-7 w-7 text-gold-600 dark:text-gold-400" aria-hidden="true" />,
    title: "Agentes Conversacionales",
    description:
      "Asistentes que entienden documentos en lenguaje natural, mantienen contexto y responden con precisión clínica.",
  },
  {
    icon: <Icons.VaadinAutomationIcon className="h-7 w-7 text-gold-600 dark:text-gold-400" aria-hidden="true" />,
    title: "Automatización OCR",
    description:
      "Extracción de texto con Google Document AI. Procesa PDFs en cola asíncrona sin bloquear tus operaciones.",
  },
  {
    icon: <Icons.GrommetIconsIntegration className="h-7 w-7 text-gold-600 dark:text-gold-400" aria-hidden="true" />,
    title: "Integraciones MCP",
    description:
      "Conecta tus sistemas externos (CRM, Notion, ERP) mediante Model Context Protocol con cifrado AES-256.",
  },
  {
    icon: <Icons.ChartBarIcon className="h-7 w-7 text-gold-600 dark:text-gold-400" aria-hidden="true" />,
    title: "Billing por Créditos",
    description:
      "Modelo transparente de créditos. Rastrea el costo exacto de cada operación IA por cliente en tiempo real.",
  },
  {
    icon: <Icons.ShieldCheckIcon className="h-7 w-7 text-gold-600 dark:text-gold-400" aria-hidden="true" />,
    title: "Multi-Tenant Seguro",
    description:
      "Aislamiento completo por tenant. API Keys con hash SHA-256 y validación previa al consumo de recursos.",
  },
  {
    icon: <Icons.CloudArrowUpIcon className="h-7 w-7 text-gold-600 dark:text-gold-400" aria-hidden="true" />,
    title: "Búsqueda Semántica",
    description:
      "pgvector + embeddings para encontrar contenido relevante en miles de documentos en milisegundos.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="relative isolate py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-700/40 to-transparent" aria-hidden="true" />

      <div className="container mx-auto px-6">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.6em] text-gold-600 dark:text-gold-500">
            Plataforma
          </p>
          <h2 className="font-display text-4xl font-bold text-foreground text-wrap-balance sm:text-5xl">
            Lo que puedes hacer
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Todo lo necesario para desplegar agentes IA en producción con control total de costos y seguridad.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-card/70 p-6 backdrop-blur transition-[transform,border-color,box-shadow] duration-300 hover:border-gold-700/50 hover:shadow-[0_0_32px_rgba(149,124,61,0.15)] hover:scale-[1.02] focus-within:border-gold-700/50"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-gold-600/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />

              <header className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gold-700/30 bg-gold-900/20 transition-[transform,background-color] duration-300 group-hover:scale-110 group-hover:bg-gold-900/40">
                  {feature.icon}
                </span>
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
              </header>
              <p className="text-base leading-relaxed text-muted-foreground">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-700/40 to-transparent" aria-hidden="true" />
    </section>
  );
}
