// The cpxo brand mark (clipboard tile with the >< exchange glyph).
export function Mark({ size = 28, mono = false, className = "" }: { size?: number; mono?: boolean; className?: string }) {
  if (mono) {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
        <rect x="12" y="16" width="76" height="74" rx="18" fill="none" stroke="currentColor" strokeWidth="6" />
        <rect x="36" y="9" width="28" height="12" rx="6" fill="currentColor" />
        <path d="M35 37 L50 53 L35 69 M65 37 L50 53 L65 69" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <rect x="10" y="14" width="80" height="78" rx="20" fill="#D6FF3F" />
      <rect x="34" y="6" width="32" height="14" rx="7" fill="#0B0D10" stroke="#D6FF3F" strokeWidth="4" />
      <path d="M34 36 L50 53 L34 70 M66 36 L50 53 L66 70" fill="none" stroke="#0B0D10" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-bold tracking-[-0.06em] leading-none ${className}`}>
      cp<span className="text-lime">x</span>o
    </span>
  );
}
