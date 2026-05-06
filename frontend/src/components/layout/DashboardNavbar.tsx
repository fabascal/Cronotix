import { Bell, Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function DashboardNavbar() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const initials =
    user?.name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase() ?? "CX";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-foreground">Portal de Agentes IA</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          aria-label={resolvedTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {resolvedTheme === "dark"
            ? <Sun className="h-5 w-5" aria-hidden="true" />
            : <Moon className="h-5 w-5" aria-hidden="true" />
          }
        </button>

        <button
          aria-label="Notificaciones"
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-border ml-1">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {user && (
            <div className="hidden sm:block">
              <p className="text-base font-medium text-foreground leading-tight">{user.name}</p>
              <p className="text-sm text-muted-foreground tabular-nums">
                {user.credits.toLocaleString()} créditos
              </p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
