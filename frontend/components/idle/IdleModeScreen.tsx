"use client";

import Image from "next/image";
import { CSSProperties, MouseEvent, TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, LockKeyhole, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useIdleGame } from "@/hooks/useIdleGame";
import { formatIdleNumber } from "@/lib/formatIdleNumber";
import { playSoundEffect } from "@/lib/sound";
import { IdleAchievementSnapshot, IdleItemSnapshot, IdleModeId, IdleModeSnapshot, IdleSnapshot } from "@/lib/idleTypes";
import IdleBottomNav, { IdleTab } from "./IdleBottomNav";
import IdleHeader from "./IdleHeader";
import styles from "./IdleGame.module.css";

const SCENE_BACKGROUNDS: Record<IdleModeId, string[]> = {
  farm: ["/idle/backgrounds/farm.webp", "/idle/backgrounds/farm-2.webp", "/idle/backgrounds/farm-3.webp"],
  kitty: ["/idle/backgrounds/kitty-room.webp", "/idle/backgrounds/kitty-room-2.webp", "/idle/backgrounds/kitty-room-3.webp"],
};

// Composição manual sobre os espaços livres e planos de profundidade de cada cenário.
const FARM_POSITIONS: CSSProperties[][] = [
  [{ left: "-3%", top: "52%", width: "45%" }, { left: "56.7%", top: "33.3%", width: "41%" }, { left: "1.2%", top: "22.5%", width: "44%" }, { left: "56.7%", top: "50.9%", width: "42%" }],
  [{ left: "1%", top: "47%", width: "42%" }, { left: "60.9%", top: "31.7%", width: "40%" }, { left: "-1%", top: "16.6%", width: "45%" }, { left: "57%", top: "64%", width: "42%" }],
  [{ left: "24.9%", top: "43.3%", width: "57%" }, { left: "20.9%", top: "20.4%", width: "57%" }],
];

const KITTY_POSITIONS: CSSProperties[][] = [
  [{ left: "12.5%", top: "23.4%", width: "40%" }, { left: "47.3%", top: "22.9%", width: "39%" }, { left: "-5.7%", top: "39.7%", width: "43%" }, { left: "60.5%", top: "36.8%", width: "43%" }],
  [{ left: "15.7%", top: "17.7%", width: "40%" }, { left: "65%", top: "23.2%", width: "39%" }, { left: "-8.8%", top: "34.4%", width: "41%" }, { left: "66%", top: "40.1%", width: "41%" }],
  [{ left: "0.1%", top: "26.9%", width: "43%" }, { left: "53.3%", top: "25%", width: "51%" }],
];

const RARITY_ASSETS = [
  "/idle/rarity/tier-1-soft.webp",
  "/idle/rarity/tier-2-sparkle.webp",
  "/idle/rarity/tier-3-magic.webp",
  "/idle/rarity/tier-4-rare.webp",
  "/idle/rarity/tier-5-legendary.webp",
  "/idle/rarity/tier-6-celestial.webp",
];

const PARTICLES = [
  [14, 27, 7, -0.4, 3.2, -8], [77, 22, 9, -1.6, 3.8, 12], [24, 54, 6, -2.2, 3.4, 9],
  [85, 51, 8, -0.8, 4.2, -13], [11, 72, 10, -3.1, 4.5, 15], [70, 73, 7, -2.7, 3.3, -10],
  [38, 17, 8, -1.1, 3.7, 8], [59, 30, 11, -3.6, 4.7, -14], [36, 78, 7, -2, 3.1, 12],
  [91, 69, 6, -1.9, 4.1, -8], [53, 10, 8, -4.2, 4.8, 11], [18, 40, 9, -3.3, 3.9, -11],
  [48, 43, 12, -0.6, 4.6, 18], [7, 56, 8, -4.5, 3.5, -16], [81, 36, 11, -5.1, 4.4, 17],
  [63, 62, 13, -1.4, 5, -20], [31, 33, 9, -5.8, 3.7, 15], [46, 68, 12, -2.9, 4.9, -18],
] as const;

