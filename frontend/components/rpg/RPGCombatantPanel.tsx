"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import AccountAvatar from "@/components/account/AccountAvatar";
import { useAccountPhotos } from "@/hooks/useAccountPhotos";
import { Player } from "@/lib/types";
import { RPGCharacterAppearance, RPGCombatant, RPG_CLASSES, RPGRoundEvent } from "@/lib/rpgTypes";

interface Props {
  combatant: RPGCombatant;
  name: string;
  player?: Player;
  color?: string;
  appearance?: RPGCharacterAppearance | null;
  facing: "right" | "left";
  events: RPGRoundEvent[];
  eventsKey: number;
  currentRound: number;
  showChosenBadge?: boolean;
}

type StatusKind = "poison" | "bleed" | "curse";

const STATUS: Record<StatusKind, { label: string; emoji: string; chip: string; particle: string; text: string }> = {
  poison: { label: "Envenenado", emoji: "☠️", chip: "border-emerald-300/80 bg-emerald-100/90 text-emerald-800", particle: "bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.95)]", text: "text-emerald-800" },
  bleed: { label: "Sangramento", emoji: "🩸", chip: "border-red-300/80 bg-red-100/90 text-red-800", particle: "bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.95)]", text: "text-red-800" },
  curse: { label: "Maldição", emoji: "🕯️", chip: "border-violet-300/80 bg-violet-100/90 text-violet-900", particle: "bg-violet-600 shadow-[0_0_10px_rgba(139,92,246,0.95)]", text: "text-violet-900" },
};

const BASE_FILTER = "brightness(1) saturate(1) contrast(1)";
const DEAD_FILTER = "grayscale(1) brightness(0.72)";
const DAMAGE_FLASH_FILTER: Record<"normal" | StatusKind, string> = {
  normal: "brightness(0) saturate(100%) invert(16%) sepia(99%) saturate(6921%) hue-rotate(358deg) brightness(96%) contrast(117%)",
  poison: "brightness(0) saturate(100%) invert(55%) sepia(96%) saturate(455%) hue-rotate(73deg) brightness(94%) contrast(94%)",
  bleed: "brightness(0) saturate(100%) invert(12%) sepia(99%) saturate(6921%) hue-rotate(358deg) brightness(82%) contrast(125%)",
  curse: "brightness(.08) saturate(.25) contrast(2.4)",
};

// A dimensão base pertence exclusivamente ao PNG. Os wrappers externos só
// posicionam, espelham ou animam essa caixa — nunca a redimensionam.
const SPRITE_BASE_SIZE = "h-[196px] w-[196px] sm:h-[216px] sm:w-[216px]";

// As classes reais são centralizadas em RPG_CLASSES; esta tabela só fornece
// o emoji de leitura do mini HUD, sem criar classes novas.
const CLASS_EMOJI: Record<string, string> = {
  warrior: "⚔️", mage: "🔮", assassin: "🗡️", archer: "🏹", paladin: "🛡️", warlock: "🔮", boss: "👹",
};

function spriteSource(combatant: RPGCombatant, appearance?: RPGCharacterAppearance | null) {
  return combatant.classId === "boss"
    ? "/images/rpg/sprites/man.png"
    : `/images/rpg/sprites/${appearance ?? "man"}_${combatant.classId}.png`;
}

function floatingText(event: RPGRoundEvent) {
  if (event.type === "attack" && (event.amount ?? 0) > 0) return { text: event.isCrit ? `CRÍTICO! -${event.amount}` : `-${event.amount}`, tone: event.isCrit ? "crit" : "damage" };
  if (event.type === "heal" && (event.amount ?? 0) > 0) return { text: `+${event.amount}`, tone: "heal" as const };
  if (event.type === "evade") return { text: "ESQUIVOU!", tone: "info" as const };
  if (event.type === "immuneBlock") return { text: "BLOQUEADO!", tone: "info" as const };
  if (event.type === "stunSkip") return { text: "ATORDOADO!", tone: "info" as const };
  if (event.type === "domination") return { text: "DOMINADO!", tone: "info" as const };
  if (event.type === "buff") return { text: "PODER AUMENTADO!", tone: "heal" as const };
  return null;
}

