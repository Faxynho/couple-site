"use client";

import Image from "next/image";
import { CSSProperties } from "react";
import { ArrowLeft, FlaskConical, Heart } from "lucide-react";
import { formatIdleNumber } from "@/lib/formatIdleNumber";
import { KittyClickActivity } from "@/lib/idleTypes";
import { IdleTab } from "../IdleBottomNav";
import { NavConstellationIcon, NavHomeIcon, NavRelicIcon, NavStatsIcon, NavUpgradeIcon, PlaqueBow, WorldIcon } from "./KittyDevIcons";
import { TrophyIcon } from "../KittyIcons";
import { OrnateCorners } from "./KittyDevExtras";
import styles from "./KittyDev.module.css";

/** HUD superior do Mundo da Hello Kitty (voltar, título do mundo, botão de ilhas, saldo/produção e combo). */
export function KittyDevHud({ variant, worldName, relicAsset, relicName, balance, production, activity, showCombo, rush, onBack, onWorlds }: {
  variant: "world" | "map";
  worldName: string;
  relicAsset?: string;
  relicName?: string;
  balance: number;
  production: number;
  activity?: KittyClickActivity;
  showCombo: boolean;
  rush: boolean;
  onBack: () => void;
  onWorlds: () => void;
}) {
  const comboLeft = Math.max(0, 2 - (Date.now() - (activity?.lastClickAt ?? 0)) / 1_000);
  const combo = comboLeft > 0 ? 1 + Math.min(1.2, ((activity?.comboClicks ?? 1) - 1) * .03) : 1;
  const energy = Math.max(0, Math.min(1, (combo - 1) / 1.2));
  const filled = Math.round(energy * 8);
  const comboStyle = { "--combo-duration": `${2.25 - energy * .95}s` } as CSSProperties;
  const statsBlock = <div className={`${styles.stats} ${variant === "map" ? styles.statsInline : ""} ${rush ? styles.statsRush : ""}`}>
    <div className={styles.stat}><Image className={styles.statIcon} src="/idle/icons/game-money.webp" alt="" width={48} height={48} /><span>Saldo</span><strong>{formatIdleNumber(balance)}</strong></div>
    <div className={styles.statGap} aria-hidden="true" />
    <div className={styles.stat}><Image className={styles.statIcon} src="/idle/icons/production.webp" alt="" width={48} height={48} /><span>Produção</span><strong>{formatIdleNumber(production)}/s</strong></div>
  </div>;
  if (variant === "map") {
    return <header className={`${styles.hud} ${styles.hudMap}`}>
      <button type="button" className={styles.roundBtn} onClick={onBack} aria-label="Voltar"><ArrowLeft size={24} strokeWidth={3.4} /></button>
      {statsBlock}
    </header>;
  }
  return <>
    <header className={styles.hud}>
      <button type="button" className={styles.roundBtn} onClick={onBack} aria-label="Voltar"><ArrowLeft size={24} strokeWidth={3.4} /></button>
      <div className={styles.plaque}>
        <PlaqueBow className={styles.plaqueBow} />
        <h1 className={styles.plaqueTitle}>{worldName}</h1>
      </div>
      <button type="button" className={`${styles.roundBtn} ${styles.worldBtn}`} onClick={onWorlds} aria-label="Escolher outro mundo" title="Escolher outro mundo"><WorldIcon /></button>
    </header>
    {relicAsset && <span className={styles.relicSlot} title={relicName} aria-label={`Relíquia ${relicName ?? ""}`}><Image src={relicAsset} alt="" width={60} height={60} sizes="58px" /></span>}
    {statsBlock}
    {showCombo && <div className={`${styles.combo} ${energy > .6 ? styles.comboHot : ""}`} style={comboStyle} aria-live="off">
      <span className={styles.comboHeart}><Heart size={12} fill="currentColor" strokeWidth={0} /></span>
      <span className={styles.comboLabel}>Combo</span>
      <span className={styles.comboBar} aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} data-on={index < filled ? "yes" : "no"} />)}</span>
      <span className={styles.comboValue}>x{combo.toFixed(1)}</span>
    </div>}
  </>;
}

const TABS: Array<{ id: IdleTab; label: string; icon: typeof NavHomeIcon }> = [
  { id: "home", label: "Início", icon: NavHomeIcon },
  { id: "upgrades", label: "Personagens", icon: NavUpgradeIcon },
  { id: "relics", label: "Relíquias", icon: NavRelicIcon },
  { id: "achievements", label: "Conquistas", icon: TrophyIcon },
  { id: "statistics", label: "Estatísticas", icon: NavStatsIcon },
];

/** Menu inferior redesenhado do Mundo da Hello Kitty. A aba DEV só aparece no ambiente de testes. */
export function KittyDevNav({ active, onChange, rush, ornate = false, showDevTab = false }: { active: IdleTab; onChange: (tab: IdleTab) => void; rush: boolean; ornate?: boolean; showDevTab?: boolean }) {
  return <nav className={`${styles.nav} ${rush ? styles.navRush : ""} ${ornate ? styles.ornate : ""}`} aria-label="Navegação do jogo idle">
    {ornate && <OrnateCorners compact />}
    {TABS.map((tab) => {
      const Icon = tab.icon;
      const on = active === tab.id;
      return <button key={tab.id} type="button" className={`${styles.navBtn} ${on ? styles.navBtnActive : ""}`} onClick={() => onChange(tab.id)} aria-current={on ? "page" : undefined}>
        <span className={styles.navTile}><Icon /></span>
        <span className={styles.navLabel}>{tab.label}</span>
      </button>;
    })}
    {showDevTab && <button type="button" className={`${styles.navBtn} ${active === "dev" ? styles.navBtnActive : ""}`} onClick={() => onChange("dev")} aria-current={active === "dev" ? "page" : undefined}>
      <span className={styles.navTile}><FlaskConical size={22} color="#7a45a8" /></span>
      <span className={styles.navLabel}>DEV</span>
    </button>}
  </nav>;
}

/** Botão acima do centro do menu que abre as constelações do mundo atual. */
export function KittyConstellationButton({ onOpen, available }: { onOpen: () => void; available: number }) {
  return <button type="button" className={styles.constBtn} onClick={onOpen} aria-label="Abrir constelações deste mundo" title="Constelações">
    <NavConstellationIcon />
    {available > 0 && <span className={styles.constBadge} aria-label={`${available} constelações com melhoria disponível`}>{available}</span>}
  </button>;
}

export type PurchaseModeValue = 1 | 10 | "max";
const MODE_CYCLE: PurchaseModeValue[] = [1, 10, "max"];

/** Seletor x1 / x10 / Máx. em forma de círculo pequeno na borda direita do painel (toque para alternar). */
export function KittyModeBubble({ value, onChange, awake }: { value: PurchaseModeValue; onChange: (value: PurchaseModeValue) => void; awake: boolean }) {
  const label = value === "max" ? "Máx" : `x${value}`;
  return <button type="button" className={`${styles.modeBubble} ${awake ? styles.modeBubbleAwake : ""}`} onClick={() => onChange(MODE_CYCLE[(MODE_CYCLE.indexOf(value) + 1) % MODE_CYCLE.length])}
    aria-label={`Quantidade de níveis: ${value === "max" ? "máximo" : value}. Toque para alternar`}>{label}</button>;
}
