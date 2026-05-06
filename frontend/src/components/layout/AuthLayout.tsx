import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LogoCronotix from "@/assets/img/Logo-Cronotix";
import { TransitionLink } from "@/components/ui/TransitionLink";

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 dark:bg-navy-950">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-navy-700 border-t-transparent dark:border-gold-600"
          aria-label="Cargando…"
        />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-12 dark:bg-navy-950">
      <div className="pointer-events-none absolute inset-0 dark:hidden" aria-hidden="true">
        <div className="absolute -top-32 left-1/4 h-80 w-80 rounded-full bg-navy-100/90 blur-[100px]" />
        <div className="absolute right-0 bottom-0 h-72 w-72 rounded-full bg-gold-100/80 blur-[90px]" />
      </div>
      <div className="pointer-events-none absolute inset-0 hidden dark:block" aria-hidden="true">
        <div className="absolute -top-40 -left-32 h-[500px] w-[500px] rounded-full bg-gold-600/8 blur-[160px]" />
        <div className="absolute right-0 bottom-0 h-[400px] w-[400px] rounded-full bg-navy-500/20 blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-md md:max-w-lg">
        <div className="mb-8 flex flex-col items-center gap-3">
          <TransitionLink
            to="/"
            vtType="back"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-2 focus-visible:rounded-lg dark:focus-visible:ring-gold-500"
            aria-label="Volver a inicio"
          >
            <LogoCronotix
              className="h-14 w-auto transition-opacity hover:opacity-80 md:h-16"
              variant="color"
              alt="Cronotix — Volver a inicio"
              enableTransition
            />
          </TransitionLink>
          <span className="text-base font-medium tracking-wide text-slate-600 dark:text-navy-300">
            Portal de Agentes IA
          </span>
        </div>

        <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8 dark:border-white/10 dark:bg-navy-800/60 dark:shadow-[0_0_50px_rgba(0,35,73,0.6)]">
          <div
            className="pointer-events-none absolute inset-x-8 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-gold-500/50 to-transparent dark:via-gold-600/50"
            aria-hidden="true"
          />
          <Outlet />
        </div>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-navy-400">
          © {new Date().getFullYear()} Cronotix. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