function statusKindForEvent(event: RPGRoundEvent): StatusKind {
  return event.status ?? (event.cardId === "bleeding" ? "bleed" : event.cardId === "curse" ? "curse" : "poison");
}

function StatusEffectBurst({ event, index, eventsKey, onStart, onComplete }: { event: RPGRoundEvent; index: number; eventsKey: number; onStart: () => void; onComplete: () => void }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const status = statusKindForEvent(event);
  const visual = STATUS[status];

  return (
    <motion.div
      key={`status-${eventsKey}-${index}-${status}`}
      className="pointer-events-none absolute inset-x-[16%] bottom-auto top-[calc(100%+5rem)] z-[25] h-12 sm:bottom-[4%] sm:top-[8%] sm:h-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 1, 0] }}
      transition={{ duration: 1.62 + index * 0.18, times: [0, 0.12, 0.35, 0.9, 1] }}
      onAnimationStart={onStart}
      onAnimationComplete={() => {
        setVisible(false);
        onComplete();
      }}
    >
      <motion.span className="absolute left-1/2 top-[14%] -translate-x-1/2 text-4xl leading-none drop-shadow-[0_0_14px_rgba(255,255,255,0.95)] sm:text-5xl" initial={{ opacity: 0, scale: 0.25, y: 10, rotate: -10 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.25, 1.2, 0.95, 1], y: [10, -4, -18, -35], rotate: [-10, 6, -3, 0] }} transition={{ duration: 0.72, delay: 0.62 + index * 0.18, ease: "easeOut" }}>{visual.emoji}</motion.span>
      <motion.span className={`absolute left-1/2 top-[46%] -translate-x-1/2 whitespace-nowrap rounded-full border border-surface/80 bg-surface/90 px-2 py-1 font-display text-[10px] font-extrabold shadow-lg sm:text-xs ${visual.text}`} initial={{ opacity: 0, y: 9, scale: 0.75 }} animate={{ opacity: [0, 1, 1, 0], y: [9, 0, -10, -22], scale: [0.75, 1, 1, 1.04] }} transition={{ duration: 0.72, delay: 0.64 + index * 0.18, ease: "easeOut" }}>-{event.amount} {visual.label}</motion.span>
      {Array.from({ length: 10 }, (_, particleIndex) => {
        const startLeft = 25 + ((particleIndex * 19) % 52);
        const startTop = 38 + ((particleIndex * 13) % 36);
        const x = ((particleIndex * 23) % 58) - 29;
        const y = status === "bleed" ? 18 + ((particleIndex * 9) % 24) : -24 - ((particleIndex * 11) % 34);
        return <motion.i key={`${eventsKey}-${status}-${particleIndex}`} className={`absolute h-2 w-2 rounded-sm ${visual.particle}`} style={{ left: `${startLeft}%`, top: `${startTop}%` }} initial={{ opacity: 0, x: 0, y: 0, scale: 0.2 }} animate={{ opacity: [0, 1, 0.85, 0], x: status === "curse" ? [0, x * 0.45, -x * 0.35, x] : x, y, scale: [0.2, 1, 0.75, 0.25], rotate: [0, particleIndex % 2 ? 140 : -140] }} transition={{ delay: 0.8 + index * 0.18 + particleIndex * 0.012, duration: 0.56, ease: "easeOut" }} />;
      })}
    </motion.div>
  );
}

