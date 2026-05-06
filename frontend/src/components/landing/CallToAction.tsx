import { ArrowRight } from "lucide-react";
import { TransitionLink } from "@/components/ui/TransitionLink";

export default function CallToAction() {
  return (
    <section className="bg-navy-50/70 py-24 dark:bg-transparent">
      <div className="container mx-auto px-6">
        <div className="relative overflow-hidden rounded-3xl border border-navy-200/60 bg-white px-8 py-16 text-center shadow-xl shadow-navy-900/8 dark:border-gold-700/40 dark:bg-navy-900/70 dark:shadow-[0_0_60px_rgba(149,124,61,0.12)]">
          {/* Gold accent lines */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-700/40 to-transparent" aria-hidden="true" />

          {/* Ambient glow */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-600/8 blur-[120px]" aria-hidden="true" />

          <div className="relative z-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.6em] text-gold-600 dark:text-gold-400">
              Comienza hoy
            </p>
            <h2 className="font-display text-4xl font-bold text-navy-900 text-wrap-balance lg:text-5xl dark:text-white">
              ¿Listo para transformar tus documentos?
            </h2>
            <p className="mx-auto mt-4 max-w-prose text-navy-600/80 dark:text-slate-400">
              Regístrate en segundos y comienza a procesar documentos con agentes IA especializados.
              Sin tarjeta de crédito requerida.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <TransitionLink
                to="/auth/login"
                vtType="drill"
                className="inline-flex items-center gap-2 rounded-full bg-gold-600 px-10 py-3.5 text-lg font-semibold text-white transition-[background-color,box-shadow] hover:bg-gold-500 hover:shadow-[0_0_30px_rgba(149,124,61,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
              >
                Crear cuenta gratuita
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </TransitionLink>
              <a
                href="mailto:sales@cronotix.io"
                className="rounded-full border border-navy-200/70 bg-transparent px-8 py-3.5 text-lg font-medium text-navy-700 transition-colors hover:border-gold-500/60 hover:text-gold-600 dark:border-navy-600/50 dark:text-slate-300 dark:hover:border-gold-500/50 dark:hover:text-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500"
              >
                Hablar con ventas
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
