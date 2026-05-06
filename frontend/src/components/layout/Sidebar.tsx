import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Brain,
  Sparkles,
  Plug,
  BookUser,
  CreditCard,
  Settings,
  Cpu,
  Users,
  ShieldCheck,
  KeyRound,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import LogoCronotix from "@/assets/img/Logo-Cronotix";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  label: string;
  slug?: string;
  end?: boolean;
}

// Items that are always visible (no permission check)
const MAIN_ITEMS: NavItem[] = [
  { to: "/dashboard",           icon: LayoutDashboard, label: "Dashboard",        slug: "dashboard", end: true },
  { to: "/dashboard/documents", icon: FileText,         label: "Documentos",      slug: "documents" },
  { to: "/dashboard/agents",    icon: Brain,            label: "Agentes",          slug: "agents" },
  { to: "/dashboard/skills",   icon: Sparkles,         label: "Skills",           slug: "skills" },
  { to: "/dashboard/mcp",       icon: Plug,             label: "Integraciones MCP",slug: "mcp" },
  { to: "/dashboard/contacts",  icon: BookUser,         label: "Contactos",        slug: "contacts" },
  { to: "/dashboard/billing",   icon: CreditCard,       label: "Facturación",      slug: "billing" },
];

// Settings sub-items
const SETTINGS_ITEMS: NavItem[] = [
  { to: "/dashboard/settings/models",     icon: Cpu,        label: "Modelos IA",   slug: "settings.models" },
  { to: "/dashboard/settings/api-access", icon: KeyRound,   label: "Acceso API",   slug: "settings.api-access" },
  { to: "/dashboard/settings/users",      icon: Users,      label: "Usuarios",     slug: "settings.users" },
  { to: "/dashboard/settings/roles",      icon: ShieldCheck,label: "Roles",        slug: "settings.roles" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, can, logout } = useAuth();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();

  const logoVariant = resolvedTheme === "dark" ? "white" : "color";

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  const isAllowed = (slug?: string) => {
    if (!slug) return true;
    return can(slug);
  };

  const visibleMain = MAIN_ITEMS.filter((item) => isAllowed(item.slug));
  const visibleSettings = SETTINGS_ITEMS.filter((item) => isAllowed(item.slug));
  const hasSettings = visibleSettings.length > 0;

  const renderNavItem = (item: NavItem) => (
    <li key={item.to}>
      <NavLink
        to={item.to}
        end={item.end}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isActive
              ? "bg-primary/10 text-primary font-semibold"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )
        }
      >
        <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    </li>
  );

  return (
    <aside
      className={cn(
        "relative z-30 flex h-screen flex-col border-r border-border bg-card transition-[width] duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* ── Logo + marca ── */}
      <div
        className={cn(
          "flex h-16 min-w-0 items-center border-b border-border px-4",
          collapsed ? "justify-center" : "gap-3"
        )}
      >
        {collapsed ? (
          <LogoCronotix
            className="h-7 w-7 shrink-0"
            variant={logoVariant}
            alt="Cronotix"
          />
        ) : (
          <>
            <LogoCronotix
              className="h-8 w-auto shrink-0"
              variant={logoVariant}
              alt=""
            />
            <span className="font-display min-w-0 truncate text-xl font-semibold tracking-tight text-foreground">
              Cronotix
            </span>
          </>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-4" aria-label="Navegación principal">
        <ul className="flex flex-col gap-1 px-2">
          {visibleMain.map(renderNavItem)}
        </ul>

        {/* Settings group */}
        {hasSettings && (
          <div className="mt-4">
            {!collapsed && (
              <p className="mb-1 px-5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Configuración
              </p>
            )}
            {collapsed && (
              <div className="mx-2 mb-1 h-px bg-border" aria-hidden="true" />
            )}
            <ul className="flex flex-col gap-1 px-2">
              {visibleSettings.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        collapsed ? "px-3" : "pl-5 pr-3",
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Fallback: generic settings link if no specific items visible */}
        {!hasSettings && (
          <ul className="mt-1 flex flex-col gap-1 px-2">
            <li>
              <NavLink
                to="/dashboard/settings"
                title={collapsed ? "Configuración" : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )
                }
              >
                <Settings className="h-5 w-5 shrink-0" aria-hidden="true" />
                {!collapsed && <span>Configuración</span>}
              </NavLink>
            </li>
          </ul>
        )}
      </nav>

      {/* ── User area ── */}
      <div className="border-t border-border p-3">
        {!collapsed && user && (
          <div className="mb-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <p className="min-w-0 truncate text-sm font-semibold text-foreground">{user.name}</p>
            <p className="min-w-0 truncate text-sm text-muted-foreground">{user.email}</p>
            <p className="mt-1 text-sm font-semibold text-primary tabular-nums">
              {user.credits.toLocaleString()} créditos
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          aria-label={collapsed ? "Cerrar sesión" : undefined}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-base text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>

      {/* ── Collapse toggle ── */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
        className="absolute -right-3 top-20 z-30 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {collapsed
          ? <ChevronRight className="h-3 w-3" aria-hidden="true" />
          : <ChevronLeft className="h-3 w-3" aria-hidden="true" />
        }
      </button>
    </aside>
  );
}
