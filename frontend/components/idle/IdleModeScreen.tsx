"use client";

import Image from "next/image";
import { CSSProperties, TouchEvent, useEffect, useMemo, useRef, useState } from "react";
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

const SCENE_NAMES: Record<IdleModeId, string[]> = {
  farm: ["Vale das Flores", "Vila da Colheita", "Mirante Dourado"],
  kitty: ["Sala dos Abraços", "Cantinho Encantado", "Sótão das Estrelas"],
};

const FARM_POSITIONS: CSSProperties[][] = [
  [{ left: "-2%", top: "51%", width: "47%" }, { left: "57%", top: "48%", width: "42%" }, { left: "52%", top: "66%", width: "46%" }, { left: "2%", top: "66%", width: "43%" }],
  [{ left: "0%", top: "50%", width: "43%" }, { left: "57%", top: "47%", width: "42%" }, { left: "3%", top: "66%", width: "43%" }, { left: "55%", top: "67%", width: "44%" }],
  [{ left: "-2%", top: "45%", width: "61%" }, { left: "39%", top: "59%", width: "62%" }],
];

const KITTY_POSITIONS: CSSProperties[][] = [
  [{ left: "26%", top: "37%", width: "47%" }, { left: "57%", top: "55%", width: "42%" }, { left: "1%", top: "60%", width: "45%" }, { left: "43%", top: "68%", width: "49%" }],
  [{ left: "4%", top: "42%", width: "40%" }, { left: "56%", top: "42%", width: "40%" }, { left: "4%", top: "65%", width: "40%" }, { left: "55%", top: "65%", width: "40%" }],
  [{ left: "4%", top: "53%", width: "48%" }, { left: "44%", top: "48%", width: "56%" }],
];

type ClickBurst = { id: number; left: number; top: number; reward: number };

export default function IdleModeScreen({ mode }: { mode: IdleModeId }) {
  const router = useRouter();
  const [tab, setTab] = useState<IdleTab>("home");
  const [scene, setScene] = useState<0 | 1 | 2>(0);
  const [showOfflineReward, setShowOfflineReward] = useState(false);
  const [achievementPopup, setAchievementPopup] = useState<IdleAchievementSnapshot | null>(null);
  const previousAchievements = useRef<Set<string> | null>(null);
  const { snapshot, error, loading, displayedBalance, busyItemId, act, clickItem } = useIdleGame(mode);
  const data = snapshot?.modes[mode];
  const farm = mode === "farm";
  const title = farm ? "Fazendinha" : "Mundo da Hello Kitty";
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
    if (!previousAchievements.current) {
      previousAchievements.current = completed;
      return;
    }
    const unlocked = data.achievements.find((item) => completed.has(item.id) && !previousAchievements.current?.has(item.id));
    previousAchievements.current = completed;
    if (!unlocked) return;
    setAchievementPopup(unlocked);
    playSoundEffect("idleAchievement");
    const timer = window.setTimeout(() => setAchievementPopup(null), 4_600);
    return () => window.clearTimeout(timer);
  }, [data]);

  if (loading || !snapshot || !data) return <main className={styles.page}><div className={styles.loading}>Carregando {title}…</div></main>;

  return (
    <main className={`${styles.page} ${farm ? styles.farmTheme : styles.kittyTheme}`}>
      <div className={styles.background} key={background} style={{ backgroundImage: `url(${background})` }} aria-hidden="true" />
      <div className={styles.sceneShade} aria-hidden="true" />
      <IdleHeader title={tab === "home" ? title : tab === "upgrades" ? "Melhorias" : "Conquistas"} subtitle={tab === "home" ? SCENE_NAMES[mode][scene] : tab === "upgrades" ? "Compre e evolua para render mais" : "Complete objetivos e ganhe recompensas"} coins={snapshot.globalCoins} onBack={() => router.push("/cantinho")} />

      {tab === "home" && <HomeScene mode={mode} data={data} balance={displayedBalance} scene={scene} onSceneChange={setScene} onClickItem={clickItem} />}
      {tab === "upgrades" && (farm ? <FarmUpgrades data={data} balance={displayedBalance} busyItemId={busyItemId} act={act} /> : <KittyCarousel data={data} balance={displayedBalance} busyItemId={busyItemId} act={act} />)}
      {tab === "achievements" && <Achievements data={data} snapshot={snapshot} />}

      {showOfflineReward && snapshot.offlineReward?.mode === mode && <div className={styles.toast}>Enquanto vocês estavam fora: +{formatIdleNumber(snapshot.offlineReward.amount)}</div>}
      {error && <p className={styles.error} role="alert"><span>!</span>{error}</p>}
      {achievementPopup && <AchievementPopup achievement={achievementPopup} onClose={() => setAchievementPopup(null)} />}
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
  const [pressed, setPressed] = useState<string | null>(null);
  const purchased = data.items.filter((item) => item.purchased && item.definition.scene === scene);
  const positions = mode === "farm" ? FARM_POSITIONS[scene] : KITTY_POSITIONS[scene];
  const addBurst = async (event: React.MouseEvent<HTMLButtonElement>, item: IdleItemSnapshot) => {
    const rect = event.currentTarget.closest(`.${styles.scene}`)?.getBoundingClientRect();
    setPressed(item.definition.id);
    window.setTimeout(() => setPressed(null), 260);
    playSoundEffect("idlePop");
    const reward = await onClickItem(item.definition.id);
    if (!reward || !rect) return;
    const id = Date.now() + Math.random();
    setBursts((current) => [...current.slice(-7), { id, left: event.clientX - rect.left, top: event.clientY - rect.top, reward }]);
    window.setTimeout(() => setBursts((current) => current.filter((burst) => burst.id !== id)), 950);
  };
  return (
    <section className={styles.scene} aria-label={mode === "farm" ? "Cenário da Fazendinha" : "Sala dos personagens"}>
      <BalancePill balance={balance} production={data.totalProduction} />
      <div className={styles.sceneLabel}>{SCENE_NAMES[mode][scene]}<span>{scene + 1}/3</span></div>
      {purchased.length === 0 && <div className={styles.emptySceneHint}><Sparkles size={18} />{scene === 0 ? `Compre ${mode === "farm" ? "a Horta" : "Hello Kitty"} na aba Melhorias` : "Compre um item deste cenário para vê-lo aqui"}</div>}
      {purchased.map((item) => {
        const localIndex = item.definition.unlockOrder - (scene === 0 ? 0 : scene === 1 ? 4 : 8);
        const position = positions[localIndex] ?? positions[0];
        return <button type="button" key={item.definition.id} className={`${mode === "farm" ? styles.producer : styles.character} ${pressed === item.definition.id ? styles.clickedItem : ""}`} style={{ ...position, animationDelay: `${item.definition.unlockOrder * -.31}s` }} onClick={(event) => void addBurst(event, item)} aria-label={`Coletar com ${item.definition.name}`}><Image src={item.definition.asset} alt={item.definition.name} fill sizes="52vw" /></button>;
      })}
      {bursts.map((burst) => <span key={burst.id} className={styles.clickBurst} style={{ left: burst.left, top: burst.top }}><GameStatIcon type="money" />+{formatIdleNumber(burst.reward)}</span>)}
      <SceneNavigation mode={mode} data={data} scene={scene} onChange={onSceneChange} />
    </section>
  );
}

