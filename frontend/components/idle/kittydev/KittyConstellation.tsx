"use client";

import Image from "next/image";
import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, LockKeyhole, Star } from "lucide-react";
import { kittyDevBuyConstellation } from "@/lib/idleApi";
import { IdleModeSnapshot, IdleSnapshot } from "@/lib/idleTypes";
import { formatIdleNumber } from "@/lib/formatIdleNumber";
import { playSoundEffect } from "@/lib/sound";
import { GoldSparkle } from "./KittyDevIcons";
import { STONE_ICON, charactersOfWorld, constellationShape, spriteFor } from "./kittyDevHelpers";
import styles from "./KittyDev.module.css";

function starPoints(cx: number, cy: number, outer: number) {
  return Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? outer * .45 : outer; const a = (-90 + i * 36) * Math.PI / 180; return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`; }).join(" ");
}

/** Tela de constelações do mundo: uma constelação de 5 estrelas por personagem, evoluída com Pedras Estelares. */
export default function KittyConstellation({ data, world, worldName, onClose, onSnapshot }: {
  data: IdleModeSnapshot; world: number; worldName: string; onClose: () => void; onSnapshot: (snapshot: IdleSnapshot) => void;
}) {
  const kd = data.kittyDev!;
  const roster = useMemo(() => charactersOfWorld(data.items, world), [data.items, world]);
  const [selectedId, setSelectedId] = useState<string>(() => (roster.find((item) => item.purchased) ?? roster[0])?.definition.id ?? "");
  const [pickedLevel, setPickedLevel] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ key: number; x: number; y: number } | null>(null);
  const [fresh, setFresh] = useState<{ key: number; level: number } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const item = roster.find((entry) => entry.definition.id === selectedId) ?? roster[0];
  const info = item ? kd.characters[item.definition.id] : undefined;

  if (!item || !info) return <div className={styles.cst}><div className={styles.cstTop}><button type="button" className={styles.roundBtn} onClick={onClose} aria-label="Voltar"><ArrowLeft size={24} strokeWidth={3.4} /></button></div><p className={styles.cstEmpty}>Nenhum personagem neste mundo ainda.</p></div>;

  const shape = constellationShape(info.index);
  const nodes = shape.nodes;
  const nextLevel = info.stars < 5 ? info.stars + 1 : null;
  const shownLevel = pickedLevel ?? nextLevel ?? 5;
  const sprite = spriteFor(item, kd);
  const requirement = nextLevel ? info.starRequirements[nextLevel - 1] : 0;
  const levelOk = item.level >= requirement;
  const canBuy = Boolean(item.purchased && nextLevel && info.nextStarCost !== null && kd.stones >= info.nextStarCost && levelOk && !busy);
  const stonesMissing = info.nextStarCost !== null ? Math.max(0, info.nextStarCost - kd.stones) : 0;

  const buy = async () => {
    if (!canBuy || !nextLevel) return;
    setBusy(true); setError(null);
    try {
      const next = await kittyDevBuyConstellation(item.definition.id);
      onSnapshot(next);
      playSoundEffect("idleStar");
      const [x, y] = nodes[nextLevel - 1];
      setBurst({ key: Date.now(), x, y });
      setFresh({ key: Date.now(), level: nextLevel });
      setPickedLevel(null);
      timers.current.push(window.setTimeout(() => setBurst(null), 950));
      if (nextLevel === 5) {
        setBanner(item.definition.id === "hello-kitty" ? "Constelação completa! Despertar liberado na aba Melhorias" : "Constelação completa!");
        timers.current.push(window.setTimeout(() => setBanner(null), 3_600));
        playSoundEffect("idleAchievement");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível evoluir agora.");
    } finally { setBusy(false); }
  };

  const unlockedNodes = (level: number) => level <= info.stars;
  const link = (a: number, b: number, on: boolean, draw: boolean) => {
    const [x1, y1] = nodes[a]; const [x2, y2] = nodes[b];
    return <line key={`${a}-${b}`} className={`${styles.cstLine} ${on ? styles.cstLineOn : ""} ${draw ? styles.cstLineDraw : ""}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
  };

  return <div className={styles.cst} role="dialog" aria-label={`Constelações de ${worldName}`}>
    <span className={styles.cstTwinkle} aria-hidden="true" />
    <div className={styles.cstTop}>
      <button type="button" className={styles.roundBtn} onClick={onClose} aria-label="Voltar para o mundo"><ArrowLeft size={24} strokeWidth={3.4} /></button>
      <div className={styles.cstTitle}><small>Constelações</small><h2>{worldName}</h2></div>
      <div className={styles.stonePill} aria-label={`${kd.stones} Pedras Estelares`}><Image src={STONE_ICON} alt="" width={64} height={64} />{formatIdleNumber(kd.stones)}</div>
    </div>
    <div className={styles.cstTabs} role="tablist" aria-label="Personagens do mundo">
      {roster.map((entry) => {
        const entryInfo = kd.characters[entry.definition.id];
        const on = entry.definition.id === item.definition.id;
        return <button key={entry.definition.id} type="button" role="tab" aria-selected={on} aria-label={`${entry.definition.name}: ${entryInfo.stars} de 5 estrelas`}
          className={`${styles.cstTab} ${on ? styles.cstTabOn : ""} ${entry.purchased ? "" : styles.cstTabLocked}`} onClick={() => { setSelectedId(entry.definition.id); setPickedLevel(null); setError(null); }}>
          <span className={styles.cstTabArt}><Image src={spriteFor(entry, kd).src} alt="" fill sizes="64px" /></span>
          {!entry.purchased && <LockKeyhole className={styles.cstTabLockIcon} size={18} aria-hidden="true" />}
          <span className={styles.cstTabStars} aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={9} fill={index < entryInfo.stars ? "#ffd45a" : "rgba(190,175,255,.35)"} strokeWidth={0} />)}</span>
        </button>;
      })}
    </div>
    <div className={styles.cstStage}>
      <div className={styles.cstHero}>
        <div className={styles.cstPortrait}><Image src={sprite.src} alt={item.definition.name} fill sizes="90px" /></div>
        <div className={styles.cstHeroText}>
          <h3>{item.definition.name}</h3>
          <p>{item.purchased
            ? <>Nível <b>{item.level}</b> · próxima pedra no nível <b>{info.nextMilestoneLevel}</b> (+<b>{formatIdleNumber(info.stoneYieldEffective)}</b>)</>
            : "Desbloqueie este personagem para evoluir a constelação."}</p>
          <p>Bônus ativos: <b>x{info.productionMultiplier.toFixed(2)}</b> produção · <b>x{info.clickMultiplier.toFixed(2)}</b> clique</p>
        </div>
      </div>
      <div className={styles.cstCanvasWrap}>
        <svg className={styles.cstCanvas} viewBox="0 0 100 100" role="group" aria-label={`Constelação de ${item.definition.name}`}>
          {nodes.slice(1).map((_, index) => link(index, index + 1, unlockedNodes(index + 2), fresh?.level === index + 2))}
          {shape.loop && link(4, 0, unlockedNodes(5), fresh?.level === 5)}
          {nodes.map(([x, y], index) => {
            const level = index + 1;
            const on = unlockedNodes(level);
            const next = level === nextLevel && item.purchased;
            return <g key={level} role="button" tabIndex={0} aria-label={`Estrela ${level}: ${on ? "desbloqueada" : next ? "disponível" : "bloqueada"}`}
              className={`${styles.cstNode} ${on ? styles.cstNodeOn : next ? styles.cstNodeNext : styles.cstNodeOff} ${shownLevel === level ? styles.cstNodeSel : ""}`}
              onClick={() => setPickedLevel(level)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setPickedLevel(level); } }}>
              <circle cx={x} cy={y} r="9" fill="transparent" />
              <circle className={styles.cstNodeRing} cx={x} cy={y} r="7.2" />
              <polygon className={styles.cstNodeStar} points={starPoints(x, y, 5.6)} strokeLinejoin="round" />
              <text className={styles.cstNodeNum} x={x} y={y + 9.8}>{level}</text>
            </g>;
          })}
        </svg>
        {burst && <GoldSparkle key={burst.key} className={styles.cstBurst} style={{ left: `${burst.x}%`, top: `${burst.y}%` } as CSSProperties} aria-hidden="true" />}
        {banner && <p className={styles.cstToast} role="status">{banner}</p>}
      </div>
      <div className={styles.cstPanel}>
        <div className={styles.cstLevels}>
          {Array.from({ length: 5 }, (_, index) => {
            const level = index + 1;
            const done = level <= info.stars;
            return <button key={level} type="button" onClick={() => setPickedLevel(level)} aria-pressed={shownLevel === level}
              className={`${styles.cstLevel} ${done ? styles.cstLevelDone : ""} ${level === nextLevel ? styles.cstLevelNext : ""} ${shownLevel === level ? styles.cstLevelSel : ""}`}>
              <Star fill="currentColor" strokeWidth={0} aria-hidden="true" />
              <span>Nível {level} · {info.starBonuses[index]}<small style={{ display: "block", opacity: .75, fontSize: ".58rem" }}>{done || item.level >= info.starRequirements[index] ? "Requisito cumprido" : `Requer personagem no nível ${info.starRequirements[index]}`}</small></span>
              <span className={styles.cstCostTag}>{done ? <Check size={14} strokeWidth={3.4} aria-label="Concluído" /> : <><Image src={STONE_ICON} alt="" width={32} height={32} />{info.starCosts[index]}</>}</span>
            </button>;
          })}
        </div>
        {nextLevel
          ? <button type="button" className={styles.cstBuy} disabled={!canBuy} onClick={() => void buy()}>
              {!item.purchased ? "Personagem bloqueado" : <>
                <span>Evoluir para o nível {nextLevel}</span><Image src={STONE_ICON} alt="" width={64} height={64} /><span>{info.nextStarCost}</span>
              </>}
            </button>
          : <p className={styles.cstDone}>Constelação completa!{info.awakening && !info.awakening.awakened ? " Despertar liberado na aba Melhorias." : ""}</p>}
        {nextLevel && item.purchased && !levelOk && <p style={{ marginTop: ".4rem", color: "#ffd9a0", fontSize: ".68rem", fontWeight: 850, textAlign: "center" }}>Suba {item.definition.name} até o nível {requirement} para evoluir (agora {item.level})</p>}
        {nextLevel && item.purchased && levelOk && stonesMissing > 0 && <p style={{ marginTop: ".4rem", color: "#cdbfff", fontSize: ".66rem", fontWeight: 800, textAlign: "center" }}>Faltam {formatIdleNumber(stonesMissing)} Pedras Estelares · cada 10 níveis de personagem rendem pedras</p>}
        {error && <p role="alert" style={{ marginTop: ".4rem", color: "#ffb3c8", fontSize: ".72rem", fontWeight: 850, textAlign: "center" }}>{error}</p>}
      </div>
    </div>
  </div>;
}
