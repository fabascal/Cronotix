import { useEffect, useState, useRef, type ReactNode } from "react";

interface ContextTransitionProps {
  /**
   * Change this value to trigger the transition animation.
   * Typically: the active tab id, current filter, page number, etc.
   */
  transitionKey: string | number;
  children: ReactNode;
  className?: string;
}

/**
 * Context Transition
 * ------------------
 * Wraps content that *changes in place* — the surrounding structure (tabs,
 * sidebar, header) stays put; only the inner content animates on update.
 *
 * Use for: tab switching, filter changes, state updates, pagination.
 *
 * How it works:
 *   1. When `transitionKey` changes the previous content fades out.
 *   2. The new children animate in with a soft fade + Y slide.
 *
 * Example:
 *   <ContextTransition transitionKey={activeTab}>
 *     {activeTab === "overview"  && <Overview />}
 *     {activeTab === "history"   && <History />}
 *   </ContextTransition>
 */
export function ContextTransition({
  transitionKey,
  children,
  className = "",
}: ContextTransitionProps) {
  const [displayKey, setDisplayKey] = useState(transitionKey);
  const [displayChildren, setDisplayChildren] = useState(children);
  const [animating, setAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (transitionKey === displayKey) return;

    /* Step 1: fade out current content */
    setAnimating(true);

    timeoutRef.current = setTimeout(() => {
      /* Step 2: swap content + fade in */
      setDisplayKey(transitionKey);
      setDisplayChildren(children);
      setAnimating(false);
    }, 130); // half of context-out duration (160ms)

    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitionKey]);

  /* Keep children fresh when key hasn't changed */
  useEffect(() => {
    if (!animating) setDisplayChildren(children);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  return (
    <div
      className={[
        className,
        animating
          ? "animate-context-out pointer-events-none"
          : "animate-context-in",
      ].join(" ")}
      style={{ willChange: "opacity, transform" }}
    >
      {displayChildren}
    </div>
  );
}
