import { SVGProps } from "react";

// Ícones vetoriais do novo HUD (modo DEV da Hello Kitty). Decorativos: o texto ao lado sempre diz o que são.
type IconProps = SVGProps<SVGSVGElement>;
const base = { viewBox: "0 0 64 64", "aria-hidden": true, focusable: false } as const;
const INK = "#8a4260";

export function NavHomeIcon(props: IconProps) {
  return <svg {...base} {...props}>
    <rect x="45" y="10" width="7" height="14" rx="2" fill="#ffd0dd" stroke="#e87aa3" strokeWidth="2.4" />
    <path d="M32 7 L58 29 H6Z" fill="#ff7fae" stroke="#e0508a" strokeWidth="3" strokeLinejoin="round" />
    <path d="M13 29 L32 13.5" fill="none" stroke="#ffc1d8" strokeWidth="3" strokeLinecap="round" opacity=".8" />
    <rect x="11" y="29" width="42" height="26" rx="5" fill="#fff3ea" stroke="#e0508a" strokeWidth="3" />
    <path d="M32 52 V41 a6 6 0 0 1 12 0 V52Z" fill="#ffb3cc" stroke="#e0508a" strokeWidth="2.4" strokeLinejoin="round" transform="translate(-6 0)" />
    <path d="M32 47.5c-5-3.2-3.8-6.8-1.6-6.8 1.4 0 1.6 1.2 1.6 1.2s.2-1.2 1.6-1.2c2.2 0 3.4 3.6-1.6 6.8z" fill="#fff" />
    <rect x="40" y="35" width="8" height="8" rx="2" fill="#ffe7a8" stroke="#e0508a" strokeWidth="2" />
  </svg>;
}

export function NavUpgradeIcon(props: IconProps) {
  return <svg {...base} {...props}>
    <path d="M32 6 L54 30 H41 V54 H23 V30 H10Z" fill="#6fd069" stroke="#2f9a3f" strokeWidth="3.2" strokeLinejoin="round" />
    <path d="M32 12 L16 28 H25 V50" fill="none" stroke="#b9f2a8" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" opacity=".85" />
    <path d="M14 16 C4 8 4 24 14 16Z M14 16 C24 8 24 24 14 16Z" fill="#ff7fae" stroke="#e0508a" strokeWidth="2.4" strokeLinejoin="round" />
    <circle cx="14" cy="16" r="3.2" fill="#ffc1d8" stroke="#e0508a" strokeWidth="2" />
  </svg>;
}

export function NavRelicIcon(props: IconProps) {
  return <svg {...base} {...props}>
    <rect x="9" y="28" width="46" height="28" rx="6" fill="#ff9fc2" stroke="#e0508a" strokeWidth="3" />
    <rect x="7" y="20" width="50" height="13" rx="5" fill="#ffb7d1" stroke="#e0508a" strokeWidth="3" />
    <rect x="28" y="20" width="8" height="36" fill="#fff0f5" stroke="#e0508a" strokeWidth="2" />
    <path d="M32 20 C20 6 8 14 16 21 C22 24 30 22 32 20Z M32 20 C44 6 56 14 48 21 C42 24 34 22 32 20Z" fill="#fff0f5" stroke="#e0508a" strokeWidth="2.6" strokeLinejoin="round" />
    <circle cx="32" cy="20" r="4" fill="#ff7fae" stroke="#e0508a" strokeWidth="2" />
    <path d="M14 33 H24" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".6" />
  </svg>;
}

export function NavStatsIcon(props: IconProps) {
  return <svg {...base} {...props}>
    <rect x="9" y="34" width="12" height="22" rx="4" fill="#ffb02e" stroke="#d9791a" strokeWidth="3" />
    <rect x="26" y="20" width="12" height="36" rx="4" fill="#ff8a3d" stroke="#d9531a" strokeWidth="3" />
    <rect x="43" y="8" width="12" height="48" rx="4" fill="#ff6f91" stroke="#d93f68" strokeWidth="3" />
    <path d="M13 40 V50 M30 28 V46 M47 16 V42" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity=".55" />
  </svg>;
}