type ClickBurst = { id: number; left: number; top: number; reward: number };
type Celebration =
  | { key: string; type: "unlock"; item: IdleItemSnapshot; mode: IdleModeId }
  | { key: string; type: "achievement"; achievement: IdleAchievementSnapshot };

function rarityTier(order: number) {
  if (order <= 1) return 1;
  if (order <= 3) return 2;
  if (order <= 5) return 3;
  if (order <= 7) return 4;
  if (order === 8) return 5;
  return 6;
}

export default function IdleModeScreen({ mode }: { mode: IdleModeId }) {
  const router = useRouter();
  const [tab, setTab] = useState<IdleTab>("home");
  const [scene, setScene] = useState<0 | 1 | 2>(0);
  const [showOfflineReward, setShowOfflineReward] = useState(false);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const previousAchievements = useRef<Set<string> | null>(null);
  const previousOwned = useRef<Set<string> | null>(null);
  const { snapshot, error, loading, displayedBalance, busyItemId, pendingUpgrades, act, clickItem } = useIdleGame(mode);
  const data = snapshot?.modes[mode];
  const farm = mode === "farm";
  const modeTitle = farm ? "Fazendinha" : "Mundo da Hello Kitty";
  const sceneName = data?.scenes.find((item) => item.id === scene)?.name ?? modeTitle;
  const background = tab === "home" ? SCENE_BACKGROUNDS[mode][scene] : SCENE_BACKGROUNDS[mode][0];

  useEffect(() => {
    SCENE_BACKGROUNDS[mode].forEach((src) => {
      const preload = new window.Image();
      preload.src = src;
    });
  }, [mode]);

  useEffect(() => {
    if (snapshot?.offlineReward?.mode !== mode) return;
    setShowOfflineReward(true);
    const timer = window.setTimeout(() => setShowOfflineReward(false), 5_200);
    return () => window.clearTimeout(timer);
  }, [mode, snapshot?.offlineReward]);

  useEffect(() => {
    if (!data) return;
    const completed = new Set(data.achievements.filter((item) => item.completedAt).map((item) => item.id));
    const owned = new Set(data.items.filter((item) => item.purchased).map((item) => item.definition.id));
    if (!previousAchievements.current || !previousOwned.current) {
      previousAchievements.current = completed;
      previousOwned.current = owned;
      return;
    }
    const unlockedItems = data.items.filter((item) => owned.has(item.definition.id) && !previousOwned.current?.has(item.definition.id));
    const unlockedAchievements = data.achievements.filter((item) => completed.has(item.id) && !previousAchievements.current?.has(item.id));
    previousOwned.current = owned;
    previousAchievements.current = completed;
    if (!unlockedItems.length && !unlockedAchievements.length) return;
    setCelebrations((current) => [
      ...current,
      ...unlockedItems.map((item): Celebration => ({ key: `unlock-${item.definition.id}-${item.purchasedAt}`, type: "unlock", item, mode })),
      ...unlockedAchievements.map((achievement): Celebration => ({ key: `achievement-${achievement.id}-${achievement.completedAt}`, type: "achievement", achievement })),
    ]);
  }, [data, mode]);

  const activeCelebration = celebrations[0];
  useEffect(() => {
    if (!activeCelebration) return;
    playSoundEffect(activeCelebration.type === "unlock" ? "idleUnlock" : "idleAchievement");
    const timer = window.setTimeout(() => setCelebrations((current) => current.slice(1)), activeCelebration.type === "unlock" ? 4_400 : 3_900);
    return () => window.clearTimeout(timer);
  }, [activeCelebration]);

  if (loading || !snapshot || !data) return <main className={styles.page}><div className={styles.loading}>Carregando {modeTitle}…</div></main>;

  return (
    <main className={`${styles.page} ${farm ? styles.farmTheme : styles.kittyTheme}`}>
      <div className={styles.background} key={background} style={{ backgroundImage: `url(${background})` }} aria-hidden="true" />
      <div className={styles.sceneShade} aria-hidden="true" />
      <IdleHeader title={tab === "home" ? sceneName : tab === "upgrades" ? "Melhorias" : "Conquistas"} subtitle={tab === "home" ? modeTitle : tab === "upgrades" ? "Compre e evolua para render mais" : "Complete objetivos e ganhe recompensas"} coins={snapshot.globalCoins} onBack={() => router.push("/cantinho")} />

      {tab === "home" && <HomeScene mode={mode} data={data} balance={displayedBalance} scene={scene} onSceneChange={setScene} onClickItem={clickItem} />}
      {tab === "upgrades" && (farm
        ? <FarmUpgrades data={data} balance={displayedBalance} busyItemId={busyItemId} pendingUpgrades={pendingUpgrades} act={act} />
        : <KittyCarousel data={data} balance={displayedBalance} busyItemId={busyItemId} pendingUpgrades={pendingUpgrades} act={act} />)}
      {tab === "achievements" && <Achievements data={data} snapshot={snapshot} />}

      {showOfflineReward && snapshot.offlineReward?.mode === mode && <div className={styles.toast}>Enquanto vocês estavam fora: +{formatIdleNumber(snapshot.offlineReward.amount)}</div>}
      {error && <p className={styles.error} role="alert"><span>!</span>{error}</p>}
      {activeCelebration && <CelebrationPopup celebration={activeCelebration} onClose={() => setCelebrations((current) => current.slice(1))} />}
      <IdleBottomNav active={tab} onChange={setTab} />
    </main>
  );
}

