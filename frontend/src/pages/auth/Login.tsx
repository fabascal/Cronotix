import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ArrowRight, Brain } from "lucide-react";

interface LocationState {
  from?: { pathname: string };
}

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const from = (location.state as LocationState)?.from?.pathname ?? "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast("Bienvenido a Cronotix", "success");
      navigate(from, { replace: true });
    } catch {
      toast("Credenciales inválidas. Intenta de nuevo.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 dark:bg-gold-600 shadow-lg md:h-16 md:w-16">
          <Brain className="h-7 w-7 text-white md:h-8 md:w-8" aria-hidden="true" />
        </div>
        <h1 className="font-display text-3xl font-bold text-slate-900 text-pretty md:text-4xl lg:text-5xl dark:text-white">
          Bienvenido de vuelta
        </h1>
        <p className="mt-1.5 text-base text-slate-600 md:text-lg dark:text-navy-300">
          Ingresa tus credenciales para continuar
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-slate-700 dark:text-navy-200">
            Correo electrónico
          </Label>
          <Input
            id="email"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            autoComplete="email"
            spellCheck={false}
            className="rounded-xl border-slate-200 bg-slate-50 py-2.5 text-slate-900 placeholder:text-slate-400 focus-visible:border-navy-600 focus-visible:ring-navy-600 dark:border-white/15 dark:bg-navy-900/60 dark:text-white dark:placeholder:text-navy-500 dark:focus-visible:ring-gold-600"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-slate-700 dark:text-navy-200">
            Contraseña
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="rounded-xl border-slate-200 bg-slate-50 py-2.5 pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-navy-600 focus-visible:ring-navy-600 dark:border-white/15 dark:bg-navy-900/60 dark:text-white dark:focus-visible:ring-gold-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:rounded dark:text-navy-400 dark:hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <span className="text-base font-medium text-gold-700 dark:text-gold-400">
            ¿Olvidaste tu contraseña?
          </span>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 py-3 text-lg font-medium text-white shadow-lg shadow-navy-900/20 transition-colors hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-2 disabled:opacity-60 dark:bg-gold-600 dark:shadow-gold-900/30 dark:hover:bg-gold-500 dark:focus-visible:ring-gold-400"
        >
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
          ) : null}
          {isLoading ? "Ingresando…" : "Iniciar sesión"}
          {!isLoading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-slate-200 border-t dark:border-navy-700" />
        </div>
        <div className="relative flex justify-center text-base">
          <span className="bg-white px-4 text-slate-500 dark:bg-navy-800/60 dark:text-navy-400">¿Nuevo en Cronotix?</span>
        </div>
      </div>

      <TransitionLink
        to="/"
        vtType="back"
        className="flex w-full items-center justify-center rounded-xl border-2 border-slate-200 px-6 py-2.5 text-lg font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-navy-600 dark:text-navy-100 dark:hover:bg-navy-800"
      >
        Volver al inicio
      </TransitionLink>

      <p className="mt-4 text-center text-base text-slate-600 dark:text-navy-400">
        Al iniciar sesión, aceptas nuestros{" "}
        <a href="#" className="font-medium text-navy-700 hover:underline dark:text-gold-400">
          Términos
        </a>{" "}
        y{" "}
        <a href="#" className="font-medium text-navy-700 hover:underline dark:text-gold-400">
          Privacidad
        </a>
      </p>
    </div>
  );
}