function SceneNavigation({ mode, data, scene, onChange }: { mode: IdleModeId; data: IdleModeSnapshot; scene: 0 | 1 | 2; onChange: (scene: 0 | 1 | 2) => void }) {
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

type ActionProps = { data: IdleModeSnapshot; balance: number; busyItemId: string | null; act: (itemId: string, action: "buy" | "upgrade") => Promise<boolean> };

function FarmUpgrades({ data, balance, busyItemId, act }: ActionProps) {
  return <section className={styles.content}><Summary balance={balance} production={data.totalProduction} /><h2 className={styles.sectionTitle}>Produtores<small>Melhore os desbloqueados e compre novos para aumentar sua renda.</small></h2><div className={styles.cardGrid}>{data.items.map((item) => <ItemCard key={item.definition.id} item={item} busy={busyItemId === item.definition.id} onAction={act} />)}</div></section>;
}

function ItemCard({ item, busy, onAction }: { item: IdleItemSnapshot; busy: boolean; onAction: ActionProps["act"] }) {
  const action = item.purchased ? "upgrade" : "buy";
  return <article className={`${styles.itemCard} ${!item.unlocked ? styles.locked : ""}`}>
    {!item.unlocked && <span className={styles.lockBadge}><LockKeyhole size={16} /></span>}
    <div className={styles.itemImage}><Image src={item.definition.asset} alt="" fill sizes="42vw" /></div><h3>{item.definition.name}</h3>
    <div className={styles.itemMeta}><span>{item.purchased ? `Nv. ${item.level}` : "Não comprado"}</span><span><GameStatIcon type="production" />+{formatIdleNumber(item.production)}/s</span></div>
    <p className={styles.price}><GameStatIcon type="money" /> {formatIdleNumber(item.nextCost)}</p>
    <button type="button" className={`${styles.actionButton} ${!item.purchased ? styles.buyButton : ""}`} disabled={!item.unlocked || busy} onClick={() => void onAction(item.definition.id, action)}>{busy ? "Aguarde…" : item.purchased ? "Melhorar" : item.unlocked ? "Comprar" : "Bloqueado"}</button>
  </article>;
}

function KittyCarousel({ data, balance, busyItemId, act }: ActionProps) {
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const dragXRef = useRef(0);
  const selected = data.items[index];
  const prestige = selected.definition.unlockOrder;
  const move = (direction: -1 | 1) => setIndex((current) => Math.max(0, Math.min(data.items.length - 1, current + direction)));
  const onTouchStart = (event: TouchEvent) => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; dragXRef.current = 0; setDragX(0); };
  const onTouchMove = (event: TouchEvent) => { if (!touchStart.current) return; const dx = event.touches[0].clientX - touchStart.current.x; const dy = event.touches[0].clientY - touchStart.current.y; if (Math.abs(dx) > Math.abs(dy)) { dragXRef.current = dx; setDragX(dx); } };
  const onTouchEnd = () => { const distance = dragXRef.current; if (distance < -45) move(1); else if (distance > 45) move(-1); touchStart.current = null; dragXRef.current = 0; setDragX(0); };
  return <section className={`${styles.content} ${styles.kittyContent}`}>
    <Summary balance={balance} production={data.totalProduction} /><div className={styles.swipeHint}>Arraste para conhecer a turma <span>↔</span></div>
    <div className={styles.carousel} data-prestige={prestige} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className={styles.prestigeBackdrop} /><div className={styles.prestigeRing} />
      <div className={styles.prestigeParticles} aria-hidden="true">{Array.from({ length: Math.min(10, 2 + prestige) }).map((_, particle) => <i key={particle} style={{ "--particle": particle } as CSSProperties} />)}</div>
      {data.items.map((item, itemIndex) => { const offset = itemIndex - index; const visible = Math.abs(offset) <= 1; return <div key={item.definition.id} className={`${styles.carouselCharacter} ${offset === 0 ? styles.carouselSelected : ""}`} style={{ left: `${50 + offset * 91}%`, opacity: visible ? (offset === 0 ? 1 : .58) : 0, transform: `translate3d(calc(-50% + ${offset === 0 ? dragX : dragX * .45}px), 0, 0) scale(${offset === 0 ? 1 : .66})`, pointerEvents: offset === 0 ? "auto" : "none" }}><Image src={item.definition.asset} alt={item.definition.name} fill sizes="76vw" priority={itemIndex === 0} /></div>; })}
      <div className={styles.carouselDots}>{data.items.map((item, dot) => <button key={item.definition.id} type="button" aria-label={`Ver ${item.definition.name}`} className={dot === index ? styles.carouselDotActive : ""} onClick={() => setIndex(dot)} />)}</div>
      <div className={styles.characterPanel}>
        <div className={styles.characterTitleRow}><span className={styles.prestigeMark}>{prestige >= 8 ? "✦✦✦" : prestige >= 5 ? "✦✦" : "✦"}</span><h2>{selected.definition.name}</h2><span className={styles.characterOrder}>{index + 1}/10</span></div>
        <div className={styles.characterStats}><span>{selected.purchased ? `Nível ${selected.level}` : selected.unlocked ? "Disponível" : "Bloqueado"}</span><span><GameStatIcon type="production" />{formatIdleNumber(selected.production)}/s</span></div>
        <button type="button" className={`${styles.actionButton} ${!selected.purchased ? styles.buyButton : ""}`} disabled={!selected.unlocked || busyItemId === selected.definition.id} onClick={() => void act(selected.definition.id, selected.purchased ? "upgrade" : "buy")}>{busyItemId === selected.definition.id ? "Aguarde…" : selected.purchased ? <>Melhorar <GameStatIcon type="money" /> {formatIdleNumber(selected.nextCost)}</> : selected.unlocked ? <>Comprar <GameStatIcon type="money" /> {formatIdleNumber(selected.nextCost)}</> : "Compre a personagem anterior"}</button>
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

function AchievementPopup({ achievement, onClose }: { achievement: IdleAchievementSnapshot; onClose: () => void }) {
  return <div className={styles.achievementOverlay} role="dialog" aria-label="Conquista alcançada" onClick={onClose}><div className={styles.achievementPopup}><span className={styles.achievementGlow} /><Sparkles className={styles.popupSparkleLeft} /><Sparkles className={styles.popupSparkleRight} /><Image src="/idle/icons/global-coin.webp" alt="" width={84} height={84} /><p>Conquista alcançada!</p><h2>{achievement.title}</h2><span className={styles.popupReward}>+{achievement.reward} moedas globais</span><small>Toque para fechar</small></div></div>;
}
