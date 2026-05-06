import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────
   DrillReveal
   ─────────────────────────────────────────────────────────────────
   Drill transition: navigating *deeper* in hierarchy.
   The summary/list view stays; the detail view drills in on top
   with a scale + fade animation that suggests moving forward.

   Use for:
     • List item  → detail panel
     • Card       → expanded view
     • Summary    → full document
     • Feed post  → post detail

   Variants:
     "panel"   Side sheet from the right (default)
     "modal"   Centered modal with backdrop
     "inline"  Expands in place within the layout (no portal)
   ───────────────────────────────────────────────────────────────── */

interface DrillRevealProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  variant?: "panel" | "modal" | "inline";
  className?: string;
}

export function DrillReveal({
  open,
  onClose,
  children,
  title,
  variant = "panel",
  className,
}: DrillRevealProps) {
  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  /* Prevent body scroll while panel is open (panel / modal only) */
  useEffect(() => {
    if (variant === "inline") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open, variant]);

  if (!open) return null;

  /* ── Inline variant — expands within the flow ── */
  if (variant === "inline") {
    return (
      <div
        className={cn("animate-drill-in rounded-xl border border-border bg-card", className)}
        style={{ willChange: "opacity, transform" }}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="font-semibold text-foreground">{title}</span>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    );
  }

  /* ── Portal variants: panel + modal ── */
  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex",
        variant === "modal" ? "items-center justify-center" : "items-stretch justify-end"
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Detalle"}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content panel */}
      <div
        className={cn(
          "relative flex flex-col bg-card shadow-2xl animate-drill-in",
          "border border-border",
          variant === "modal"
            ? "w-full max-w-2xl rounded-2xl mx-4 max-h-[90vh]"
            : "w-full max-w-xl h-full rounded-l-2xl overscroll-contain",
          className
        )}
        style={{ willChange: "opacity, transform" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <h2 className="text-lg font-semibold text-foreground">{title ?? "Detalle"}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