function GameStatIcon({ type }: { type: "money" | "production" | "global" }) {
  const src = type === "money" ? "/idle/icons/game-money.webp" : type === "production" ? "/idle/icons/production.webp" : "/idle/icons/global-coin.webp";
  return <Image className={styles.statIcon} src={src} alt="" width={48} height={48} />;
}

function BalancePill({ balance, production }: { balance: number; production: number }) {
  return <div className={styles.statsPill}><div className={styles.stat}><GameStatIcon type="money" /><span>Saldo</span><strong>{formatIdleNumber(balance)}</strong></div><div className={styles.statDivider} /><div className={styles.stat}><GameStatIcon type="production" /><span>Produção</span><strong>{formatIdleNumber(production)}/s</strong></div></div>;
}

function HomeScene({ mode, data, balance, scene, onSceneChange, onClickItem }: { mode: IdleModeId; data: IdleModeSnapshot; balance: number; scene: 0 | 1 | 2; onSceneChange: (scene: 0 | 1 | 2) => void; onClickItem: (itemId: string) => Promise<number | null> }) {
  const [bursts, setBursts] = useState<ClickBurst[]>([]);
  const animations = useRef(new Map<string, Animation>());
  const burstTimers = useRef(new Set<number>());
  const purchased = data.items.filter((item) => item.purchased && item.definition.scene === scene);
  const positions = mode === "farm" ? FARM_POSITIONS[scene] : KITTY_POSITIONS[scene];

  useEffect(() => () => {
    animations.current.forEach((animation) => animation.cancel());
    burstTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const addBurst = async (event: MouseEvent<HTMLButtonElement>, item: IdleItemSnapshot) => {
    const button = event.currentTarget;
    const rect = button.closest(`.${styles.scene}`)?.getBoundingClientRect();
    const left = rect ? event.clientX - rect.left : 0;
    const top = rect ? event.clientY - rect.top : 0;
    animations.current.get(item.definition.id)?.cancel();
    const animation = button.animate([
      { transform: "translateY(0) scale(1) rotate(0deg)", filter: "brightness(1)" },
      { transform: "translateY(5px) scale(.88) rotate(-1.5deg)", filter: "brightness(1.12)", offset: .34 },
      { transform: "translateY(-7px) scale(1.1) rotate(1deg)", filter: "brightness(1.16)", offset: .68 },
      { transform: "translateY(0) scale(1) rotate(0deg)", filter: "brightness(1)" },
    ], { duration: 310, easing: "cubic-bezier(.2,.9,.25,1)" });
    animations.current.set(item.definition.id, animation);
    playSoundEffect("idlePop");
    const reward = await onClickItem(item.definition.id);
    if (!reward || !rect) return;
    const id = Date.now() + Math.random();
    setBursts((current) => [...current.slice(-9), { id, left, top, reward }]);
    const timer = window.setTimeout(() => {
      burstTimers.current.delete(timer);
      setBursts((current) => current.filter((burst) => burst.id !== id));
    }, 1_150);
    burstTimers.current.add(timer);
  };

  return (
    <section className={styles.scene} aria-label={mode === "farm" ? "Cenário da Fazendinha" : "Sala dos personagens"}>
      <BalancePill balance={balance} production={data.totalProduction} />
      <div className={styles.sceneLabel}>{data.scenes[scene].name}<span>{scene + 1}/3</span></div>
      {purchased.length === 0 && <div className={styles.emptySceneHint}><Sparkles size={18} />{scene === 0 ? `Compre ${mode === "farm" ? "a Horta" : "Hello Kitty"} na aba Melhorias` : "Compre um item deste cenário para vê-lo aqui"}</div>}
      {purchased.map((item) => {
        const localIndex = item.definition.unlockOrder - (scene === 0 ? 0 : scene === 1 ? 4 : 8);
        const position = positions[localIndex] ?? positions[0];
        return <button type="button" key={item.definition.id} className={mode === "farm" ? styles.producer : styles.character} style={{ ...position, animationDelay: `${item.definition.unlockOrder * -.31}s` }} onClick={(event) => void addBurst(event, item)} aria-label={`Coletar com ${item.definition.name}`}><Image src={item.definition.asset} alt={item.definition.name} fill sizes="52vw" /></button>;
      })}
      {bursts.map((burst) => <span key={burst.id} className={styles.clickBurst} style={{ left: burst.left, top: burst.top }}><GameStatIcon type="money" />+{formatIdleNumber(burst.reward)}</span>)}
      <SceneNavigation data={data} scene={scene} onChange={onSceneChange} />
    </section>
  );
}

function SceneNavigation({ data, scene, onChange }: { data: IdleModeSnapshot; scene: 0 | 1 | 2; onChange: (scene: 0 | 1 | 2) => void }) {
  const previous = scene > 0 ? (scene - 1) as 0 | 1 : null;
  const next = scene < 2 ? (scene + 1) as 1 | 2 : null;
  const nextUnlocked = next === null || Boolean(data.scenes.find((item) => item.id === next)?.unlocked);
  const unlockName = next === null ? "" : data.items.find((item) => item.definition.scene === next)?.definition.name ?? "item";
  return <div className={styles.sceneNavigation}>
    <button type="button" className={styles.sceneArrow} disabled={previous === null} onClick={() => previous !== null && onChange(previous)} aria-label="Cenário anterior"><ChevronLeft size={22} /></button>
    <div className={styles.sceneDots} aria-label={`Cenário ${scene + 1} de 3`}>{[0, 1, 2].map((dot) => <span key={dot} className={dot === scene ? styles.sceneDotActive : ""} />)}</div>
    <button type="button" className={`${styles.sceneArrow} ${!nextUnlocked ? styles.sceneArrowLocked : ""}`} disabled={next === null || !nextUnlocked} onClick={() => next !== null && nextUnlocked && onChange(next)} aria-label={nextUnlocked ? "Próximo cenário" : `Compre ${unlockName} para desbloquear`} title={!nextUnlocked ? `Compre ${unlockName} para desbloquear` : undefined}>{!nextUnlocked ? <LockKeyhole size={17} /> : <ChevronRight size={22} />}</button>
    {!nextUnlocked && <span className={styles.sceneLockText}>Compre {unlockName}</span>}
  </div>;
}

function Summary({ balance, production }: { balance: number; production: number }) {
  return <div className={styles.summary}><div className={styles.stat}><GameStatIcon type="money" /><span>Dinheiro interno</span><strong>{formatIdleNumber(balance)}</strong></div><div className={styles.stat}><GameStatIcon type="production" /><span>Produção/s</span><strong>{formatIdleNumber(production)}/s</strong></div></div>;
}

type ActionProps = { data: IdleModeSnapshot; balance: number; busyItemId: string | null; pendingUpgrades: Record<string, number>; act: (itemId: string, action: "buy" | "upgrade") => Promise<boolean> };

function FarmUpgrades({ data, balance, busyItemId, pendingUpgrades, act }: ActionProps) {
  return <section className={styles.content}><Summary balance={balance} production={data.totalProduction} /><h2 className={styles.sectionTitle}>Produtores<small>Melhore os desbloqueados e compre novos para aumentar sua renda.</small></h2><div className={styles.cardGrid}>{data.items.map((item) => <ItemCard key={item.definition.id} item={item} busy={busyItemId === item.definition.id} pending={pendingUpgrades[item.definition.id] ?? 0} onAction={act} />)}</div></section>;
}

function ItemCard({ item, busy, pending, onAction }: { item: IdleItemSnapshot; busy: boolean; pending: number; onAction: ActionProps["act"] }) {
  const action = item.purchased ? "upgrade" : "buy";
  return <article className={`${styles.itemCard} ${!item.purchased ? styles.locked : ""}`}>
    {!item.purchased && <span className={styles.lockBadge}>{item.unlocked ? "?" : <LockKeyhole size={16} />}</span>}
    <div className={styles.itemImage}><Image src={item.definition.asset} alt="" fill sizes="42vw" /></div><h3>{item.definition.name}</h3>
    <div className={styles.itemMeta}><span>{item.purchased ? `Nv. ${item.level}` : item.unlocked ? "Disponível" : "Bloqueado"}</span><span><GameStatIcon type="production" />+{formatIdleNumber(item.production)}/s</span></div>
    <p className={styles.price}><GameStatIcon type="money" /> {formatIdleNumber(item.nextCost)}</p>
    <button type="button" className={`${styles.actionButton} ${!item.purchased ? styles.buyButton : ""}`} disabled={!item.unlocked || (!item.purchased && busy)} onClick={() => void onAction(item.definition.id, action)}>{item.purchased ? <>Melhorar{pending > 0 && <span className={styles.pendingBadge}>+{pending}</span>}</> : busy ? "Comprando…" : item.unlocked ? "Comprar" : "Bloqueado"}</button>
  </article>;
}

function KittyCarousel({ data, balance, busyItemId, pendingUpgrades, act }: ActionProps) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const dragXRef = useRef(0);
  const selected = data.items[index];
  const prestige = selected.definition.unlockOrder;
  const tier = rarityTier(prestige);
  const particleCount = [2, 4, 6, 9, 13, 18][tier - 1];
  const move = (direction: -1 | 1) => setIndex((current) => Math.max(0, Math.min(data.items.length - 1, current + direction)));
  const onTouchStart = (event: TouchEvent) => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; dragXRef.current = 0; setDragX(0); };
  const onTouchMove = (event: TouchEvent) => { if (!touchStart.current) return; const dx = event.touches[0].clientX - touchStart.current.x; const dy = event.touches[0].clientY - touchStart.current.y; if (Math.abs(dx) > Math.abs(dy)) { dragXRef.current = dx; setDragX(dx); } };
  const onTouchEnd = () => { const distance = dragXRef.current; if (distance < -45) move(1); else if (distance > 45) move(-1); touchStart.current = null; dragXRef.current = 0; setDragX(0); };
  return <section className={`${styles.content} ${styles.kittyContent}`}>
    <Summary balance={balance} production={data.totalProduction} /><div className={styles.swipeHint}>Arraste para conhecer a turma <span>↔</span></div>
    <div className={styles.carousel} data-prestige={prestige} data-tier={tier} data-purchased={selected.purchased ? "yes" : "no"} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className={styles.prestigeBackdrop} />
      {data.items.map((item, itemIndex) => {
        const offset = itemIndex - index;
        if (Math.abs(offset) > 1) return null;
        const itemTier = rarityTier(item.definition.unlockOrder);
        const slideDrag = offset === 0 ? dragX : dragX * .4;
        const selectedOpacity = Math.min(1, .24 + item.definition.unlockOrder * .085);
        const sideOpacity = Math.min(.42, .14 + item.definition.unlockOrder * .03);
        return <span
          key={`rarity-${item.definition.id}`}
          className={`${styles.raritySlide} ${!item.purchased ? styles.raritySlideLocked : ""}`}
          data-tier={itemTier}
          aria-hidden="true"
          style={{
            "--rarity-opacity": offset === 0 ? selectedOpacity : sideOpacity,
            left: `${50 + offset * 104}%`,
            transform: `translate3d(calc(-50% + ${slideDrag}px), 0, 0) scale(${offset === 0 ? 1 : .59})`,
            backgroundImage: `url(${RARITY_ASSETS[itemTier - 1]})`,
          } as CSSProperties}
        />;
      })}
      <div className={styles.prestigeParticles} aria-hidden="true">{PARTICLES.slice(0, particleCount).map(([x, y, size, delay, duration, drift], particle) => <i key={particle} className={styles[["particleStar", "particleHeart", "particleOrb"][particle % 3]]} style={{ "--x": `${x}%`, "--y": `${y}%`, "--size": `${size}px`, "--delay": `${delay}s`, "--duration": `${duration}s`, "--drift": `${drift}px` } as CSSProperties} />)}</div>
      {data.items.map((item, itemIndex) => {
        const offset = itemIndex - index;
        const visible = Math.abs(offset) <= 1;
        if (!visible) return null;
        return <div key={item.definition.id} className={`${styles.carouselCharacter} ${offset === 0 ? styles.carouselSelected : ""} ${!item.purchased ? styles.carouselLocked : ""}`} style={{ left: `${50 + offset * 104}%`, opacity: visible ? (offset === 0 ? 1 : .48) : 0, transform: `translate3d(calc(-50% + ${offset === 0 ? dragX : dragX * .4}px), 0, 0) scale(${offset === 0 ? 1 : .59})`, pointerEvents: offset === 0 ? "auto" : "none" }}><Image src={item.definition.asset} alt={item.definition.name} fill sizes="78vw" priority={itemIndex === 0} /></div>;
      })}
      <div className={styles.carouselDots}>{data.items.map((item, dot) => <button key={item.definition.id} type="button" aria-label={`Ver ${item.definition.name}`} className={dot === index ? styles.carouselDotActive : ""} onClick={() => setIndex(dot)} />)}</div>
      <div className={styles.characterPanel} data-tier={tier}>
        <span className={styles.panelOrnament} style={{ backgroundImage: `url(${RARITY_ASSETS[tier - 1]})` }} aria-hidden="true" />
        <div className={styles.characterTitleRow}><span className={styles.prestigeMark}>{"✦".repeat(Math.min(3, Math.ceil(tier / 2)))}</span><h2>{selected.definition.name}</h2><span className={styles.characterOrder}>{index + 1}/10</span></div>
        <div className={styles.characterStats}><span>{selected.purchased ? `Nível ${selected.level}` : selected.unlocked ? "Disponível" : "Bloqueado"}</span><span><GameStatIcon type="production" />{formatIdleNumber(selected.production)}/s</span></div>
        <button type="button" className={`${styles.actionButton} ${!selected.purchased ? styles.buyButton : ""}`} disabled={!selected.unlocked || (!selected.purchased && busyItemId === selected.definition.id)} onClick={() => void act(selected.definition.id, selected.purchased ? "upgrade" : "buy")}>{selected.purchased ? <>Melhorar <GameStatIcon type="money" /> {formatIdleNumber(selected.nextCost)}{(pendingUpgrades[selected.definition.id] ?? 0) > 0 && <span className={styles.pendingBadge}>+{pendingUpgrades[selected.definition.id]}</span>}</> : busyItemId === selected.definition.id ? "Comprando…" : selected.unlocked ? <>Comprar <GameStatIcon type="money" /> {formatIdleNumber(selected.nextCost)}</> : "Compre a personagem anterior"}</button>
      </div>
    </div>
  </section>;
}

