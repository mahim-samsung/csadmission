/**
 * AppLogo — magnifying lens containing a graduation cap.
 *
 * Concept: "CS Admission Intelligence" — you're searching for and
 * evaluating PhD programs with precision. The lens = intelligent search;
 * the cap inside = academic achievement.
 *
 * Works on any background. Pass `color` to override the default white stroke.
 */
interface AppLogoProps {
  size?: number;
  /** Stroke/fill color — defaults to white (for use on dark bg) */
  color?: string;
  className?: string;
}

export function AppLogoIcon({ size = 28, color = "white", className = "" }: AppLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* ── Lens circle ── */}
      <circle cx="11" cy="11" r="8.5" stroke={color} strokeWidth="2" strokeOpacity="0.95" />

      {/* ── Graduation cap board (rhombus) inside the lens ── */}
      <polygon
        points="11,5.5 16,8.5 11,11.5 6,8.5"
        fill={color}
        fillOpacity="0.95"
      />

      {/* ── Gown body — arc below the cap board ── */}
      <path
        d="M7.5 10v2.8c0 1.8 1.6 3 3.5 3s3.5-1.2 3.5-3V10"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
        strokeOpacity="0.7"
      />

      {/* ── Tassel string ── */}
      <line
        x1="16"
        y1="8.5"
        x2="16"
        y2="12"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.75"
      />
      {/* ── Tassel bob ── */}
      <circle cx="16" cy="13" r="1" fill={color} fillOpacity="0.75" />

      {/* ── Handle of the lens ── */}
      <line
        x1="17.5"
        y1="17.5"
        x2="24.5"
        y2="24.5"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity="0.9"
      />
    </svg>
  );
}
