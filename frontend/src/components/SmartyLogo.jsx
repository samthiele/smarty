export default function SmartyLogo({ size = 40 }) {
  return (
    <svg
      className="smarty-logo"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="smarty-globe" x1="8" y1="8" x2="56" y2="56">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="55%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="smarty-orbit" x1="12" y1="48" x2="52" y2="16">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#smarty-globe)" opacity="0.15" />
      <circle cx="32" cy="32" r="22" stroke="url(#smarty-globe)" strokeWidth="3" />
      <ellipse
        cx="32"
        cy="32"
        rx="22"
        ry="9"
        stroke="url(#smarty-globe)"
        strokeWidth="2"
        opacity="0.85"
      />
      <path
        d="M10 32h44M32 10v44"
        stroke="url(#smarty-globe)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle cx="32" cy="32" r="4.5" fill="#ffffff" />
      <circle cx="32" cy="32" r="2.2" fill="#2563eb" />
      <path
        d="M44 14c8 6 10 14 8 22"
        stroke="url(#smarty-orbit)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="50" cy="16" r="4" fill="#22d3ee" />
      <path
        d="M48.5 13.5l3 3-3 3"
        stroke="#0f172a"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.35"
      />
    </svg>
  );
}
