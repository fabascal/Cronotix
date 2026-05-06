import { useEffect, useRef } from "react";

/**
 * useScrollReveal
 * ─────────────────
 * Observes one or more elements. When each enters the viewport it receives
 * the CSS class `is-visible` (which drives entrance animations defined in CSS).
 *
 * The animation class is added once and kept — elements don't re-animate
 * on scroll-out/scroll-back-in (set `once: false` to change that).
 */
export function useScrollReveal<T extends HTMLElement>(
  opts: { threshold?: number; once?: boolean } = {}
) {
  const { threshold = 0.15, once = true } = opts;
  const refs = useRef<(T | null)[]>([]);

  const setRef = (index: number) => (el: T | null) => {
    refs.current[index] = el;
  };

  useEffect(() => {
    const nodes = refs.current.filter(Boolean) as T[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            entry.target.classList.remove("is-visible");
          }
        });
      },
      { threshold }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [threshold, once]);

  return setRef;
}
