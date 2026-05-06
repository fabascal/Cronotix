import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { smoothScrollTo } from "@/utils/smoothScroll";

interface BackToTopProps {
  /** px scrolled before the button appears (default: 320) */
  threshold?: number;
  /** Optional id of the element to scroll to (default: scrolls window to 0) */
  targetId?: string;
  className?: string;
}

/**
 * Floating "back to top" button that appears after the user
 * scrolls past `threshold` pixels.
 */
export function BackToTop({ threshold = 320, targetId, className }: BackToTopProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  const scrollUp = () => {
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) smoothScrollTo(el.getBoundingClientRect().top + window.scrollY);
    } else {
      smoothScrollTo(0);
    }
  };

  return (
    <button
      onClick={scrollUp}
      aria-label="Volver al inicio de la página"
      className={cn(
        "fixed bottom-8 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full",
        "border border-gold-700/50 bg-navy-800/90 text-gold-400 shadow-lg backdrop-blur",
        "transition-[opacity,transform] duration-300 hover:border-gold-500 hover:bg-navy-700 hover:text-gold-300 hover:shadow-[0_0_16px_rgba(149,124,61,0.35)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500",
        visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none",
        className
      )}
    >
      <ChevronUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
