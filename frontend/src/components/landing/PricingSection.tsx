import { Check } from "lucide-react";
import { TransitionLink } from "@/components/ui/TransitionLink";

const plans = [
  {
    name: "Starter",
    price: "Gratis",
    period: "",
    description: "Para equipos que comienzan a explorar IA documental.",
    features: ["1\u00a0tenant", "500\u00a0créditos/mes", "OCR básico", "Historial 30\u00a0días"],
  },
  {
    name: "Pro",
    price: "$49",
    period: "/mes",
    description: "Para empresas con flujos de trabajo IA en producción.",
    highlight: true,
    features: [
      "10\u00a0tenants",
      "10\u00a0000\u00a0créditos/mes",
      "OCR + búsqueda semántica",
      "Historial ilimitado",
      "LLM Router (GPT-4o + Gemini)",
      "Soporte prioritario",
    ],
  },
  {
    name: "Enterprise",
    price: "A medida",
    period: "",
    description: "Infraestructura dedicada con SLA garantizado.",
    features: [
      "Tenants ilimitados",
      "Créditos ilimitados",
      "MCP personalizados",
      "Single-Tenant\u00a0/\u00a0VPC",
      "SLA\u00a099.9\u00a0%",
      "Account Manager",
    ],
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-24">
      <div className="container mx-auto px-6">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.6em] text-gold-600 dark:text-gold-500">
            Precios
          </p>
          <h2 className="font-display text-4xl font-bold text-navy-900 text-wrap-balance sm:text-5xl dark:text-white">
            Planes y precios
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-navy-600/75 dark:text-slate-400">
            Comienza gratis. Escala cuando lo necesites. Sin costos ocultos.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex flex-col rounded-3xl border p-8 transition-[border-color,box-shadow] duration-300 ${
                plan.highlight
                  ? "border-gold-500/60 bg-white shadow-[0_0_50px_rgba(149,124,61,0.15)] dark:border-gold-600/60 dark:bg-navy-900/80 dark:shadow-[0_0_50px_rgba(149,124,61,0.2)]"
                  : "border-navy-100 bg-white/80 hover:border-gold-400/50 hover:shadow-[0_0_30px_rgba(149,124,61,0.08)] dark:border-navy-700/60 dark:bg-navy-900/60 dark:hover:border-gold-700/40"
              }`}
            >
              {plan.highlight && (
                <>
                  <div className="absolute inset-x-8 top-0 h-[2px] rounded-full bg-gradient-to-r from-transparent via-gold-500 to-transparent" aria-hidden="true" />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-full border border-gold-500/50 bg-white px-4 py-1 text-sm font-semibold tracking-wide text-gold-600 shadow-[0_0_14px_rgba(149,124,61,0.2)] dark:border-gold-600/50 dark:bg-navy-900 dark:text-gold-400">
                    Más popular
                  </span>
                </>
              )}

              <div className="mb-6">
                <h3 className="mb-1 text-xl font-semibold text-navy-900 dark:text-white">{plan.name}</h3>
                <p className="text-base text-navy-500/80 dark:text-slate-400">{plan.description}</p>
              </div>

              <div className="mb-8 flex items-end gap-1">
                <span className="text-5xl font-extrabold text-navy-900 tabular-nums dark:text-white">{plan.price}</span>
                {plan.period && (
                  <span className="mb-1 text-lg text-navy-500/70 dark:text-slate-400">{plan.period}</span>
                )}
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-base text-navy-700/85 dark:text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-600 dark:text-gold-500" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>

              <TransitionLink
                to="/auth/login"
                vtType="drill"
                className={`w-full rounded-full px-4 py-3 text-center text-base font-semibold transition-[background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${
                  plan.highlight
                    ? "bg-gold-600 text-white hover:bg-gold-500 hover:shadow-[0_0_20px_rgba(149,124,61,0.4)]"
                    : "border border-gold-700/40 bg-transparent text-gold-600 dark:text-gold-400 hover:bg-gold-900/20 hover:border-gold-600/60"
                }`}
              >
                {plan.name === "Enterprise" ? "Hablar con ventas" : "Comenzar"}
              </TransitionLink>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