export function NavConstellationIcon(props: IconProps) {
  const star = (cx: number, cy: number, r: number) => {
    const pts = Array.from({ length: 10 }, (_, i) => { const rr = i % 2 ? r * .45 : r; const a = (-90 + i * 36) * Math.PI / 180; return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`; }).join(" ");
    return <polygon points={pts} fill="#ffd45a" stroke="#c9801a" strokeWidth="1.8" strokeLinejoin="round" />;
  };
  return <svg {...base} {...props}>
    <circle cx="32" cy="32" r="28" fill="#3a2a7a" stroke="#ffd45a" strokeWidth="3" />
    <circle cx="32" cy="32" r="28" fill="none" stroke="#8d78ff" strokeWidth="1.4" opacity=".7" strokeDasharray="2 5" transform="scale(.82) translate(7 7)" />
    <path d="M14 42 L26 22 L38 36 L50 16" fill="none" stroke="#ffe9a0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
    {star(14, 42, 6)}{star(26, 22, 7)}{star(38, 36, 6)}{star(50, 16, 8)}
    <circle cx="48" cy="46" r="1.6" fill="#fff" /><circle cx="20" cy="14" r="1.3" fill="#fff" /><circle cx="54" cy="32" r="1.2" fill="#fff" />
  </svg>;
}

export function WorldIcon(props: IconProps) {
  return <svg {...base} {...props}>
    <ellipse cx="32" cy="58" rx="16" ry="3" fill="#6a82c8" opacity=".25" />
    <path d="M8 32 C9 44 20 50 28 56 L32 61 L36 56 C44 50 55 44 56 32Z" fill="#c18b73" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M26 46 Q32 50 38 46" fill="none" stroke="#9a6678" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M6 30 C6 24 18 20 32 20 C46 20 58 24 58 30 C58 37 46 41 32 41 C18 41 6 37 6 30Z" fill="#9be063" stroke="#4f9f45" strokeWidth="2.6" />
    <rect x="30" y="7" width="4" height="17" rx="1.5" fill="#8c5b3d" />
    <circle cx="25" cy="11" r="8" fill="#4f9f45" /><circle cx="39" cy="11" r="8" fill="#5db452" /><circle cx="32" cy="5" r="8" fill="#78c761" />
    <circle cx="16" cy="29" r="2.2" fill="#fff" /><circle cx="47" cy="32" r="2.2" fill="#ffb3cf" />
  </svg>;
}

export function PlaqueBow(props: IconProps) {
  return <svg viewBox="0 0 64 40" aria-hidden focusable={false} {...props}>
    <path d="M32 22 C24 3 3 5 5 18 C7 31 26 28 32 22Z" fill="#ff6f9f" stroke="#d93f78" strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M32 22 C40 3 61 5 59 18 C57 31 38 28 32 22Z" fill="#ff6f9f" stroke="#d93f78" strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M11 12 C16 9 22 10 25 14" fill="none" stroke="#ffc1d8" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="32" cy="22" r="6.5" fill="#ff9fbf" stroke="#d93f78" strokeWidth="2.4" />
    <circle cx="30" cy="20" r="2" fill="#ffd9e6" />
  </svg>;
}

export function GoldSparkle(props: IconProps) {
  return <svg viewBox="0 0 24 24" aria-hidden focusable={false} {...props}>
    <path d="M12 0 C12.8 7 17 11.2 24 12 C17 12.8 12.8 17 12 24 C11.2 17 7 12.8 0 12 C7 11.2 11.2 7 12 0Z" fill="currentColor" />
  </svg>;
}

export function ClickItemIcon(props: IconProps) {
  return <svg {...base} {...props}>
    <circle cx="32" cy="32" r="26" fill="#fff0f5" stroke="#e0508a" strokeWidth="3" />
    <path d="M26 14 V34 L21.5 30 C19 27.6 15.5 30.4 17.6 33 L27 46 C29 49 32 50 36 50 H40 C46 50 49 46 49 41 V32 C49 28.5 44 28.5 44 32 V29 C44 25.5 39 25.5 39 29 V27 C39 23.5 34 23.5 34 27 V14 C34 9.5 26 9.5 26 14Z" fill="#fff" stroke="#e0508a" strokeWidth="2.6" strokeLinejoin="round" />
    <path d="M14 14 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2z M50 12 l1.6 3 3 1.6 -3 1.6 -1.6 3 -1.6 -3 -3 -1.6 3 -1.6z" fill="#ffd45a" stroke="#d9971a" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>;
}

/** Canto ornamentado dourado (moldura do personagem despertado). Use quatro, girando com `rotate`. */
export function OrnateCorner(props: IconProps & { rotate?: number }) {
  const { rotate = 0, style, ...rest } = props;
  return <svg viewBox="0 0 48 48" aria-hidden focusable={false} style={{ transform: `rotate(${rotate}deg)`, ...style }} {...rest}>
    <defs>
      <linearGradient id={`og${rotate}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff2b8" /><stop offset=".5" stopColor="#e9b95c" /><stop offset="1" stopColor="#b9852a" /></linearGradient>
    </defs>
    <path d="M3 44 V16 C3 8 8 3 16 3 H44" fill="none" stroke={`url(#og${rotate})`} strokeWidth="2.6" strokeLinecap="round" />
    <path d="M9 44 V19 C9 13 13 9 19 9 H44" fill="none" stroke={`url(#og${rotate})`} strokeWidth="1.1" strokeLinecap="round" opacity=".8" />
    <path d="M15 15 C15 8 24 8 24 14 C24 19 17 19 17 14" fill="none" stroke={`url(#og${rotate})`} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M24 3 C30 9 36 9 42 3" fill="none" stroke={`url(#og${rotate})`} strokeWidth="1.2" strokeLinecap="round" opacity=".9" />
    <path d="M3 24 C9 30 9 36 3 42" fill="none" stroke={`url(#og${rotate})`} strokeWidth="1.2" strokeLinecap="round" opacity=".9" />
    <path d="M7 7 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6z" fill="#fff6c8" stroke="#c9921f" strokeWidth=".8" strokeLinejoin="round" />
  </svg>;
}

/** Estrela brilhante usada no arco de estrelas do personagem (cristal dourado com brilho). */
export function ShinyStar({ lit, id }: { lit: boolean; id: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 11 : 24; const a = (-90 + i * 36) * Math.PI / 180; return `${(32 + r * Math.cos(a)).toFixed(1)},${(33 + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
  const inner = Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 5.5 : 14; const a = (-90 + i * 36) * Math.PI / 180; return `${(32 + r * Math.cos(a)).toFixed(1)},${(33 + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
  return <svg viewBox="0 0 64 64" aria-hidden focusable={false} width="100%" height="100%">
    <defs>
      <linearGradient id={`sg${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff6c0" /><stop offset=".45" stopColor="#ffd24a" /><stop offset="1" stopColor="#f0901c" /></linearGradient>
      <radialGradient id={`sh${id}`} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#fff3b0" stopOpacity=".9" /><stop offset="1" stopColor="#ffd24a" stopOpacity="0" /></radialGradient>
    </defs>
    {lit && <circle cx="32" cy="33" r="31" fill={`url(#sh${id})`} />}
    <polygon points={pts} fill={lit ? `url(#sg${id})` : "rgba(120,100,170,.28)"} stroke={lit ? "#b8691a" : "rgba(255,255,255,.55)"} strokeWidth={lit ? 3 : 2} strokeLinejoin="round" strokeDasharray={lit ? undefined : "3 3"} />
    {lit && <><polygon points={inner} fill="#fff7cf" opacity=".6" /><ellipse cx="25" cy="21" rx="5.5" ry="2.8" fill="#fff" opacity=".9" transform="rotate(-35 25 21)" /><circle cx="42" cy="40" r="1.8" fill="#fff" opacity=".85" /></>}
  </svg>;
}
