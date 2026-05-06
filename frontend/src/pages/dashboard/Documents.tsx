import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/context/ToastContext";

interface DocumentApi {
  id: string;
  status: string;
  pageCount: number;
  documentType: string;
  fileName: string | null;
  description: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
  pending: {
    label: "Pendiente",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    Icon: Clock,
  },
  ocr_processing: {
    label: "OCR",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    Icon: RefreshCw,
  },
  ai_processing: {
    label: "IA",
    cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    Icon: RefreshCw,
  },
  embedding: {
    label: "Vectorizando",
    cls: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    Icon: RefreshCw,
  },
  done: {
    label: "Listo",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
  error: {
    label: "Error",
    cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    Icon: AlertCircle,
  },
};

const TYPE_LABELS: Record<string, string> = {
  legal: "Legal",
  medical: "Médico",
  financial: "Financiero",
  other: "Otro",
};

export default function DocumentsPage() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<DocumentApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({ fileName: "", description: "", documentType: "other" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      const { data } = await apiClient.get<DocumentApi[]>("/api/v1/dashboard/documents");
      setDocuments(data);
    } catch {
      toast("Error al cargar documentos", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  // Poll for processing documents
  useEffect(() => {
    const processing = documents.some((d) =>
      ["pending", "ocr_processing", "ai_processing", "embedding"].includes(d.status),
    );
    if (!processing) return;
    const timer = setInterval(fetchDocuments, 5000);
    return () => clearInterval(timer);
  }, [documents, fetchDocuments]);

  const handleFileSelect = (file: File) => {
    if (file.type !== "application/pdf") {
      toast("Solo se permiten archivos PDF", "error");
      return;
    }
    setSelectedFile(file);
    setUploadForm((prev) => ({
      ...prev,
      fileName: prev.fileName || file.name,
    }));
    setUploadModalOpen(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.fileName.trim()) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("fileName", uploadForm.fileName.trim());
    formData.append("description", uploadForm.description.trim());
    formData.append("documentType", uploadForm.documentType);

    try {
      await apiClient.post("/api/v1/dashboard/documents", formData, {
        headers: { "Content-Type": undefined },
      });
      toast("Documento subido y en procesamiento", "success");
      setUploadModalOpen(false);
      setSelectedFile(null);
      setUploadForm({ fileName: "", description: "", documentType: "other" });
      fetchDocuments();
    } catch {
      toast("Error al subir documento", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await apiClient.delete(`/api/v1/dashboard/documents/${docId}`);
      toast("Documento eliminado", "success");
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch {
      toast("Error al eliminar documento", "error");
    }
  };

  const filtered = documents.filter((d) => {
    const term = search.toLowerCase();
    return (
      !term ||
      d.fileName?.toLowerCase().includes(term) ||
      d.description?.toLowerCase().includes(term) ||
      d.documentType.toLowerCase().includes(term)
    );
  });

  const inputCls =
    "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Documentos</h1>
          <p className="mt-1 text-base text-muted-foreground">
            {documents.length} documento{documents.length !== 1 ? "s" : ""} en tu espacio de trabajo
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setSelectedFile(null); setUploadForm({ fileName: "", description: "", documentType: "other" }); setUploadModalOpen(true); }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Subir documento
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre, descripción o tipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(inputCls, "pl-10")}
        />
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/20 hover:border-primary/40"
        )}
      >
        <Upload className={cn("mx-auto h-10 w-10", dragOver ? "text-primary" : "text-muted-foreground/40")} />
        <p className="mt-3 text-base text-muted-foreground">
          Arrastra un archivo PDF aquí o{" "}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="font-medium text-primary hover:underline"
          >
            selecciona uno
          </button>
        </p>
        <p className="mt-1 text-sm text-muted-foreground/60">PDF, máximo 25 MB</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Documents list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-base text-muted-foreground">
            {documents.length === 0
              ? "Aún no hay documentos. Sube tu primer PDF."
              : "No se encontraron documentos con ese filtro."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const st = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG.pending;
            const StIcon = st.Icon;
            const isProcessing = ["pending", "ocr_processing", "ai_processing", "embedding"].includes(doc.status);
            return (
              <div
                key={doc.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="truncate text-base font-semibold text-foreground">
                      {doc.fileName ?? "Sin nombre"}
                    </p>
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", st.cls)}>
                      <StIcon className={cn("h-3 w-3", isProcessing && "animate-spin")} />
                      {st.label}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {TYPE_LABELS[doc.documentType] ?? doc.documentType}
                    </span>
                  </div>
                  {doc.description && (
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{doc.description}</p>
                  )}
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground/70">
                    {doc.pageCount > 0 && <span>{doc.pageCount} pág.</span>}
                    <span>{new Date(doc.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    {doc.errorMessage && (
                      <span className="text-red-500 truncate max-w-[200px]" title={doc.errorMessage}>
                        {doc.errorMessage}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                  title="Eliminar documento"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground">Subir documento</h3>
              <button type="button" onClick={() => setUploadModalOpen(false)} className="rounded-lg p-1.5 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!selectedFile ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelect(file);
                }}
                className="rounded-xl border-2 border-dashed border-border p-8 text-center"
              >
                <Upload className="mx-auto h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-base text-muted-foreground">
                  Arrastra un PDF o{" "}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-medium text-primary hover:underline"
                  >
                    selecciona
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="truncate text-base font-medium">{selectedFile.name}</span>
                  <span className="ml-auto shrink-0 text-sm text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-muted-foreground">Nombre *</label>
                  <input
                    value={uploadForm.fileName}
                    onChange={(e) => setUploadForm({ ...uploadForm, fileName: e.target.value })}
                    className={inputCls}
                    placeholder="escritura_2026.pdf"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-muted-foreground">Descripción</label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    rows={2}
                    className={cn(inputCls, "resize-none")}
                    placeholder="Escritura pública de compraventa..."
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-muted-foreground">Tipo de documento</label>
                  <select
                    value={uploadForm.documentType}
                    onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}
                    className={inputCls}
                  >
                    <option value="other">Otro</option>
                    <option value="legal">Legal</option>
                    <option value="medical">Médico</option>
                    <option value="financial">Financiero</option>
                  </select>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-base font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !uploadForm.fileName.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {uploading ? "Subiendo..." : "Subir documento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