function Achievements({ data, snapshot }: { data: IdleModeSnapshot; snapshot: IdleSnapshot }) {
  const complete = data.achievements.filter((item) => item.completedAt).length;
  const earned = data.achievements.filter((item) => item.completedAt).reduce((sum, item) => sum + item.reward, 0);
  const itemById = useMemo(() => new Map(data.items.map((item) => [item.definition.id, item])), [data.items]);
  return <section className={styles.content}><div className={styles.achievementStats}><div className={styles.stat}><span>Concluídas</span><strong>{complete}</strong></div><div className={styles.stat}><span>Em andamento</span><strong>{data.achievements.length - complete}</strong></div><div className={styles.stat}><span>Moedas ganhas</span><strong>{earned}</strong></div></div>
    <h2 className={styles.sectionTitle}>Conquistas permanentes<small>Completadas uma única vez neste modo.</small></h2><div className={styles.achievementList}>{data.achievements.map((achievement) => <AchievementRow key={achievement.id} {...achievement} completed={Boolean(achievement.completedAt)} asset={achievement.iconItemId ? itemById.get(achievement.iconItemId)?.definition.asset : undefined} />)}</div>
    <h2 className={styles.sectionTitle}>Objetivos diários<small>Renovam todos os dias no horário de Brasília.</small></h2><div className={styles.achievementList}>{snapshot.objectives.daily.map((objective) => <AchievementRow key={objective.id} {...objective} completed={Boolean(objective.completedAt)} />)}</div>
    <h2 className={styles.sectionTitle}>Objetivos semanais<small>Metas maiores para construir juntos.</small></h2><div className={styles.achievementList}>{snapshot.objectives.weekly.map((objective) => <AchievementRow key={objective.id} {...objective} completed={Boolean(objective.completedAt)} />)}</div>
  </section>;
}

