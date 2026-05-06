import { Link, type LinkProps } from "react-router-dom";

/**
 * Types of page transition:
 *  - "context"  Cross-fade between sibling/top-level pages (default)
 *  - "drill"    Zoom-in when navigating deeper (e.g. landing → login)
 *  - "back"     Zoom-out when navigating up (e.g. login → landing)
 */
export type VtType = "context" | "drill" | "back";

interface TransitionLinkProps extends LinkProps {
  vtType?: VtType;
}

/**
 * Wrapper around React Router <Link viewTransition> that also sets a
 * `data-vt` attribute on <html> before the transition fires, enabling
 * CSS to apply different animation variants per transition type.
 */
export function TransitionLink({
  vtType = "context",
  onClick,
  ...rest
}: TransitionLinkProps) {
  return (
    <Link
      {...rest}
      viewTransition
      onClick={(e) => {
        document.documentElement.dataset.vt = vtType;
        onClick?.(e);
      }}
    />
  );
}
