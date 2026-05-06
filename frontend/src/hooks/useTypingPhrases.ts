import { useState, useEffect, useRef } from "react";

const DEFAULT_PHRASES = [
  "Automatizar soporte",
  "Diferenciar tu ecommerce",
  "Escalar ventas",
  "Explicar tu producto",
];

/**
 * Rotating typewriter effect for hero headlines (reduced motion: shows first phrase only).
 */
export function useTypingPhrases(phrases: string[] = DEFAULT_PHRASES) {
  const [text, setText] = useState(phrases[0] ?? "");
  const phraseIndex = useRef(0);
  const charIndex = useRef(0);
  const deleting = useRef(false);
  const reducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (reducedMotion.current || phrases.length === 0) {
      setText(phrases[0] ?? "");
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = phrases[phraseIndex.current] ?? "";
      if (deleting.current) {
        charIndex.current -= 1;
        setText(current.slice(0, charIndex.current));
        if (charIndex.current <= 0) {
          deleting.current = false;
          phraseIndex.current = (phraseIndex.current + 1) % phrases.length;
          timeout = setTimeout(tick, 500);
          return;
        }
        timeout = setTimeout(tick, 50);
      } else {
        charIndex.current += 1;
        setText(current.slice(0, charIndex.current));
        if (charIndex.current >= current.length) {
          deleting.current = true;
          timeout = setTimeout(tick, 2000);
          return;
        }
        timeout = setTimeout(tick, 100);
      }
    };

    timeout = setTimeout(tick, 1000);
    return () => clearTimeout(timeout);
  }, [phrases]);

  return text;
}
