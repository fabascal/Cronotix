import logoColor from "./cronotix_logo.webp";
import logoWhite from "./cronotix_logo_white.webp";

interface LogoProps {
  className?: string;
  variant?: "color" | "white";
  alt?: string;
  /**
   * When true, adds `view-transition-name: site-logo` so the browser
   * can animate the logo as a shared/continuity element across page
   * transitions. Only set on ONE logo instance per page.
   */
  enableTransition?: boolean;
}

export default function LogoCronotix({
  className,
  variant = "white",
  alt = "Cronotix",
  enableTransition = false,
}: LogoProps) {
  return (
    <img
      src={variant === "white" ? logoWhite : logoColor}
      alt={alt}
      className={className}
      draggable={false}
      style={enableTransition ? { viewTransitionName: "site-logo" } : undefined}
    />
  );
}
