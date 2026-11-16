interface LogomarkProps {
  size?: number;
}

export function Logomark({ size = 36 }: LogomarkProps) {
  return (
    <svg width={size} height={size * 1.3} viewBox="0 0 40 52" fill="none" aria-hidden="true">
      {/* palito */}
      <rect x="17.5" y="20" width="5" height="30" rx="2" fill="#8C3B2E" />
      {/* chama em forma de livro aberto */}
      <path
        d="M20 22C20 22 6 18 4 8C4 8 14 6 20 14C26 6 36 8 36 8C34 18 20 22 20 22Z"
        fill="url(#flameGrad)"
      />
      <path d="M20 22C20 22 20 15 20 14" stroke="#1B2530" strokeWidth="0.6" strokeLinecap="round" />
      <defs>
        <linearGradient id="flameGrad" x1="4" y1="8" x2="36" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#B08D3E" />
          <stop offset="1" stopColor="#8C3B2E" />
        </linearGradient>
      </defs>
    </svg>
  );
}
