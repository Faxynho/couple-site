import type { CSSProperties } from "react";
import { Heart, Star } from "lucide-react";

/**
 * Elementos puramente decorativos do cartão de perfil (orelhas com estrela e
 * coração, brilhinhos, nuvens). Tudo é `aria-hidden` e colorido por variáveis
 * `--pc-*` (components/account/profile-card.css), então acompanha o tema e o
 * modo claro/escuro automaticamente.
 */

export function SparkleIcon({ size = 14, className = "", style }: { size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className} style={style} fill="currentColor">
      <path d="M12 0C12.9 7.6 16.4 11.1 24 12C16.4 12.9 12.9 16.4 12 24C11.1 16.4 7.6 12.9 0 12C7.6 11.1 11.1 7.6 12 0Z" />
    </svg>
  );
}

/** As duas "orelhas" do topo do cartão: estrela à esquerda, coração à direita. */
export function ProfileEars() {
  return (
    <>
      <span className="profile-ear profile-ear-left" aria-hidden="true">
        <Star size={22} fill="currentColor" strokeWidth={1.5} />
      </span>
      <span className="profile-ear profile-ear-right" aria-hidden="true">
        <Heart size={21} fill="currentColor" strokeWidth={1.5} />
      </span>
    </>
  );
}

const SPARKLES: { top: string; left?: string; right?: string; size: number; delay: string }[] = [
  { top: "9%", left: "30%", size: 13, delay: "0s" },
  { top: "6%", right: "27%", size: 10, delay: "1.1s" },
  { top: "22%", right: "9%", size: 12, delay: "0.6s" },
  { top: "29%", left: "8%", size: 9, delay: "1.7s" },
  { top: "44%", right: "6%", size: 14, delay: "2.2s" },
  { top: "52%", left: "5%", size: 11, delay: "0.3s" },
  { top: "66%", right: "12%", size: 9, delay: "1.4s" },
];

/** Brilhinhos espalhados atrás do conteúdo (piscam devagar). */
export function ProfileSparkles() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]" aria-hidden="true">
      {SPARKLES.map((s, index) => (
        <SparkleIcon
          key={index}
          size={s.size}
          className="pc-twinkle absolute"
          style={{ top: s.top, left: s.left, right: s.right, animationDelay: s.delay }}
        />
      ))}
    </div>
  );
}

/** Nuvem grande atrás da metade de baixo do avatar. */
export function AvatarCloud() {
  return (
    <svg
      className="pointer-events-none absolute left-1/2 top-[52%] z-0 w-full max-w-[26rem] -translate-x-1/2"
      viewBox="0 0 300 130"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M34 122C10 122 0 100 14 86C8 64 30 50 50 56C56 34 86 22 108 38C122 16 160 14 176 36C196 24 226 34 228 58C252 54 274 72 262 94C276 108 264 122 244 122Z"
        fill="var(--pc-cloud-fill)"
        stroke="var(--pc-cloud-stroke)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Nuvenzinhas nos cantos de baixo do cartão (ficam atrás das abas, só despontam nas bordas). */
export function ProfileFootClouds() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-10 overflow-hidden rounded-b-[inherit]" aria-hidden="true">
      <svg className="absolute -bottom-3 -left-4 w-28" viewBox="0 0 140 60" fill="none">
        <path d="M10 60C-4 60 -6 42 8 36C6 20 26 12 40 22C46 6 72 4 82 20C98 14 116 26 112 42C128 44 132 60 116 60Z" fill="var(--pc-cloud-fill)" stroke="var(--pc-cloud-stroke)" strokeWidth="1.4" />
      </svg>
      <svg className="absolute -bottom-3 -right-4 w-28 -scale-x-100" viewBox="0 0 140 60" fill="none">
        <path d="M10 60C-4 60 -6 42 8 36C6 20 26 12 40 22C46 6 72 4 82 20C98 14 116 26 112 42C128 44 132 60 116 60Z" fill="var(--pc-cloud-fill)" stroke="var(--pc-cloud-stroke)" strokeWidth="1.4" />
      </svg>
    </div>
  );
}

/** Três tracinhos de brilho de cada lado do título (como na referência). */
export function SparkDashes({ side }: { side: "left" | "right" }) {
  const mirror = side === "right";
  return (
    <svg
      width="22"
      height="26"
      viewBox="0 0 22 26"
      aria-hidden="true"
      className={`shrink-0 ${mirror ? "-scale-x-100" : ""}`}
      style={{ color: "var(--pc-accent)" }}
    >
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <line x1="3" y1="9" x2="10" y2="12" />
        <line x1="3" y1="17" x2="11" y2="15" />
        <line x1="6" y1="2" x2="11" y2="8" />
      </g>
    </svg>
  );
}
