/**
 * A four-point stationery sparkle in butter yellow. DESIGN.md: a sparkle only appears next to a
 * number that earns it, never as decoration on its own.
 */
export function Sparkle({ className = "w-3.5 h-3.5", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`inline-block shrink-0 text-butter ${className}`} aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
      {title && <title>{title}</title>}
      <path
        d="M8 0.5 C8.6 5 11 7.4 15.5 8 C11 8.6 8.6 11 8 15.5 C7.4 11 5 8.6 0.5 8 C5 7.4 7.4 5 8 0.5 Z"
        fill="currentColor"
        stroke="#B45309"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
