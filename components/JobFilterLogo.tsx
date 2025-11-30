export function JobFilterLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Funnel/Filter shape with gradient */}
      <defs>
        <linearGradient id="filterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="50%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#F472B6" />
        </linearGradient>
      </defs>

      {/* Outer funnel */}
      <path
        d="M8 6 L32 6 L24 18 L24 30 L16 34 L16 18 Z"
        fill="url(#filterGradient)"
        opacity="0.9"
      />

      {/* Inner highlight */}
      <path
        d="M12 8 L28 8 L22 17 L22 26 L18 28 L18 17 Z"
        fill="white"
        opacity="0.2"
      />

      {/* Checkmark inside funnel */}
      <path
        d="M17 14 L19 16 L23 12"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
