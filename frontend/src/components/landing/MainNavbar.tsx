import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sun, Moon, Monitor, Menu, X, ChevronDown } from "lucide-react";
import LogoCronotix from "@/assets/img/Logo-Cronotix";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { useTheme } from "@/context/ThemeContext";
import { useActiveSection } from "@/hooks/useActiveSection";
import { cn } from "@/lib/utils";

export interface MainNavbarProps {
  scrollToHero?: () => void;
  scrollToDemo?: () => void;
  scrollToHowItWorks?: () => void;
  scrollToPricing?: () => void;
  scrollToCta?: () => void;
  sectionIds?: string[];
}

const THEME_ICONS = {
  dark: <Moon className="h-4 w-4" aria-hidden="true" />,
  light: <Sun className="h-4 w-4" aria-hidden="true" />,
  system: <Monitor className="h-4 w-4" aria-hidden="true" />,
};

const THEME_LABELS: Record<string, string> = {
  dark: "Cambiar a modo claro",
  light: "Cambiar a modo oscuro",
  system: "Modo sistema — cambiar tema",
};

export default function MainNavbar({
  scrollToHero,
  scrollToDemo,
  scrollToHowItWorks,
  scrollToPricing,
  scrollToCta,
  sectionIds = ["hero", "demo", "casos-uso", "precios", "contacto"],
}: MainNavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeSection = useActiveSection(sectionIds);

  const ensureHomeThen = (cb?: () => void) => {
    if (!cb) return;
    setMobileOpen(false);
    if (location.pathname === "/") {
      cb();
    } else {
      navigate("/", { replace: false });
      setTimeout(cb, 120);
    }
  };

  const NAV_ITEMS: { label: string; sectionId: string; cb?: () => void; chevron?: boolean }[] = [
    { label: "Productos", sectionId: "demo", cb: scrollToDemo, chevron: true },
    { label: "Casos de uso", sectionId: "casos-uso", cb: scrollToHowItWorks },
    { label: "Precios", sectionId: "precios", cb: scrollToPricing },
    { label: "Recursos", sectionId: "contacto", cb: scrollToCta, chevron: true },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 right-0 left-0 z-50 transition-all duration-300",
        scrolled
          ? "border-navy-200/40 border-b bg-white/90 py-3 shadow-sm backdrop-blur-md dark:border-navy-700/60 dark:bg-navy-950/95"
          : "bg-transparent py-5",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2 dark:focus-visible:ring-gold-500"
          onClick={() => ensureHomeThen(scrollToHero)}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-slate-200/80 dark:bg-navy-800 dark:ring-navy-600">
            <LogoCronotix className="h-full w-full object-contain" variant={resolvedTheme === "dark" ? "white" : "color"} alt="" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight text-navy-900 dark:text-white">Cronotix</span>
        </button>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Navegación principal">
          {NAV_ITEMS.map(({ label, sectionId, cb, chevron }) => {
            const isActive = activeSection === sectionId;
            return (
              <button
                key={sectionId}
                type="button"
                onClick={() => ensureHomeThen(cb)}
                className={cn(
                  "flex items-center gap-1 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:rounded",
                  isActive ? "text-navy-800 dark:text-gold-400" : "text-navy-600/90 hover:text-navy-900 dark:text-slate-300 dark:hover:text-white",
                )}
              >
                {label}
                {chevron && <ChevronDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />}
              </button>
            );
          })}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={THEME_LABELS[theme] ?? THEME_LABELS[resolvedTheme]}
            className="rounded-lg p-2 text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-white"
          >
            {THEME_ICONS[theme]}
          </button>
          <TransitionLink
            to="/auth/login"
            vtType="drill"
            className="text-base font-medium text-navy-700 transition-colors hover:text-navy-900 dark:text-slate-300 dark:hover:text-white"
          >
            Iniciar sesión
          </TransitionLink>
          <TransitionLink
            to="/auth/login"
            vtType="drill"
            className="inline-flex items-center justify-center rounded-lg bg-navy-900 px-3 py-1.5 text-base font-medium text-white shadow-lg shadow-navy-900/20 transition-colors hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-2 dark:bg-gold-600 dark:shadow-gold-900/30 dark:hover:bg-gold-500 dark:focus-visible:ring-gold-400"
          >
            Empezar ahora
          </TransitionLink>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={THEME_LABELS[theme] ?? THEME_LABELS[resolvedTheme]}
            className="rounded-lg p-2 text-slate-600 dark:text-navy-300"
          >
            {THEME_ICONS[theme]}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-navy-200 dark:hover:bg-navy-800"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="absolute top-full right-0 left-0 flex flex-col space-y-4 border-slate-200 border-b bg-white p-4 shadow-xl md:hidden dark:border-navy-800 dark:bg-navy-950">
          {NAV_ITEMS.map(({ label, sectionId, cb }) => (
            <button
              key={sectionId}
              type="button"
              className="block w-full rounded-md px-4 py-2 text-left text-lg font-medium text-slate-700 hover:bg-slate-50 dark:text-navy-100 dark:hover:bg-navy-800"
              onClick={() => ensureHomeThen(cb)}
            >
              {label}
            </button>
          ))}
          <div className="flex flex-col gap-3 border-slate-100 border-t pt-4 dark:border-navy-800">
            <TransitionLink to="/auth/login" className="py-2 text-center font-medium text-slate-900 dark:text-white" onClick={() => setMobileOpen(false)}>
              Iniciar sesión
            </TransitionLink>
            <TransitionLink
              to="/auth/login"
              className="w-full rounded-lg bg-navy-900 py-2.5 text-center text-base font-medium text-white dark:bg-gold-600"
              onClick={() => setMobileOpen(false)}
            >
              Empezar ahora
            </TransitionLink>
          </div>
        </div>
      )}
    </header>
  );
}
