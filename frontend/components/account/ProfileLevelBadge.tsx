import { useId } from "react";
import { levelProgress, type PlayerLevelInfo } from "@/lib/profileLevel";

/**
 * Selo de nível (escudo com asas e coroa) + barra de XP do perfil.
 * Só apresenta os dados que recebe em `info` — de onde vêm (hoje um
 * placeholder, amanhã o sistema de nível real) é assunto de lib/profileLevel.ts.
 */
export default function ProfileLevelBadge({ info }: { info: PlayerLevelInfo }) {
  const gradId = useId().replace(/:/g, "");
  const progress = levelProgress(info);
  const percent = Math.round(progress * 100);

  return (
    <div className="flex w-full items-center gap-3 sm:gap-4" data-testid="profile-level">
      <div className="relative h-[6.25rem] w-[7.1rem] shrink-0">
        <svg viewBox="0 0 120 104" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id={`${gradId}-shield`} x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0" style={{ stopColor: "var(--pc-shield-a)" }} />
              <stop offset="1" style={{ stopColor: "var(--pc-shield-b)" }} />
            </linearGradient>
            <linearGradient id={`${gradId}-crown`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff3b0" />
              <stop offset="1" stopColor="#f2b629" />
            </linearGradient>
          </defs>
          {/* asas */}
          <g style={{ fill: "var(--pc-wing)", stroke: "var(--pc-accent)" }} strokeWidth="1.4" strokeLinejoin="round" fillOpacity="0.85">
            <path d="M32 44C20 40 8 44 3 54C12 54 17 57 20 62C13 63 8 67 7 74C16 71 25 71 32 76Z" />
            <path d="M88 44C100 40 112 44 117 54C108 54 103 57 100 62C107 63 112 67 113 74C104 71 95 71 88 76Z" />
          </g>
          {/* escudo */}
          <path
            d="M60 22L88 32V58C88 75 74 87 60 96C46 87 32 75 32 58V32Z"
            fill={`url(#${gradId}-shield)`}
            stroke="#ffffff"
            strokeOpacity="0.92"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M60 28L82 36V58C82 71 71 81 60 88C49 81 38 71 38 58V36Z" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.2" />
          {/* coroa */}
          <path d="M45 24L43 10L52 16L60 5L68 16L77 10L75 24Z" fill={`url(#${gradId}-crown)`} stroke="#c98a1a" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
        <div className="absolute inset-x-0 top-[2.5rem] flex flex-col items-center leading-none text-white">
          <span className="text-[0.62rem] font-bold uppercase tracking-wide opacity-95">Nível</span>
          <span className="font-display text-[2rem] font-bold" data-testid="profile-level-number">{info.level}</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="profile-xp-track"
          role="progressbar"
          aria-label="Progresso de experiência"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="profile-xp-fill" style={{ width: `${percent}%`, minWidth: percent > 0 ? "0.9rem" : 0 }} />
        </div>
        <p className="mt-1.5 text-xs font-medium text-[color:var(--pc-text-soft)]" data-testid="profile-xp-text">
          {info.xp.toLocaleString("pt-BR")} / {info.xpToNext.toLocaleString("pt-BR")} XP
        </p>
      </div>
    </div>
  );
}
