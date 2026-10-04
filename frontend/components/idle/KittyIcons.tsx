import { SVGProps } from "react";

// Ilustrações vetoriais das abas Melhorias e Conquistas do Mundo da Hello Kitty.
// São decorativas (aria-hidden); o texto ao lado sempre diz o que cada coisa é.
type IconProps = SVGProps<SVGSVGElement>;

const base = { viewBox: "0 0 64 64", "aria-hidden": true, focusable: false } as const;
const PINK = "#f0488a";
const PINK_LIGHT = "#ff7aa9";
const GOLD = "#ffd75e";
const GOLD_DARK = "#df9f17";

function CalendarFrame({ children, band = PINK_LIGHT }: { children: React.ReactNode; band?: string }) {
  return (
    <>
      <rect x="6" y="12" width="52" height="46" rx="12" fill="#fff" stroke={PINK} strokeWidth="3" />
      <path d="M6 30v-6a12 12 0 0 1 12-12h28a12 12 0 0 1 12 12v6z" fill={band} stroke={PINK} strokeWidth="3" strokeLinejoin="round" />
      <rect x="17" y="5" width="8" height="17" rx="4" fill="#fff" stroke={PINK} strokeWidth="2.5" />
      <rect x="39" y="5" width="8" height="17" rx="4" fill="#fff" stroke={PINK} strokeWidth="2.5" />
      {children}
    </>
  );
}

export function CalendarHeartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <CalendarFrame>
        <path d="M32 53C17 44 18 32 26 32c3.4 0 5.2 2 6 3.6.8-1.6 2.6-3.6 6-3.6 8 0 9 12-6 21z" fill={PINK} stroke="#c92f6f" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M24.5 36.2c.8-1.4 2-1.8 3-1.6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".7" />
      </CalendarFrame>
    </svg>
  );
}

export function CalendarStarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <CalendarFrame band="#b58cf0">
        <path d="M32 31l3.7 7.5 8.3 1.2-6 5.8 1.4 8.2L32 49.8l-7.4 3.9 1.4-8.2-6-5.8 8.3-1.2z" fill={GOLD} stroke={GOLD_DARK} strokeWidth="2" strokeLinejoin="round" />
      </CalendarFrame>
    </svg>
  );
}

export function CalendarCheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <CalendarFrame>
        <path d="M22 41.5l7 7 14-15" fill="none" stroke="#3fae52" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </CalendarFrame>
    </svg>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 12H9v5a11 11 0 0 0 11 11M44 12h11v5a11 11 0 0 1-11 11" fill="none" stroke={GOLD_DARK} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M18 6h28v18a14 14 0 0 1-28 0z" fill={GOLD} stroke={GOLD_DARK} strokeWidth="3" strokeLinejoin="round" />
      <path d="M24 12v11" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".6" />
      <path d="M32 29c-8-5-7.5-11.5-3-11.5 1.9 0 2.8 1.1 3 1.9.2-.8 1.1-1.9 3-1.9 4.5 0 5 6.5-3 11.5z" fill={PINK} stroke="#c92f6f" strokeWidth="1.2" strokeLinejoin="round" />
      <rect x="28" y="37" width="8" height="10" fill="#f2b632" stroke={GOLD_DARK} strokeWidth="2" />
      <rect x="18" y="47" width="28" height="11" rx="4" fill={GOLD} stroke={GOLD_DARK} strokeWidth="3" />
    </svg>
  );
}

export function ControllerIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M17 20h30c7 0 11 8 12 19 .7 7-4 11-9 8l-7-5H21l-7 5c-5 3-9.7-1-9-8 1-11 5-19 12-19z" fill="#ff8fb8" stroke="#d93a7d" strokeWidth="3" strokeLinejoin="round" />
      <path d="M20 31v8M16 35h8" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
      <circle cx="42" cy="32" r="3" fill="#fff" />
      <circle cx="48" cy="38" r="3" fill="#fff" />
      <path d="M22 24h20" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}

export function BowIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 64 44" aria-hidden focusable={false} {...props}>
      <path d="M32 22C22 3 4 5 6 19c2 15 18 12 26 3z" fill={PINK_LIGHT} stroke="#d93a7d" strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M32 22C42 3 60 5 58 19c-2 15-18 12-26 3z" fill={PINK_LIGHT} stroke="#d93a7d" strokeWidth="2.8" strokeLinejoin="round" />
      <path d="M32 22C24 30 18 39 12 41M32 22c8 8 14 17 20 19" fill="none" stroke="#d93a7d" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M14 13c3-3 8-3 11 0M50 13c-3-3-8-3-11 0" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity=".7" />
      <circle cx="32" cy="22" r="6.5" fill="#ff5c9a" stroke="#d93a7d" strokeWidth="2.8" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable={false} {...props}>
      <path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6z" fill="currentColor" />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable={false} {...props}>
      <path d="M12 21.5C3.5 15.6 2 10.9 4.2 7.6 6.1 4.9 9.9 5 12 8.2c2.1-3.2 5.9-3.3 7.8-.6 2.2 3.3.7 8-7.8 13.9z" fill="currentColor" />
      <path d="M6.2 9.4c.5-1.3 1.6-1.9 2.7-1.7" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".6" />
    </svg>
  );
}

export function MedalIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 4h10l4 18H24zM44 4H34l-4 18h10z" fill="#ff7aa9" stroke="#d93a7d" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="32" cy="38" r="19" fill={GOLD} stroke={GOLD_DARK} strokeWidth="3.5" />
      <circle cx="32" cy="38" r="13.5" fill="#ffe89a" stroke="#f2b632" strokeWidth="2" />
      <path d="M32 27.5l3 \1.\2 \1.\2.9-5 \1.\2 \1.\2 \1.\2-\1.\2-\1.\2-\1.\2 \1.\2 \1.\2-\1.\2-5-\1.\2 \1.\2-.9z" fill={PINK} stroke="#c92f6f" strokeWidth="\1.\2" strokeLinejoin="round" />
    </svg>
  );
}
