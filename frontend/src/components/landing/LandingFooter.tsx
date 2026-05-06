import { MessageSquare } from "lucide-react";
import LogoCronotix from "@/assets/img/Logo-Cronotix";
import { TransitionLink } from "@/components/ui/TransitionLink";

export default function LandingFooter() {
  return (
    <footer className="border-navy-100 border-t bg-white pt-16 pb-8 dark:border-navy-800/60 dark:bg-navy-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-2">
            <TransitionLink to="/" vtType="back" className="mb-4 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500">
              <LogoCronotix className="h-6 w-auto" variant="color" alt="Cronotix" />
              <span className="font-display text-xl font-bold text-navy-900 dark:text-white">Cronotix</span>
            </TransitionLink>
            <p className="mb-6 max-w-xs text-base text-navy-500/80 dark:text-slate-400">
              Plataforma de automatización empresarial con inteligencia artificial generativa.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-navy-400 transition-colors hover:text-navy-700 dark:text-slate-500 dark:hover:text-gold-400" aria-label="Redes sociales">
                <MessageSquare className="h-5 w-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="mb-4 font-semibold text-navy-900 dark:text-white">Producto</h4>
            <ul className="space-y-2 text-base text-navy-500/90 dark:text-slate-400">
              <li><a href="#demo" className="transition-colors hover:text-gold-600 dark:hover:text-gold-400">Demo</a></li>
              <li><a href="#casos-uso" className="transition-colors hover:text-gold-600 dark:hover:text-gold-400">Casos de uso</a></li>
              <li><a href="#precios" className="transition-colors hover:text-gold-600 dark:hover:text-gold-400">Precios</a></li>
              <li><a href="#contacto" className="transition-colors hover:text-gold-600 dark:hover:text-gold-400">Contacto</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-semibold text-navy-900 dark:text-white">Recursos</h4>
            <ul className="space-y-2 text-base text-navy-500/90 dark:text-slate-400">
              <li><a href="#" className="transition-colors hover:text-gold-600 dark:hover:text-gold-400">Documentación</a></li>
              <li><a href="#" className="transition-colors hover:text-gold-600 dark:hover:text-gold-400">API</a></li>
              <li><a href="#" className="transition-colors hover:text-gold-600 dark:hover:text-gold-400">Blog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-semibold text-navy-900 dark:text-white">Compañía</h4>
            <ul className="space-y-2 text-base text-navy-500/90 dark:text-slate-400">
              <li><a href="#" className="transition-colors hover:text-gold-600 dark:hover:text-gold-400">Acerca de</a></li>
              <li><a href="#" className="transition-colors hover:text-gold-600 dark:hover:text-gold-400">Legal</a></li>
            </ul>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-navy-100 border-t pt-8 md:flex-row dark:border-navy-800/60">
          <p className="text-base text-navy-400/80 dark:text-slate-500">
            © {new Date().getFullYear()} Cronotix. Todos los derechos reservados.
          </p>
          <div className="flex gap-6 text-base text-navy-400/80 dark:text-slate-500">
            <a href="#" className="transition-colors hover:text-navy-700 dark:hover:text-white">Privacidad</a>
            <a href="#" className="transition-colors hover:text-navy-700 dark:hover:text-white">Términos</a>
            <a href="#" className="transition-colors hover:text-navy-700 dark:hover:text-white">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