/** Reaproveita os gatilhos da versão anterior, mas os limita ao palco do sprite. */
export default function RPGCombatantPanel({ combatant, name, player, color, appearance, facing, events, eventsKey, currentRound, showChosenBadge }: Props) {
  const photos = useAccountPhotos();
  const classDef = RPG_CLASSES[combatant.classId];
  const isWoman = appearance === "woman";
  const accent = isWoman
    ? { border: "border-rose-300/80", glow: "shadow-[0_8px_24px_rgba(244,114,182,0.24)]", line: "from-rose-400 to-fuchsia-300", label: "text-rose-700" }
    : { border: "border-sky-300/80", glow: "shadow-[0_8px_24px_rgba(56,189,248,0.24)]", line: "from-sky-400 to-indigo-300", label: "text-sky-700" };
  const hpPct = Math.max(0, Math.min(100, (combatant.hp / combatant.maxHp) * 100));
  const attackEvents = events.filter((event) => event.type === "attack" && (event.amount ?? 0) > 0);
  const statusTickEvents = events.filter((event) => event.type === "statusTick" && (event.amount ?? 0) > 0);
  const normalDamage = attackEvents.length > 0;
  const statusDamage = statusTickEvents.length > 0;
  const totalDamage = [...attackEvents, ...statusTickEvents].reduce((total, event) => total + (event.amount ?? 0), 0);
  const heavyDamage = normalDamage && totalDamage >= combatant.maxHp * 0.25;
  const criticalDamage = attackEvents.some((event) => event.isCrit);
  const healed = !normalDamage && !statusDamage && events.some((event) => event.type === "heal" && (event.amount ?? 0) > 0);
  const fullHealUsed = events.some((event) => event.type === "heal" && event.cardId === "unique_full_heal" && (event.amount ?? 0) > 0);
  const evaded = !normalDamage && !statusDamage && events.some((event) => event.type === "evade");
  const blocked = !normalDamage && !statusDamage && events.some((event) => event.type === "immuneBlock");
  const dead = !combatant.alive;
  const criticalHp = combatant.alive && hpPct <= 15;
  const activeStatuses: Array<[StatusKind, string]> = [];
  if (combatant.poisonRoundsRemaining > 0) activeStatuses.push(["poison", `(${combatant.poisonRoundsRemaining})`]);
  if (combatant.bleedRoundsRemaining > 0) activeStatuses.push(["bleed", `(${combatant.bleedRoundsRemaining})`]);
  if (combatant.curseRoundsRemaining > 0) activeStatuses.push(["curse", `(${combatant.curseRoundsRemaining})`]);
  const extraBadges: Array<{ text: string; emoji: string; className: string }> = [];
  if (combatant.stunnedRounds > 0) extraBadges.push({ text: "Atordoado", emoji: "💫", className: "border-slate-300 bg-slate-100 text-slate-700" });
  if (combatant.immuneThisRound || combatant.immuneNextHit) extraBadges.push({ text: "Imunidade", emoji: "🛡️", className: "border-sky-300 bg-sky-100 text-sky-800" });
  if (combatant.evadeBonusNextHit > 0 || combatant.permanentEvadeBonus > 0) extraBadges.push({ text: "Esquiva", emoji: "💨", className: "border-blue-300 bg-blue-100 text-blue-800" });
  if (combatant.permanentCritBonus > 0) extraBadges.push({ text: "Crítico", emoji: "🎯", className: "border-red-300 bg-red-100 text-red-800" });
  if (combatant.luckBonus > 0) extraBadges.push({ text: "Sorte", emoji: "🍀", className: "border-emerald-300 bg-emerald-100 text-emerald-800" });
  const activeDefense = combatant.defenseBuffStartRound > 0 && currentRound > combatant.defenseBuffStartRound && currentRound <= combatant.defenseBuffUntilRound;
  const tookRealDamage = normalDamage || statusDamage;
  const criticalPulseActive = criticalHp && !dead && !tookRealDamage && !healed && !evaded;
  const restingFilter = dead ? DEAD_FILTER : BASE_FILTER;
  const spriteFilter = tookRealDamage
      ? [BASE_FILTER, DAMAGE_FLASH_FILTER.normal, DAMAGE_FLASH_FILTER.normal, restingFilter]
      : healed
        ? [BASE_FILTER, "brightness(1.45) saturate(1.55) sepia(.18) hue-rotate(75deg)", restingFilter]
        : criticalPulseActive
          ? [BASE_FILTER, "brightness(1.16) saturate(1.2) contrast(1.05)", BASE_FILTER]
          : restingFilter;
  const spriteFilterTimes = tookRealDamage ? [0, 0.18, 0.55, 1] : undefined;
  if (activeDefense) extraBadges.push({ text: "Escudo divino", emoji: "🛡️", className: "border-amber-300 bg-amber-100 text-amber-800" });
  const floats = events.map(floatingText).filter((event): event is NonNullable<ReturnType<typeof floatingText>> => Boolean(event));
  const hasBadges = activeStatuses.length > 0 || extraBadges.length > 0 || showChosenBadge;
  const [visibleEffectIds, setVisibleEffectIds] = useState<string[]>([]);

  // A faixa móvel de efeitos só existe enquanto uma animação chegou a ser
  // exibida. Os eventos da rodada permanecem no estado até a próxima rodada,
  // portanto não podem determinar sozinhos o espaço reservado pelo HP.
  useEffect(() => {
    setVisibleEffectIds([]);
  }, [eventsKey]);

  const markEffectVisible = (id: string) => {
    setVisibleEffectIds((visible) => visible.includes(id) ? visible : [...visible, id]);
  };
  const markEffectComplete = (id: string) => {
    setVisibleEffectIds((visible) => visible.filter((visibleId) => visibleId !== id));
  };
  const effectLaneVisible = visibleEffectIds.length > 0;

  const healthGradient = hpPct > 50
    ? "linear-gradient(90deg, #16a34a, #4ade80)"
    : hpPct > 25
      ? "linear-gradient(90deg, #f59e0b, #facc15)"
      : "linear-gradient(90deg, #dc2626, #fb7185)";

  return (
    <section data-rpg-combatant-id={combatant.id} className="relative flex min-w-0 flex-1 flex-col items-center">
      {/* Mini HUD: deliberadamente não herda animações de combate. */}
      <div className={`relative z-30 mb-1.5 flex max-w-full items-center gap-2 overflow-hidden rounded-2xl border bg-surface/85 px-3 py-2.5 backdrop-blur-md ${accent.border} ${accent.glow}`}>
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent.line} opacity-90`} />
        <div className={`pointer-events-none absolute -right-5 -top-5 h-12 w-12 rounded-full blur-xl ${isWoman ? "bg-rose-300/35" : "bg-sky-300/35"}`} />
        <AccountAvatar name={name} photo={player?.accountId ? photos[player.accountId] : undefined} accountId={player?.accountId} fallbackColor={color} size={34} className="relative z-10" />
        <span className="relative z-10 min-w-0 text-left leading-tight"><span className="block truncate font-display text-xs font-bold leading-tight text-ink sm:text-sm">{name}</span><span className={`block truncate text-[10px] font-bold leading-tight sm:text-[11px] ${accent.label}`}>{CLASS_EMOJI[combatant.classId] ?? classDef.emoji} {classDef.name}</span></span>
      </div>

      {/* Área estável: o grid centraliza o canvas do PNG entre mini HUD e HP. */}
      <div className="relative z-10 h-[164px] w-full max-w-[220px] sm:h-[200px] sm:max-w-[265px]">
        <div className="pointer-events-none absolute inset-x-[17%] bottom-1 h-4 rounded-[100%] bg-slate-950/20 blur-md" />
        <div className="absolute inset-0 grid place-items-center">
          {/* Ação: somente transformações temporárias, todas retornam à escala 1. */}
          <motion.div
            className="relative grid h-full w-full min-w-0 place-items-center"
            initial={false}
            animate={dead
              ? { x: [0, -9, 8, -5, 0], y: [0, -2, 3, 11], rotate: [0, -2, 1, 5], scale: [1, 1.055, 0.985, 0.94], opacity: [1, 1, 0.76, 0.4] }
              : normalDamage
                ? { x: heavyDamage ? [0, -9, 9, -7, 7, 0] : [0, -5, 5, -3, 0], y: 0, rotate: 0, scale: heavyDamage ? [1, 1.045, 0.985, 1] : [1, 1.022, 1], opacity: 1 }
                : statusDamage
                  ? { x: [0, -3, 3, 0], y: 0, rotate: 0, scale: [1, 1.014, 1], opacity: 1 }
                  : evaded
                    ? { x: [0, facing === "right" ? 28 : -28, 0], y: 0, rotate: 0, scale: [1, 1.015, 1], opacity: [1, 0.42, 1] }
                    : healed
                      ? { x: 0, y: 0, rotate: 0, scale: [1, 1.04, 1], opacity: 1 }
                      : { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }}
            transition={{ duration: dead ? 1.05 : heavyDamage ? 0.62 : normalDamage ? 0.46 : statusDamage ? 0.36 : evaded ? 0.48 : healed ? 0.7 : 0.24, ease: "easeOut" }}
          >
            {/* Orientação: exclusivamente scaleX para a direção do combate. */}
            <div className={`grid h-full w-full min-w-0 place-items-center ${facing === "left" ? "-scale-x-100" : ""}`}>
              {/* Estado crítico: uma escala absoluta relativa à caixa-base do PNG. */}
              <motion.div className="grid h-full w-full min-w-0 place-items-center" initial={false} animate={criticalPulseActive ? { scale: [1, 1.065, 1] } : { scale: 1 }} transition={{ duration: 1.05, repeat: criticalPulseActive ? Infinity : 0, ease: "easeInOut" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <motion.img src={spriteSource(combatant, appearance)} alt="" className={`${SPRITE_BASE_SIZE} absolute left-1/2 top-0 z-10 max-w-none shrink-0 -translate-x-1/2 place-self-center object-contain drop-shadow-[0_8px_11px_rgba(15,23,42,0.30)]`} style={{ imageRendering: "pixelated" }} animate={{ filter: spriteFilter }} transition={{ duration: tookRealDamage ? 0.42 : criticalPulseActive ? 1.05 : 0.35, times: spriteFilterTimes, repeat: criticalPulseActive ? Infinity : 0, ease: "easeOut" }} />
                {statusTickEvents.map((event, index) => {
                  const status = statusKindForEvent(event);
                  return <motion.img key={`sprite-status-flash-${eventsKey}-${index}-${status}`} src={spriteSource(combatant, appearance)} alt="" className={`pointer-events-none absolute left-1/2 top-1/2 ${SPRITE_BASE_SIZE} z-20 max-w-none shrink-0 -translate-x-1/2 -translate-y-1/2 object-contain`} style={{ imageRendering: "pixelated", filter: DAMAGE_FLASH_FILTER[status] }} initial={{ opacity: 0 }} animate={{ opacity: [0, 0.94, 0.94, 0] }} transition={{ delay: 0.38 + index * 0.18, duration: 0.34, times: [0, 0.22, 0.58, 1], ease: "easeOut" }} />;
                })}
              </motion.div>
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {blocked && <motion.span key={`block-${eventsKey}`} className="pointer-events-none absolute left-1/2 top-[22%] z-20 -translate-x-1/2 text-4xl drop-shadow-[0_0_12px_rgba(125,211,252,0.9)]" initial={{ scale: 0.65, opacity: 0 }} animate={{ scale: [0.65, 1.12, 1], opacity: [0, 0.95, 0] }} transition={{ duration: 0.68 }}>🛡️</motion.span>}
        </AnimatePresence>

        <AnimatePresence>{statusTickEvents.map((event, index) => <StatusEffectBurst key={`${eventsKey}-${index}-${event.status ?? event.cardId}`} event={event} index={index} eventsKey={eventsKey} onStart={() => markEffectVisible(`status-${eventsKey}-${index}`)} onComplete={() => markEffectComplete(`status-${eventsKey}-${index}`)} />)}</AnimatePresence>

        <AnimatePresence>{fullHealUsed && <motion.div key={`full-heal-hearts-${eventsKey}`} className="pointer-events-none absolute -inset-x-3 -top-4 bottom-0 z-30">{Array.from({ length: 12 }, (_, index) => { const x = ((index * 29) % 86) + 7; const y = 76 - ((index * 11) % 22); const scale = 0.75 + (index % 4) * 0.12; return <motion.span key={index} className="absolute text-xl leading-none drop-shadow-[0_4px_10px_rgba(190,24,93,0.35)] sm:text-2xl" style={{ left: `${x}%`, top: `${y}%` }} initial={{ opacity: 0, scale: 0.2, y: 8, rotate: -15 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.2, scale * 1.22, scale, scale * 0.9], y: [-2, -18 - (index % 4) * 4, -42 - (index % 5) * 6, -58 - (index % 3) * 8], x: [index % 2 ? -4 : 4, (index % 3 - 1) * 12, index % 2 ? 8 : -8, 0], rotate: [-15, 8, -5, 0] }} transition={{ delay: index * 0.045, duration: 1.15 + (index % 3) * 0.08, ease: "easeOut" }}>❤️</motion.span>; })}</motion.div>}</AnimatePresence>
        <AnimatePresence>{dead && <motion.div key={`death-skull-${eventsKey}`} className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><motion.div className="absolute h-24 w-24 rounded-full bg-red-950/20 blur-xl" initial={{ scale: 0.25, opacity: 0 }} animate={{ scale: [0.25, 1.45, 1.08], opacity: [0, 0.78, 0.28] }} transition={{ duration: 0.9, ease: "easeOut" }} /><motion.span className="relative text-7xl leading-none drop-shadow-[0_0_16px_rgba(127,29,29,0.5)] drop-shadow-[0_5px_10px_rgba(0,0,0,0.4)] sm:text-8xl" initial={{ opacity: 0, scale: 0.12, rotate: -32, y: 16 }} animate={{ opacity: [0, 1, 1, 0.9], scale: [0.12, 1.42, 1.04, 1.12], rotate: [-32, 9, -4, 0], y: [16, -6, 1, 0] }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}>💀</motion.span></motion.div>}</AnimatePresence>
        <AnimatePresence>{floats.map((floating, index) => <motion.span key={`${eventsKey}-${index}`} className={`pointer-events-none absolute left-1/2 top-[calc(100%+5rem)] z-40 -translate-x-1/2 whitespace-nowrap font-display text-xs font-extrabold drop-shadow-[0_2px_3px_rgba(255,255,255,0.8)] sm:top-[28%] sm:text-sm ${floating.tone === "heal" ? "text-emerald-700" : floating.tone === "crit" ? "text-red-700" : floating.tone === "damage" ? "text-rose-600" : "text-slate-700"}`} onAnimationStart={() => markEffectVisible(`float-${eventsKey}-${index}`)} onAnimationComplete={() => markEffectComplete(`float-${eventsKey}-${index}`)} initial={{ opacity: 0, y: 4, scale: 0.75 }} animate={{ opacity: [0, 1, 1, 0], y: -48, scale: floating.tone === "crit" ? [0.75, 1.25, 1] : 1 }} transition={{ duration: floating.tone === "crit" ? 1.8 : 1.5, delay: index * 0.12, ease: "easeOut" }}>{floating.text}</motion.span>)}</AnimatePresence>
      </div>

      {hasBadges && <div className="z-20 mt-9 flex max-w-full flex-wrap justify-center gap-1 px-1 text-[8px] font-bold sm:mt-1 sm:text-[9px]">{activeStatuses.map(([status, turns]) => <motion.span key={status} initial={{ opacity: 0, y: -4, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`rounded-full border px-1.5 py-0.5 shadow-sm ${STATUS[status].chip}`}>{STATUS[status].emoji} {STATUS[status].label} {turns}</motion.span>)}{extraBadges.map((badge) => <motion.span key={badge.text} initial={{ opacity: 0, y: -4, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`rounded-full border px-1.5 py-0.5 shadow-sm ${badge.className}`}>{badge.emoji} {badge.text}</motion.span>)}{showChosenBadge && <span className="rounded-full border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-emerald-800 shadow-sm">✓ Escolhido</span>}</div>}

      <motion.div className={`relative z-20 ${activeStatuses.length > 0 || extraBadges.length > 0 || showChosenBadge ? "mt-1.5" : effectLaneVisible ? "mt-20" : "mt-9"} w-full max-w-[200px] rounded-xl border bg-slate-950/70 p-1 shadow-[inset_0_1px_2px_rgba(255,255,255,0.20),0_5px_12px_rgba(15,23,42,0.16)] sm:mt-1.5 sm:max-w-[230px] ${criticalHp ? "border-red-400/80" : "border-surface/80"}`} initial={false} animate={tookRealDamage ? { x: heavyDamage ? [0, -5, 5, -3, 0] : [0, -3, 3, -1, 0], scale: [1, 1.045, 0.99, 1], boxShadow: ["inset 0 1px 2px rgba(255,255,255,0.20), 0 5px 12px rgba(15,23,42,0.16)", "inset 0 0 0 1px rgba(254,202,202,0.86), 0 0 24px rgba(248,113,113,0.70)", "inset 0 1px 2px rgba(255,255,255,0.20), 0 5px 12px rgba(15,23,42,0.16)"] } : healed ? { x: 0, scale: [1, 1.09, 1], boxShadow: "inset 0 1px 2px rgba(255,255,255,0.20), 0 5px 12px rgba(15,23,42,0.16)" } : criticalPulseActive ? { x: 0, scale: [1, 1.03, 1], boxShadow: ["inset 0 1px 2px rgba(255,255,255,0.20), 0 5px 12px rgba(15,23,42,0.16)", "inset 0 0 0 1px rgba(248,113,113,0.86), 0 0 20px rgba(248,113,113,0.62)", "inset 0 1px 2px rgba(255,255,255,0.20), 0 5px 12px rgba(15,23,42,0.16)" ] } : { x: 0, scale: 1, boxShadow: "inset 0 1px 2px rgba(255,255,255,0.20), 0 5px 12px rgba(15,23,42,0.16)" }} transition={{ duration: tookRealDamage ? 0.56 : healed ? 0.65 : criticalPulseActive ? 1.05 : 0.24, repeat: criticalPulseActive ? Infinity : 0, ease: "easeOut" }}>
        <div className="mb-1 flex items-center justify-between px-1 text-[8px] font-extrabold uppercase tracking-[0.12em] text-white/80"><span className="flex items-center gap-1"><Heart size={9} fill="currentColor" /> HP</span><span className="tabular-nums text-white">{Math.max(0, combatant.hp)} / {combatant.maxHp}</span></div>
        <div className="relative h-3 overflow-hidden rounded-md border border-white/15 bg-black/35 shadow-inner sm:h-3.5"><motion.div className="absolute inset-0 shadow-[0_0_10px_rgba(255,255,255,0.32)]" initial={false} animate={{ scaleX: hpPct / 100, opacity: dead ? 0.15 : 1 }} style={{ transformOrigin: "left", backgroundImage: healthGradient }} transition={{ duration: tookRealDamage ? 0.72 : 0.55, ease: [0.22, 1, 0.36, 1] }} />{tookRealDamage && <motion.div key={`hp-flash-${eventsKey}`} className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/90 via-rose-100/85 to-white/70" initial={{ opacity: 0, scaleX: 0.2 }} animate={{ opacity: [0, 0.92, 0.34, 0], scaleX: [0.2, 1, 1, 1] }} transition={{ duration: 0.48, ease: "easeOut" }} style={{ transformOrigin: "left" }} />}{criticalPulseActive && <motion.div className="pointer-events-none absolute inset-0 bg-red-400/65 mix-blend-screen" initial={false} animate={{ opacity: [0.04, 0.72, 0.04] }} transition={{ duration: 1.05, repeat: Infinity, ease: "easeInOut" }} />}<div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-white/20" /></div>
      </motion.div>
    </section>
  );
}