function AchievementRow({ title, description, reward, progress, target, completed, asset }: { title: string; description: string; reward: number; progress: number; target: number; completed: boolean; asset?: string }) {
  const percent = Math.min(100, target > 0 ? progress / target * 100 : 0);
  return <article className={styles.achievement}><div className={styles.achievementIcon}>{asset ? <Image src={asset} alt="" fill sizes="58px" /> : <GameStatIcon type="global" />}</div><div><h3>{title}</h3><p>{description}</p>{!completed && <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${percent}%` }} /></div>}</div><span className={`${styles.reward} ${completed ? styles.done : ""}`}>{completed ? <><Check size={15} /> Feita</> : <><GameStatIcon type="global" />+{reward}</>}</span></article>;
}

function CelebrationPopup({ celebration, onClose }: { celebration: Celebration; onClose: () => void }) {
  if (celebration.type === "unlock") {
    const noun = celebration.mode === "farm" ? "produtor" : "personagem";
    return <div className={styles.achievementOverlay} role="dialog" aria-label={`Novo ${noun} desbloqueado`} onClick={onClose}><div className={`${styles.achievementPopup} ${styles.unlockPopup}`}><span className={styles.unlockFlash} /><Sparkles className={styles.popupSparkleLeft} /><Sparkles className={styles.popupSparkleRight} /><div className={styles.unlockAsset}><Image src={celebration.item.definition.asset} alt={celebration.item.definition.name} fill sizes="180px" /></div><p>Novo {noun} desbloqueado!</p><h2>{celebration.item.definition.name}</h2><span className={styles.popupReward}><GameStatIcon type="production" /> {formatIdleNumber(celebration.item.production)}/s</span><small>Toque para continuar</small></div></div>;
  }
  return <div className={styles.achievementOverlay} role="dialog" aria-label="Conquista alcançada" onClick={onClose}><div className={styles.achievementPopup}><span className={styles.achievementGlow} /><Sparkles className={styles.popupSparkleLeft} /><Sparkles className={styles.popupSparkleRight} /><Image src="/idle/icons/global-coin.webp" alt="" width={92} height={92} /><p>Conquista alcançada!</p><h2>{celebration.achievement.title}</h2><span className={styles.popupReward}><GameStatIcon type="global" />+{celebration.achievement.reward} moedas globais</span><small>Toque para continuar</small></div></div>;
}
