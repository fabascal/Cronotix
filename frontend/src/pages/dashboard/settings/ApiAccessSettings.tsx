import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  Copy,
  Check,
  KeyRound,
  AlertTriangle,
  FileText,
  MessageSquare,
  Shield,
  Upload,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient, API_BASE_URL } from "@/lib/apiClient";
import { useToast } from "@/context/ToastContext";

interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

type DocTab = "auth" | "upload" | "list" | "chat";

const DOC_TABS: { id: DocTab; label: string; Icon: React.ElementType }[] = [
  { id: "auth", label: "Autenticacion", Icon: Shield },
  { id: "upload", label: "Subir documento", Icon: Upload },
  { id: "list", label: "Listar documentos", Icon: List },
  { id: "chat", label: "Chat con agente", Icon: MessageSquare },
];

const SCOPES = [
  { value: "documents", label: "Documentos", Icon: FileText },
  { value: "chat", label: "Chat", Icon: MessageSquare },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
      title="Copiar"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  return (
    <div className="relative rounded-xl border border-border bg-slate-950 dark:bg-slate-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-[11px] font-mono text-slate-400">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="overflow-x-auto p-4 text-base leading-relaxed">
        <code className="text-slate-200 font-mono text-[13px] whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

export default function ApiAccessSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [docTab, setDocTab] = useState<DocTab>("auth");

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>(["documents", "chat"]);
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const baseUrl = `${API_BASE_URL}/api`;

  const loadKeys = useCallback(async () => {
    try {
      const { data } = await apiClient.get<ApiKeyRow[]>("/api/v1/settings/api-keys");
      setKeys(data);
    } catch {
      toast("No se pudieron cargar las API keys", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  async function createKey() {
    if (!newName.trim()) {
      toast("El nombre es obligatorio", "error");
      return;
    }
    setCreating(true);
    try {
      const { data } = await apiClient.post<{ key: string } & ApiKeyRow>(
        "/api/v1/settings/api-keys",
        { name: newName.trim(), scopes: newScopes },
      );
      setRevealedKey(data.key);
      setNewName("");
      setNewScopes(["documents", "chat"]);
      setShowCreate(false);
      await loadKeys();
      toast("API Key creada exitosamente", "success");
    } catch {
      toast("Error al crear la API Key", "error");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    setRevokingId(id);
    try {
      await apiClient.delete(`/api/v1/settings/api-keys/${id}`);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast("API Key revocada", "success");
    } catch {
      toast("Error al revocar la API Key", "error");
    } finally {
      setRevokingId(null);
    }
  }

  function toggleScope(scope: string) {
    setNewScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  const inputCls =
    "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      <header>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Acceso API
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Genera y administra API Keys para que sistemas externos (Portal B) se
          conecten de forma segura a Cronotix.
        </p>
      </header>

      {/* ── Revealed key banner ── */}
      {revealedKey && (
        <div className="rounded-xl border-2 border-amber-500/60 bg-amber-50 dark:bg-amber-950/30 px-5 py-4 space-y-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-base font-semibold text-amber-800 dark:text-amber-200">
                Guarda esta clave ahora — no se mostrara de nuevo
              </p>
              <div className="flex items-center gap-2">
                <code className="break-all rounded-lg bg-amber-100 dark:bg-amber-900/50 px-3 py-2 text-sm font-mono text-amber-900 dark:text-amber-100 select-all">
                  {revealedKey}
                </code>
                <CopyButton text={revealedKey} />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setRevealedKey(null)}
              className="text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
            >
              Entendido, ya la copie
            </button>
          </div>
        </div>
      )}

      {/* ── Section 1: API Keys ── */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:shadow-none space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Mis API Keys
            </h2>
            <p className="text-base text-muted-foreground">
              Cada key permite al Portal B autenticarse usando el header{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-sm">X-API-Key</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-base font-semibold text-primary-foreground",
              "hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <Plus className="h-4 w-4" />
            Nueva Key
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-4">
            <div>
              <label htmlFor="key-name" className="mb-1.5 block text-base font-medium">
                Nombre (identificador)
              </label>
              <input
                id="key-name"
                type="text"
                className={inputCls}
                placeholder="ej: Portal B - Produccion"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <span className="mb-2 block text-base font-medium">Permisos (scopes)</span>
              <div className="flex flex-wrap gap-2">
                {SCOPES.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleScope(value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-base font-medium transition-colors",
                      newScopes.includes(value)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={creating}
                onClick={createKey}
                className={cn(
                  "rounded-xl bg-primary px-4 py-2.5 text-base font-semibold text-primary-foreground",
                  "hover:opacity-90 disabled:opacity-50",
                )}
              >
                {creating ? "Generando…" : "Generar Key"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-base font-semibold hover:bg-muted"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Keys table */}
        {keys.length === 0 ? (
          <p className="py-6 text-center text-base text-muted-foreground">
            No hay API Keys generadas. Crea una para comenzar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead>
                <tr className="border-b border-border text-left text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Key</th>
                  <th className="px-3 py-2">Scopes</th>
                  <th className="px-3 py-2">Creada</th>
                  <th className="px-3 py-2">Ultimo uso</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {keys.map((k) => (
                  <tr key={k.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-3 font-medium text-foreground">{k.name}</td>
                    <td className="px-3 py-3">
                      <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                        {k.prefix}...
                      </code>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map((s) => (
                          <span
                            key={s}
                            className="inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(k.createdAt).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">
                      {k.lastUsedAt
                        ? new Date(k.lastUsedAt).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "Nunca"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        disabled={revokingId === k.id}
                        onClick={() => revokeKey(k.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/30 px-2.5 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      >
                        {revokingId === k.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        Revocar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Section 2: API Documentation ── */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:shadow-none space-y-5">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Documentacion de la API
          </h2>
          <p className="text-base text-muted-foreground">
            Ejemplos para integrar el Portal B con Cronotix.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="block text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Base URL
            </span>
            <code className="block text-base font-mono text-foreground break-all">{baseUrl}</code>
          </div>
          <CopyButton text={baseUrl} />
        </div>

        {/* Doc tabs */}
        <nav className="flex flex-wrap gap-1 border-b border-border pb-px" aria-label="Secciones de documentacion">
          {DOC_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDocTab(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-base font-medium transition-colors",
                docTab === id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="pt-2">
          {docTab === "auth" && (
            <div className="space-y-4">
              <p className="text-base text-muted-foreground">
                Todas las peticiones deben incluir el header{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-sm font-mono">X-API-Key</code>{" "}
                con la clave generada arriba.
              </p>
              <CodeBlock
                code={`curl -H "X-API-Key: tk_tu_clave_aqui" \\
  ${baseUrl}/v1/dashboard/documents`}
              />
              <p className="text-sm text-muted-foreground">
                Si la key es invalida o esta revocada, la API responde{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-sm">401 Unauthorized</code>.
              </p>
            </div>
          )}

          {docTab === "upload" && (
            <div className="space-y-4">
              <div>
                <span className="inline-block rounded-md bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-sm font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                  POST
                </span>
                <code className="ml-2 text-base font-mono text-foreground">/v1/dashboard/documents</code>
              </div>
              <p className="text-base text-muted-foreground">
                Sube un PDF. Se procesa con Document AI, se generan embeddings y se almacena en pgvector.
              </p>
              <CodeBlock
                language="bash"
                code={`curl -X POST "${baseUrl}/v1/dashboard/documents" \\
  -H "X-API-Key: tk_tu_clave_aqui" \\
  -F "file=@documento.pdf" \\
  -F "fileName=escritura_1965.pdf" \\
  -F "description=Escritura publica 1965"`}
              />
              <CodeBlock
                language="javascript"
                code={`const form = new FormData();
form.append("file", pdfFile);
form.append("fileName", "escritura_1965.pdf");
form.append("description", "Escritura publica 1965");

const res = await fetch("${baseUrl}/v1/dashboard/documents", {
  method: "POST",
  headers: { "X-API-Key": apiKey },
  body: form,
});
const data = await res.json();
console.log(data); // { status: "accepted", documentId: "..." }`}
              />
            </div>
          )}

          {docTab === "list" && (
            <div className="space-y-4">
              <div>
                <span className="inline-block rounded-md bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-sm font-bold text-blue-700 dark:text-blue-300 font-mono">
                  GET
                </span>
                <code className="ml-2 text-base font-mono text-foreground">/v1/dashboard/documents</code>
              </div>
              <p className="text-base text-muted-foreground">
                Retorna la lista de documentos del tenant asociado a la API Key.
              </p>
              <CodeBlock
                code={`curl -H "X-API-Key: tk_tu_clave_aqui" \\
  ${baseUrl}/v1/dashboard/documents`}
              />
              <CodeBlock
                language="javascript"
                code={`const res = await fetch("${baseUrl}/v1/dashboard/documents", {
  headers: { "X-API-Key": apiKey },
});
const documents = await res.json();
// [{ id, fileName, status, createdAt, ... }]`}
              />
            </div>
          )}

          {docTab === "chat" && (
            <div className="space-y-4">
              <div>
                <span className="inline-block rounded-md bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-sm font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                  POST
                </span>
                <code className="ml-2 text-base font-mono text-foreground">/v1/agents/:agentId/chat</code>
              </div>
              <p className="text-base text-muted-foreground">
                Envia un mensaje a un agente. El agente usa RAG para consultar los documentos del tenant.
              </p>
              <CodeBlock
                code={`curl -X POST "${baseUrl}/v1/agents/AGENT_ID/chat" \\
  -H "X-API-Key: tk_tu_clave_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "En que notaria se firmo el acta?"}'`}
              />
              <CodeBlock
                language="javascript"
                code={`const res = await fetch("${baseUrl}/v1/agents/\${agentId}/chat", {
  method: "POST",
  headers: {
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: "En que notaria se firmo el acta?",
  }),
});
const data = await res.json();
console.log(data.reply);`}
              />
              <div className="rounded-xl border border-border bg-muted/20 p-3">
                <p className="text-sm text-muted-foreground">
                  <strong>Streaming (SSE):</strong> Para respuestas en tiempo real, usa{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-sm font-mono">
                    POST /v1/agents/:agentId/chat/stream
                  </code>{" "}
                  con el mismo body. La respuesta se envia como Server-Sent Events.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
