import { Play, ArrowRight } from "lucide-react";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { useTypingPhrases } from "@/hooks/useTypingPhrases";

export default function HeroSection() {
  const typing = useTypingPhrases();

  return (
    <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
      {/* Blobs — more vivid in both modes */}
      <div
        className="pointer-events-none absolute -top-10 -left-10 h-96 w-96 animate-blob rounded-full bg-navy-200/60 mix-blend-multiply blur-3xl filter opacity-50 dark:bg-navy-700/50 dark:mix-blend-normal dark:opacity-40"
        aria-hidden="true"
      />
      <div
        className="animation-delay-2000 pointer-events-none absolute top-10 -right-10 h-80 w-80 animate-blob rounded-full bg-gold-200/70 mix-blend-multiply blur-3xl filter opacity-45 dark:bg-gold-800/30 dark:mix-blend-normal dark:opacity-35"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 animate-blob rounded-full bg-navy-100/50 mix-blend-multiply blur-2xl filter opacity-30 dark:bg-navy-600/20 dark:mix-blend-normal"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="mx-auto w-full text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-navy-200/60 bg-navy-50/80 px-3 py-1 text-sm font-semibold tracking-wide text-navy-700 uppercase dark:border-navy-600/50 dark:bg-navy-800/60 dark:text-gold-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-gold-500 dark:bg-gold-400" />
            Nuevo: pipeline de documentos mejorado
          </div>

          <h1 className="mb-6 px-4 font-display text-6xl font-bold leading-[1.1] tracking-tight text-navy-950 md:px-0 md:text-7xl lg:text-8xl dark:text-white">
            Descubre cómo podrías
            <br />
            {/* <span className="bg-gradient-to-r from-navy-700 via-navy-600 to-gold-600 bg-clip-text text-transparent dark:from-gold-300 dark:via-gold-400 dark:to-gold-500">
              {typing}
            </span> */}
            <span className="bg-gold-600 bg-clip-text text-transparent dark:from-gold-300 dark:via-gold-400 dark:to-gold-500">
              {typing}
            </span>
            <span className="ml-1 inline-block h-10 w-0.5 animate-pulse bg-navy-700 align-middle md:h-14 dark:bg-gold-400" />
            <br />
            con IA empresarial.
          </h1>

          <p className="mx-auto mt-6 max-w-full px-4 text-xl leading-relaxed text-navy-700/80 md:max-w-4xl md:px-0 md:text-2xl lg:max-w-5xl lg:text-3xl dark:text-slate-300">
            Entrena asistentes de inteligencia artificial con tus propios datos de negocio. Seguro, escalable y listo para integrarse.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <TransitionLink
              to="/auth/login"
              vtType="drill"
              className="group inline-flex items-center justify-center rounded-lg bg-navy-800 px-8 py-3.5 text-lg font-medium text-white shadow-lg shadow-navy-900/25 transition-all hover:bg-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-2 dark:bg-gold-600 dark:shadow-gold-900/30 dark:hover:bg-gold-500 dark:focus-visible:ring-gold-400"
            >
              Comenzar gratis
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </TransitionLink>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-navy-200/70 px-8 py-3.5 text-lg font-medium text-navy-700 transition-colors hover:bg-navy-50 hover:border-navy-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 dark:border-navy-600/50 dark:text-slate-300 dark:hover:bg-navy-800/50 dark:hover:text-white dark:hover:border-navy-500"
            >
              <Play className="h-[18px] w-[18px] fill-current" aria-hidden="true" />
              Ver demo (2 min)
            </button>
          </div>

          <p className="mt-8 text-base text-navy-500/70 dark:text-slate-500">
            
          </p>
        </div>
      </div>
    </section>
  );
}
