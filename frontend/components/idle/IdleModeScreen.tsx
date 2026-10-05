"use client";

import Image from "next/image";
import { CSSProperties, KeyboardEvent, MouseEvent, TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowBigUp, ArrowUp, Check, ChevronLeft, Crown, ChevronRight, Clock3, LockKeyhole, Sparkles, Star, WandSparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useIdleGame } from "@/hooks/useIdleGame";
import { formatIdleNumber } from "@/lib/formatIdleNumber";
import { playSoundEffect } from "@/lib/sound";
import { GameEnvironment, IdleAchievementSnapshot, IdleItemSnapshot, IdleModeId, IdleModeSnapshot, IdleSnapshot, KittyDevSnapshot, RenewableObjectiveSnapshot } from "@/lib/idleTypes";
import IdleBottomNav, { IdleTab } from "./IdleBottomNav";
import IdleHeader from "./IdleHeader";
import IdleStatistics from "./IdleStatistics";
import IdleEventLayer from "./IdleEventLayer";
import IdleDevPanel from "./IdleDevPanel";
import { BowIcon, CalendarCheckIcon, CalendarHeartIcon, CalendarStarIcon, ControllerIcon, HeartIcon, MedalIcon, SparkleIcon, TrophyIcon } from "./KittyIcons";
import styles from "./IdleGame.module.css";
// Mecânicas experimentais — usadas SOMENTE quando environment === "dev" no Mundo da Hello Kitty.
import devStyles from "./kittydev/KittyDev.module.css";
import KittyConstellation from "./kittydev/KittyConstellation";
import { KittyConstellationButton, KittyDevHud, KittyDevNav } from "./kittydev/KittyDevChrome";
import KittyDevExtras, { AwakeEffects, AwakePanelCorners } from "./kittydev/KittyDevExtras";
import KittyWorldMap from "./kittydev/KittyWorldMap";
import { WORLDS_BG, spriteFor } from "./kittydev/kittyDevHelpers";
import { kittyDevSetWorld } from "@/lib/idleApi";

const SCENE_BACKGROUNDS: Record<IdleModeId, string[]> = {
  farm: ["/idle/backgrounds/farm.webp", "/idle/backgrounds/farm-2.webp", "/idle/backgrounds/farm-3.webp"],
  kitty: ["/idle/backgrounds/kitty-room.webp", ...[2, 3, 4, 5, 6, 7].map((number) => `/idle/backgrounds/kitty-scene-${number}.webp`)],
};

// Composição manual sobre os espaços livres e planos de profundidade de cada cenário.
const FARM_POSITIONS: CSSProperties[][] = [
  [{ left: "-3%", top: "52%", width: "45%" }, { left: "56.7%", top: "33.3%", width: "41%" }, { left: "1.2%", top: "22.5%", width: "44%" }, { left: "56.7%", top: "50.9%", width: "42%" }],
  [{ left: "1%", top: "47%", width: "42%" }, { left: "60.9%", top: "31.7%", width: "40%" }, { left: "-1%", top: "16.6%", width: "45%" }, { left: "57%", top: "64%", width: "42%" }],
  [{ left: "24.9%", top: "43.3%", width: "57%" }, { left: "20.9%", top: "20.4%", width: "57%" }],
];

// Coordenadas no quadro do cenário (left/top/width). Edite a entrada pelo nome/ID.
// Cena 1: as quatro coordenadas originais foram mantidas exatamente.
export const KITTY_CHARACTER_PLACEMENTS: Record<string, { scene: number; p: number; name: string; left: string; top: string; width: string }> = {
  "hello-kitty": { scene: 0, p: 1, name: "Hello Kitty", left: "12.5%", top: "23.4%", width: "40%" },
  "dear-daniel": { scene: 0, p: 2, name: "Dear Daniel", left: "47.3%", top: "22.9%", width: "39%" },
  "my-melody": { scene: 0, p: 3, name: "My Melody", left: "-5.7%", top: "39.7%", width: "43%" },
  "mimmy": { scene: 0, p: 4, name: "Mimmy", left: "60.5%", top: "36.8%", width: "43%" },
  "cinnamoroll": { scene: 1, p: 5, name: "Cinnamoroll", left: "3%", top: "31%", width: "40%" },
  "pompompurin": { scene: 1, p: 6, name: "Pompompurin", left: "55%", top: "44%", width: "39%" },
  "cinnamoroll-blue-bow": { scene: 1, p: 7, name: "Cinnamoroll com laço azul", left: "5%", top: "47%", width: "40%" },
  "pochacco": { scene: 1, p: 8, name: "Pochacco", left: "46%", top: "58%", width: "39%" },
  "tiny-chum": { scene: 2, p: 9, name: "Tiny Chum", left: "4%", top: "48%", width: "40%" },
  "keroppi": { scene: 2, p: 10, name: "Keroppi", left: "55%", top: "27%", width: "40%" },
  "tuxedosam": { scene: 2, p: 11, name: "Tuxedosam", left: "5%", top: "27%", width: "40%" },
  "mocha": { scene: 2, p: 12, name: "Mocha", left: "55%", top: "48%", width: "40%" },
  "baku": { scene: 3, p: 13, name: "Baku", left: "3%", top: "50%", width: "40%" },
  "badtz-maru": { scene: 3, p: 14, name: "Badtz-Maru", left: "56%", top: "44%", width: "40%" },
  "chococat": { scene: 3, p: 15, name: "Chococat", left: "64%", top: "25%", width: "40%" },
  "kuromi": { scene: 3, p: 16, name: "Kuromi", left: "15%", top: "24%", width: "40%" },
  "my-sweet-piano": { scene: 4, p: 17, name: "My Sweet Piano", left: "1%", top: "46%", width: "40%" },
  "charmmy-kitty": { scene: 4, p: 18, name: "Charmmy Kitty", left: "57%", top: "45%", width: "40%" },
  "hello-kitty-angel": { scene: 4, p: 19, name: "Hello Kitty anjo", left: "4%", top: "61%", width: "40%" },
  "kuromi-angel": { scene: 4, p: 20, name: "Kuromi anjo", left: "55%", top: "61%", width: "40%" },
  "my-melody-dark-angel": { scene: 5, p: 21, name: "My Melody anjo noturno", left: "3%", top: "50%", width: "35%" },
  "hello-kitty-gala": { scene: 5, p: 22, name: "Hello Kitty de gala", left: "31%", top: "30%", width: "44%" },
  "kuromi-celestial": { scene: 5, p: 23, name: "Kuromi celestial", left: "59%", top: "45%", width: "44%" },
  "little-twin-stars": { scene: 6, p: 24, name: "Little Twin Stars: Kiki e Lala", left: "17%", top: "24%", width: "62%" },
};

const RARITY_ASSETS = [
  "/idle/rarity/tier-1-v2.webp",
  "/idle/rarity/tier-2-v2.webp",
  "/idle/rarity/tier-3-v2.webp",
  "/idle/rarity/tier-4-v2.webp",
  "/idle/rarity/tier-5-legendary.webp",
  "/idle/rarity/tier-6-celestial.webp",
];
const RARITY_COLORS = [
  ["#e983a6", "rgba(233,131,166,.22)"],
  ["#ec94c6", "rgba(236,148,198,.27)"],
  ["#b38ce6", "rgba(179,140,230,.31)"],
  ["#8e83e6", "rgba(142,131,230,.36)"],
  ["#dc91d4", "rgba(220,145,212,.42)"],
  ["#e8ba6f", "rgba(232,186,111,.5)"],
] as const;

const PARTICLES = [
  [14, 27, 7, -0.4, 3.2, -8], [77, 22, 9, -1.6, 3.8, 12], [24, 54, 6, -2.2, 3.4, 9],
  [85, 51, 8, -0.8, 4.2, -13], [11, 72, 10, -3.1, 4.5, 15], [70, 73, 7, -2.7, 3.3, -10],
  [38, 17, 8, -1.1, 3.7, 8], [59, 30, 11, -3.6, 4.7, -14], [36, 78, 7, -2, 3.1, 12],
  [91, 69, 6, -1.9, 4.1, -8], [53, 10, 8, -4.2, 4.8, 11], [18, 40, 9, -3.3, 3.9, -11],
  [48, 43, 12, -0.6, 4.6, 18], [7, 56, 8, -4.5, 3.5, -16], [81, 36, 11, -5.1, 4.4, 17],
  [63, 62, 13, -1.4, 5, -20], [31, 33, 9, -5.8, 3.7, 15], [46, 68, 12, -2.9, 4.9, -18],
] as const;

const UPGRADE_PARTICLES = [
  ...PARTICLES,
  [5, 18, 7, -0.7, 3.1, -24], [94, 25, 9, -1.9, 3.5, 25], [8, 87, 8, -2.8, 3.2, -28],
  [93, 82, 10, -0.3, 3.7, 29], [22, 8, 6, -2.1, 2.9, -20], [75, 8, 8, -1.1, 3.3, 22],
  [4, 46, 9, -3.2, 3.6, -31], [96, 57, 7, -2.5, 3.0, 32], [42, 5, 10, -0.9, 3.8, -18],
  [58, 91, 9, -1.7, 3.4, 21],
] as const;

type ClickBurst = { id: number; left: number; top: number; reward: number; multiplier: number; rushMultiplier: number };
type PurchaseMode = 1 | 10 | "max";
type Celebration =
  | { key: string; type: "unlock"; item: IdleItemSnapshot; mode: IdleModeId }
  | { key: string; type: "achievement"; achievement: IdleAchievementSnapshot };

function rarityTier(order: number) {
  return Math.min(6, Math.floor(order / 4) + 1);
}

function lockedBrightness(order: number, furthestPurchased: number) {
  const distance = Math.max(1, order - furthestPurchased);
  return Math.max(.05, .3 - .25 * Math.pow((distance - 1) / 23, .72));
}

export default function IdleModeScreen({ mode, environment = "real" }: { mode: IdleModeId; environment?: GameEnvironment }) {
  const router = useRouter();
  const [tab, setTab] = useState<IdleTab>("home");
  const [scene, setScene] = useState(0);
  const [kittyIndex, setKittyIndex] = useState(0);
  const [showOfflineReward, setShowOfflineReward] = useState(false);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>(1);
  const previousAchievements = useRef<Set<string> | null>(null);
  const previousOwned = useRef<Set<string> | null>(null);
  const { snapshot, error, accountId, displayedBalance, busyItemId, pendingUpgrades, act, buyUpgrades, clickItem, milestone, upgradeRelic, applySnapshot } = useIdleGame(mode, environment, tab === "home");
  const data = snapshot?.modes[mode];
  const click10HomeActive = tab === "home" && (data?.clickBoost?.visualMultiplier ?? data?.clickBoost?.multiplier ?? 1) === 10;
  const farm = mode === "farm";
  const modeTitle = farm ? "Fazendinha" : "Mundo da Hello Kitty";
  // ----- Ambiente DEV (Hello Kitty): seleção de ilhas, constelações e despertar -----
  const dev = environment === "dev" && !farm;
  const kittyDev = dev ? data?.kittyDev : undefined;
  const [world, setWorld] = useState<number | null | undefined>(undefined);
  const [constellationOpen, setConstellationOpen] = useState(false);
  const [arrive, setArrive] = useState(false);
  const arriveTimer = useRef<number | null>(null);
  const requestedWorld = world === undefined ? kittyDev?.lastWorld ?? null : world;
  const activeWorld = dev && typeof requestedWorld === "number" && data?.scenes.find((item) => item.id === requestedWorld)?.unlocked ? requestedWorld : null;
  const sceneIndex = dev ? activeWorld ?? 0 : scene;
  const sceneName = data?.scenes.find((item) => item.id === sceneIndex)?.name ?? modeTitle;
  const background = dev && tab === "home" && activeWorld === null ? WORLDS_BG : tab === "home" ? SCENE_BACKGROUNDS[mode][sceneIndex] : SCENE_BACKGROUNDS[mode][0];
  const activeSceneRelic = !farm && tab === "home" ? data?.relics?.find((relic) => relic.definition.kind === "scene" && relic.definition.scene === sceneIndex && relic.level > 0) : undefined;
  const changeWorld = (next: number | null) => {
    setWorld(next);
    setConstellationOpen(false);
    if (arriveTimer.current) window.clearTimeout(arriveTimer.current);
    setArrive(next !== null);
    if (next !== null) arriveTimer.current = window.setTimeout(() => setArrive(false), 1_000);
    void kittyDevSetWorld(next).then(applySnapshot).catch(() => undefined);
  };
  useEffect(() => () => { if (arriveTimer.current) window.clearTimeout(arriveTimer.current); }, []);
  const selectedDevInfo = dev && !farm && tab === "upgrades" && data ? kittyDev?.characters[data.items[kittyIndex]?.definition.id ?? ""] : undefined;
  const selectedAwake = Boolean(selectedDevInfo?.awakening?.awakened);

  useEffect(() => {
    // On mobile only warm the next scenes; loading all seven together wastes bandwidth.
    SCENE_BACKGROUNDS[mode].slice(scene + 1, scene + 3).forEach((src) => {
      const preload = new window.Image();
      preload.src = src;
    });
  }, [mode, scene]);

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

  if (!snapshot || !data) return <main className={styles.page}><div className={styles.loading}>{error ?? `Carregando ${modeTitle}…`}</div></main>;

  return (
    <main className={`${styles.page} ${farm ? styles.farmTheme : styles.kittyTheme} ${environment === "dev" ? styles.devEnvironment : ""} ${dev ? devStyles.kd : ""} ${selectedAwake ? devStyles.awakeTheme : ""} ${data.productionBoost && data.productionBoost.expiresAt > Date.now() ? styles.productionBoostActive : ""} ${click10HomeActive ? styles.click10Active : ""}`}>
      <div className={styles.background} key={background} style={{ backgroundImage: `url(${background})` }} aria-hidden="true" />
      <div className={styles.sceneShade} aria-hidden="true" />
      {dev && tab === "home"
        ? <KittyDevHud variant={activeWorld === null ? "map" : "world"} worldName={sceneName} relicAsset={activeSceneRelic?.definition.asset} relicName={activeSceneRelic?.definition.name} balance={displayedBalance} production={data.effectiveProduction} activity={accountId ? data.clickActivity?.[accountId] : undefined} showCombo={data.items.some((item) => item.purchased && item.definition.scene === sceneIndex)} rush={click10HomeActive} onBack={() => router.push("/cantinho/dev")} onWorlds={() => changeWorld(null)} />
        : !farm && tab === "upgrades" && data.items[kittyIndex]
        ? <IdleHeader title={data.items[kittyIndex].definition.name} subtitle="" coins={snapshot.globalCoins} balance={displayedBalance} badge={<KittyLevelBadge item={data.items[kittyIndex]} awake={selectedAwake} />} onBack={() => router.push(environment === "dev" ? "/cantinho/dev" : "/cantinho")} />
        : <IdleHeader title={tab === "home" ? sceneName : tab === "upgrades" ? "Melhorias" : tab === "relics" ? "Relíquias" : tab === "achievements" ? "Conquistas" : tab === "statistics" ? "Estatísticas" : "Ferramentas DEV"} subtitle={tab === "home" ? modeTitle : tab === "upgrades" ? "Compre e evolua para render mais" : tab === "relics" ? "Pequenos encantos, grandes descobertas" : tab === "statistics" ? "Seu progresso em detalhes" : tab === "dev" ? "Ambiente isolado de testes" : "Complete objetivos e ganhe recompensas"} coins={snapshot.globalCoins} onBack={() => router.push(environment === "dev" ? "/cantinho/dev" : "/cantinho")} />}
      {activeSceneRelic && !dev && <span className={styles.sceneRelicBadge} title={activeSceneRelic.definition.name} aria-label={`Relíquia ${activeSceneRelic.definition.name} · nível ${activeSceneRelic.level}`}><Image src={activeSceneRelic.definition.asset} alt="" width={60} height={60} sizes="58px" /></span>}
      {environment === "dev" && <span className={`${styles.devBadge} ${dev && tab === "home" ? devStyles.devBadgeDock : ""}`}>MODO DEV</span>}

      {tab === "home" && (dev && activeWorld === null
        ? <KittyWorldMap names={data.scenes.map((item) => item.name)} unlocked={data.scenes.map((item) => item.unlocked)} current={typeof requestedWorld === "number" ? requestedWorld : null}
            lockedHint={(index) => `Compre ${data.items.find((item) => item.definition.scene === index)?.definition.name ?? "o personagem"} para liberar esta ilha`}
            onEnter={changeWorld} />
        : <HomeScene mode={mode} data={data} balance={displayedBalance} scene={sceneIndex} onSceneChange={setScene} onClickItem={clickItem} accountId={accountId} dev={dev} kittyDev={kittyDev} arrive={arrive} />)}
      {dev && tab === "home" && activeWorld !== null && !constellationOpen && <KittyConstellationButton onOpen={() => setConstellationOpen(true)} available={data.items.filter((item) => item.purchased && item.definition.scene === activeWorld && (kittyDev?.characters[item.definition.id]?.nextStarCost ?? Infinity) <= (kittyDev?.stones ?? 0)).length} />}
      {dev && constellationOpen && activeWorld !== null && kittyDev && <KittyConstellation data={data} world={activeWorld} worldName={sceneName} onClose={() => setConstellationOpen(false)} onSnapshot={applySnapshot} />}
      {tab === "upgrades" && (farm
        ? <FarmUpgrades data={data} balance={displayedBalance} busyItemId={busyItemId} pendingUpgrades={pendingUpgrades} act={act} buyUpgrades={buyUpgrades} purchaseMode={purchaseMode} onPurchaseModeChange={setPurchaseMode} />
        : <KittyCarousel data={data} balance={displayedBalance} busyItemId={busyItemId} pendingUpgrades={pendingUpgrades} act={act} buyUpgrades={buyUpgrades} purchaseMode={purchaseMode} onPurchaseModeChange={setPurchaseMode} index={kittyIndex} onIndexChange={setKittyIndex} onClickItem={(itemId) => clickItem(itemId, "upgrades")} dev={dev && kittyDev ? { kittyDev, onSnapshot: applySnapshot } : undefined} />)}
      {tab === "achievements" && (farm ? <Achievements data={data} snapshot={snapshot} /> : <KittyAchievements data={data} snapshot={snapshot} />)}
      {tab === "relics" && !farm && <RelicGallery data={data} balance={displayedBalance} busyItemId={busyItemId} onUpgrade={upgradeRelic} />}
      {tab === "statistics" && <IdleStatistics data={data} />}
      {tab === "dev" && environment === "dev" && <IdleDevPanel mode={mode} data={data} onSnapshot={applySnapshot} />}
      {accountId && <IdleEventLayer accountId={accountId} environment={environment} mode={mode} data={data} onSnapshot={applySnapshot} eventsEnabled={tab === "home"} />}
      {mode === "kitty" && tab === "home" && milestone && Date.now() - milestone.key < 1_500 && <div key={milestone.key} className={styles.eventImpact} data-event="money" role="status">+{Math.round(milestone.bonus).toLocaleString("pt-BR")}</div>}

      {showOfflineReward && snapshot.offlineReward?.mode === mode && <div className={styles.toast}>Enquanto vocês estavam fora: +{formatIdleNumber(snapshot.offlineReward.amount)}</div>}
      {error && <p className={styles.error} role="alert"><span>!</span>{error}</p>}
      {activeCelebration && <CelebrationPopup celebration={activeCelebration} onClose={() => setCelebrations((current) => current.slice(1))} />}
      {dev ? <KittyDevNav active={tab} onChange={setTab} rush={click10HomeActive} /> : <IdleBottomNav active={tab} onChange={setTab} dev={environment === "dev"} kitty={!farm} />}
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

function HomeScene({ mode, data, balance, scene, onSceneChange, onClickItem, accountId, dev = false, kittyDev, arrive = false }: { mode: IdleModeId; data: IdleModeSnapshot; balance: number; scene: number; onSceneChange: (scene: number) => void; onClickItem: (itemId: string) => Promise<number | null>; accountId: string | null; dev?: boolean; kittyDev?: KittyDevSnapshot; arrive?: boolean }) {
  const [bursts, setBursts] = useState<ClickBurst[]>([]);
  const animations = useRef(new Map<string, Animation>());
  const burstTimers = useRef(new Set<number>());
  const purchased = data.items.filter((item) => item.purchased && item.definition.scene === scene);
  const activity = accountId ? data.clickActivity?.[accountId] : undefined;
  const comboLeft = Math.max(0, 2 - (Date.now() - (activity?.lastClickAt ?? 0)) / 1_000);
  const combo = comboLeft > 0 ? 1 + Math.min(1.2, ((activity?.comboClicks ?? 1) - 1) * .03) : 1;
  const comboEnergy = Math.max(0, Math.min(1, (combo - 1) / 1.2));
  const comboMotion = {
    "--combo-energy": String(comboEnergy),
    "--combo-tilt": `${1.4 + comboEnergy * 4.8}deg`,
    "--combo-lift": `${.8 + comboEnergy * 2.8}px`,
    "--combo-duration": `${2.25 - comboEnergy * .95}s`,
    "--combo-scale": String(1 + comboEnergy * .075),
    "--combo-glow": `${10 + comboEnergy * 22}px`,
    "--combo-spark": `${.72 + comboEnergy * .52}rem`,
  } as CSSProperties;

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
    setBursts((current) => [...current.slice(-9), { id, left, top, reward, multiplier: data.clickMultiplier, rushMultiplier: data.clickBoost?.visualMultiplier ?? data.clickBoost?.multiplier ?? 1 }]);
    const timer = window.setTimeout(() => {
      burstTimers.current.delete(timer);
      setBursts((current) => current.filter((burst) => burst.id !== id));
    }, 1_150);
    burstTimers.current.add(timer);
  };

  return (
    <section className={`${styles.scene} ${arrive ? devStyles.worldArrive : ""}`} aria-label={mode === "farm" ? "Cenário da Fazendinha" : "Sala dos personagens"}>
      {!dev && <BalancePill balance={balance} production={data.effectiveProduction} />}
      {mode === "kitty" && !dev && purchased.length > 0 && <div className={styles.activityPanel} style={comboMotion} aria-live="off"><span className={styles.comboLabel}>Combo x{combo.toFixed(1)}</span></div>}
      {purchased.length === 0 && <div className={styles.emptySceneHint}><Sparkles size={18} />{scene === 0 ? `Compre ${mode === "farm" ? "a Horta" : "Hello Kitty"} na aba Melhorias` : "Compre um item deste cenário para vê-lo aqui"}</div>}
      {purchased.map((item) => {
        const localIndex = item.definition.unlockOrder - (scene === 0 ? 0 : scene === 1 ? 4 : 8);
        const position = mode === "farm" ? FARM_POSITIONS[scene][localIndex] : KITTY_CHARACTER_PLACEMENTS[item.definition.id];
        if (!position) return null;
        const sprite = dev ? spriteFor(item, kittyDev) : { src: item.definition.asset, awake: false };
        return <button type="button" key={item.definition.id} className={mode === "farm" ? styles.producer : styles.character} style={{ ...position, animationDelay: `${item.definition.unlockOrder * -.31}s` }} onClick={(event) => void addBurst(event, item)} aria-label={`Coletar com ${item.definition.name}`}>
          <Image className={sprite.awake ? `${devStyles.awakeImg} ${devStyles.awakeImgHome}` : undefined} src={sprite.src} alt={item.definition.name} fill sizes="42vw" />
          {sprite.awake && <AwakeEffects />}
        </button>;
      })}
      {bursts.map((burst) => <span key={burst.id} className={styles.clickBurst} data-rush={burst.rushMultiplier} style={{ left: burst.left, top: burst.top }}><GameStatIcon type="money" />+{formatIdleNumber(burst.reward)}{burst.multiplier > 1 && <small>x{burst.multiplier}</small>}</span>)}
      {!dev && <SceneNavigation data={data} scene={scene} onChange={onSceneChange} />}
    </section>
  );
}

function SceneNavigation({ data, scene, onChange }: { data: IdleModeSnapshot; scene: number; onChange: (scene: number) => void }) {
  const previous = scene > 0 ? scene - 1 : null;
  const next = scene < data.scenes.length - 1 ? scene + 1 : null;
  const nextUnlocked = next === null || Boolean(data.scenes.find((item) => item.id === next)?.unlocked);
  const unlockName = next === null ? "" : data.items.find((item) => item.definition.scene === next)?.definition.name ?? "item";
  return <div className={styles.sceneNavigation}>
    <button type="button" className={styles.sceneArrow} disabled={previous === null} onClick={() => previous !== null && onChange(previous)} aria-label="Cenário anterior"><ChevronLeft size={22} /></button>
    <div className={styles.sceneDots} aria-label={`Cenário ${scene + 1} de ${data.scenes.length}`}>{data.scenes.map((item) => <span key={item.id} className={item.id === scene ? styles.sceneDotActive : ""} />)}</div>
    <button type="button" className={`${styles.sceneArrow} ${!nextUnlocked ? styles.sceneArrowLocked : ""}`} disabled={next === null || !nextUnlocked} onClick={() => next !== null && nextUnlocked && onChange(next)} aria-label={nextUnlocked ? "Próximo cenário" : `Compre ${unlockName} para desbloquear`} title={!nextUnlocked ? `Compre ${unlockName} para desbloquear` : undefined}>{!nextUnlocked ? <LockKeyhole size={17} /> : <ChevronRight size={22} />}</button>
    {!nextUnlocked && <span className={styles.sceneLockText}>Compre {unlockName}</span>}
  </div>;
}

function Summary({ balance, production }: { balance: number; production: number }) {
  return <div className={styles.summary}><div className={styles.stat}><GameStatIcon type="money" /><span>Dinheiro interno</span><strong>{formatIdleNumber(balance)}</strong></div><div className={styles.stat}><GameStatIcon type="production" /><span>Produção/s</span><strong>{formatIdleNumber(production)}/s</strong></div></div>;
}

function RelicGallery({ data, balance, busyItemId, onUpgrade }: { data: IdleModeSnapshot; balance: number; busyItemId: string | null; onUpgrade: (id: string) => Promise<boolean> }) {
  const relics = data.relics ?? [];
  const [celebration, setCelebration] = useState<{ id: string; kind: "unlock" | "upgrade"; level: number; key: number } | null>(null);
  useEffect(() => {
    if (!celebration) return;
    const timer = window.setTimeout(() => setCelebration(null), 1_600);
    return () => window.clearTimeout(timer);
  }, [celebration]);
  const celebrateUpgrade = async (id: string, previousLevel: number) => {
    if (!await onUpgrade(id)) return;
    playSoundEffect(previousLevel === 0 ? "idleUnlock" : "idleAchievement");
    setCelebration({ id, kind: previousLevel === 0 ? "unlock" : "upgrade", level: previousLevel + 1, key: Date.now() });
  };
  return <section className={`${styles.content} ${styles.relicPage}`} aria-label="Relíquias da Hello Kitty">
    <Summary balance={balance} production={data.effectiveProduction} />
    <div className={styles.relicHero}><span className={styles.relicHeroMark}><WandSparkles size={23} /></span><div><small>COLEÇÃO ENCANTADA</small><h2>Pequenos tesouros, grandes magias</h2><p>Escolha entre ampliar uma cena, fortalecer seus toques ou encantar o mundo inteiro.</p></div><b>{relics.filter((relic) => relic.level > 0).length}/{relics.length}</b></div>
    <div className={styles.relicGrid}>{relics.map((relic) => {
      const { definition, level, unlocked, nextCost } = relic;
      const target = data.items[definition.unlockOrder]?.definition.name ?? "personagem";
      const kind = definition.kind === "scene" ? `CENA ${(definition.scene ?? 0) + 1}` : definition.kind === "click" ? "JOGO ATIVO" : "TODAS AS CENAS";
      const effect = celebration?.id === definition.id ? celebration : null;
      const maxed = unlocked && level >= definition.maxLevel;
      return <article key={definition.id} data-relic-id={definition.id} data-relic-phase={effect?.kind} data-relic-max={maxed ? "yes" : undefined} className={`${styles.relicCard} ${maxed ? styles.relicCardMax : ""} ${!unlocked ? styles.relicCardLocked : ""} ${definition.kind === "global" ? styles.relicCardGlobal : ""} ${effect ? effect.kind === "unlock" ? styles.relicCelebrateUnlock : styles.relicCelebrateUpgrade : ""}`}>
        <div className={styles.relicArt}><span className={styles.relicArtHalo} /><Image src={definition.asset} alt={unlocked ? definition.name : "Relíquia misteriosa"} fill sizes="(max-width: 600px) 42vw, 180px" />{!unlocked && <span className={styles.relicLock}><LockKeyhole size={23} /></span>}{maxed && <span className={styles.relicMaxFx} aria-hidden="true"><SparkleIcon className={`${styles.maxSpark} ${styles.maxSparkA}`} /><SparkleIcon className={`${styles.maxSpark} ${styles.maxSparkB}`} /><SparkleIcon className={`${styles.maxSpark} ${styles.maxSparkC}`} /><HeartIcon className={`${styles.maxHeart} ${styles.maxHeartA}`} /><HeartIcon className={`${styles.maxHeart} ${styles.maxHeartB}`} /></span>}{maxed && <span className={styles.relicMaxBadge}><Crown size={12} strokeWidth={2.6} aria-hidden="true" />Nível máximo</span>}</div>
        {effect && <span key={effect.key} className={styles.relicCelebration} role="status"><Sparkles size={17} />{effect.kind === "unlock" ? "Relíquia despertada!" : `Nível ${effect.level} encantado!`}</span>}
        <div className={styles.relicBody}><span className={styles.relicKind}>{kind}</span><h3>{unlocked ? definition.name : "Tesouro misterioso"}</h3><p>{unlocked ? definition.description : `Desbloqueie ${target} para revelar.`}</p>
          <div className={styles.relicLevels} aria-label={`Nível ${level} de ${definition.maxLevel}`}>{Array.from({ length: definition.maxLevel }, (_, index) => <span key={index} className={index < level ? styles.relicLevelFilled : ""} />)}</div>
          <div className={styles.relicEffect}><span>{level ? "Poder atual" : "Próximo poder"}</span><strong>x{level ? relic.multiplier : 2}</strong><small>{nextCost === null ? "máximo" : level ? `Próximo x${relic.multiplier + 1}` : "ao comprar"}</small></div>
          <button type="button" className={styles.relicBuy} disabled={!unlocked || nextCost === null || busyItemId === definition.id || (nextCost !== null && balance < nextCost)} onClick={() => void celebrateUpgrade(definition.id, level)}>{!unlocked ? <><LockKeyhole size={15} /> Bloqueada</> : nextCost === null ? "Poder máximo" : busyItemId === definition.id ? "Encantando…" : <>{level ? "Melhorar" : "Despertar"} · {formatIdleNumber(nextCost)}</>}</button>
        </div>
      </article>;
    })}</div>
  </section>;
}

type ActionProps = {
  data: IdleModeSnapshot;
  balance: number;
  busyItemId: string | null;
  pendingUpgrades: Record<string, number>;
  act: (itemId: string, action: "buy" | "upgrade") => Promise<boolean>;
  buyUpgrades: (itemId: string, count: PurchaseMode) => Promise<boolean>;
  purchaseMode: PurchaseMode;
  onPurchaseModeChange: (value: PurchaseMode) => void;
};

function PurchaseModePicker({ value, onChange }: { value: PurchaseMode; onChange: (value: PurchaseMode) => void }) {
  return <div className={styles.purchaseMode} role="group" aria-label="Quantidade de níveis">{([1, 10, "max"] as const).map((option) => <button key={String(option)} type="button" className={value === option ? styles.purchaseModeActive : ""} aria-pressed={value === option} onClick={() => onChange(option)}>{option === "max" ? "Máx." : `x${option}`}</button>)}</div>;
}

function FarmUpgrades({ data, balance, busyItemId, pendingUpgrades, act, buyUpgrades, purchaseMode, onPurchaseModeChange }: ActionProps) {
  return <section className={styles.content}><Summary balance={balance} production={data.effectiveProduction} /><PurchaseModePicker value={purchaseMode} onChange={onPurchaseModeChange} /><h2 className={styles.sectionTitle}>Produtores<small>Melhore os desbloqueados e compre novos para aumentar sua renda.</small></h2><div className={styles.cardGrid}>{data.items.map((item) => <ItemCard key={item.definition.id} item={item} busy={busyItemId === item.definition.id} pending={pendingUpgrades[item.definition.id] ?? 0} onAction={act} onUpgrade={buyUpgrades} purchaseMode={purchaseMode} />)}</div></section>;
}

function quoteFor(item: IdleItemSnapshot, mode: PurchaseMode) {
  return mode === 1 ? item.upgradeQuotes.one : mode === 10 ? item.upgradeQuotes.ten : item.upgradeQuotes.max;
}

function ItemCard({ item, busy, pending, onAction, onUpgrade, purchaseMode }: { item: IdleItemSnapshot; busy: boolean; pending: number; onAction: ActionProps["act"]; onUpgrade: ActionProps["buyUpgrades"]; purchaseMode: PurchaseMode }) {
  const quote = quoteFor(item, purchaseMode);
  return <article className={`${styles.itemCard} ${!item.purchased ? styles.locked : ""}`}>
    {!item.purchased && <span className={styles.lockBadge}>{item.unlocked ? "?" : <LockKeyhole size={16} />}</span>}
    <div className={styles.itemImage}><Image src={item.definition.asset} alt="" fill sizes="42vw" /></div><h3>{item.definition.name}</h3>
    <div className={styles.itemMeta}><span>{item.purchased ? `Nv. ${item.level}` : item.unlocked ? "Disponível" : "Bloqueado"}</span><span><GameStatIcon type="production" />+{formatIdleNumber(item.production)}/s</span></div>
    <p className={styles.price}><GameStatIcon type="money" /> {formatIdleNumber(item.purchased ? quote?.totalCost ?? item.nextCost : item.nextCost)}</p>
    <button type="button" className={`${styles.actionButton} ${!item.purchased ? styles.buyButton : ""}`} disabled={!item.unlocked || busy || (item.purchased && !quote)} onClick={() => void (item.purchased ? onUpgrade(item.definition.id, purchaseMode) : onAction(item.definition.id, "buy"))}>{item.purchased ? quote ? <>Melhorar x{quote.count}{pending > 0 && <span className={styles.pendingBadge}>+{pending}</span>}</> : "Saldo insuficiente" : busy ? "Comprando…" : item.unlocked ? "Comprar" : "Bloqueado"}</button>
  </article>;
}

/** Reduz a fonte do valor de produção quando o número é longo (ex.: 123,4Qa/s), sem cortar nada. */
function productionSize(text: string): "l" | "m" | "s" {
  const length = text.length + 2; // + "/s"
  return length <= 7 ? "l" : length <= 9 ? "m" : "s";
}

function KittyLevelBadge({ item, awake = false }: { item: IdleItemSnapshot; awake?: boolean }) {
  return <span className={`${styles.levelBadge} ${awake ? devStyles.awakeBadge : ""}`}>{item.purchased ? <>{awake ? <Crown size={13} fill="currentColor" strokeWidth={0} aria-hidden="true" /> : <Star size={13} fill="currentColor" strokeWidth={0} aria-hidden="true" />}Nível {item.level}</> : item.unlocked ? <><Sparkles size={13} aria-hidden="true" />Disponível</> : <><LockKeyhole size={12} aria-hidden="true" />Bloqueado</>}</span>;
}

function KittyCarousel({ data, balance, busyItemId, pendingUpgrades, act, buyUpgrades, purchaseMode, onPurchaseModeChange, index, onIndexChange, onClickItem, dev }: ActionProps & { index: number; onIndexChange: (index: number) => void; onClickItem: (itemId: string) => Promise<number | null>; dev?: { kittyDev: KittyDevSnapshot; onSnapshot: (snapshot: IdleSnapshot) => void } }) {
  const setIndex = (update: number | ((current: number) => number)) => onIndexChange(typeof update === "function" ? update(index) : update);
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const dragXRef = useRef(0);
  const pendingDragX = useRef(0);
  const dragFrame = useRef<number | null>(null);
  const upgradeCharacterAnimation = useRef<Animation | null>(null);
  const upgradeFlashAnimation = useRef<Animation | null>(null);
  const upgradeFlashRef = useRef<HTMLSpanElement>(null);
  const tapAnimation = useRef<Animation | null>(null);
  const tapTimers = useRef(new Set<number>());
  const lastDragDistance = useRef(0);
  const [bursts, setBursts] = useState<ClickBurst[]>([]);
  const selected = data.items[index];
  const devInfo = dev ? dev.kittyDev.characters[selected.definition.id] : undefined;
  const selectedAwake = Boolean(devInfo?.awakening?.awakened);
  const prestige = selected.definition.unlockOrder;
  const tier = rarityTier(prestige);
  const particleCount = selected.purchased
    ? prestige === 0
      ? 0
      : Math.min(28, tier === 1 ? Math.max(0, prestige - 1) : 4 + tier * 3 + (prestige % 4) * 2)
    : 0;
  const particleSpeed = [1, .92, .82, .72, .62, .54][tier - 1];
  const particleSpread = [1, 1.08, 1.24, 1.43, 1.68, 1.95][tier - 1];
  const particleLift = [34, 38, 44, 52, 61, 70][tier - 1];
  const furthestPurchased = data.items.reduce((order, item) => item.purchased ? Math.max(order, item.definition.unlockOrder) : order, -1);
  const move = (direction: -1 | 1) => setIndex((current) => Math.max(0, Math.min(data.items.length - 1, current + direction)));
  const paintDrag = (value: number) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.style.setProperty("--drag-main", `${value}px`);
    carousel.style.setProperty("--drag-side", `${value * .4}px`);
  };
  const queueDrag = (value: number) => {
    pendingDragX.current = value;
    if (dragFrame.current !== null) return;
    dragFrame.current = window.requestAnimationFrame(() => {
      dragFrame.current = null;
      paintDrag(pendingDragX.current);
    });
  };
  const resetDrag = (commitSwipe: boolean) => {
    const distance = dragXRef.current;
    lastDragDistance.current = Math.abs(distance);
    if (dragFrame.current !== null) {
      window.cancelAnimationFrame(dragFrame.current);
      dragFrame.current = null;
    }
    pendingDragX.current = 0;
    carouselRef.current?.setAttribute("data-dragging", "no");
    paintDrag(0);
    touchStart.current = null;
    dragXRef.current = 0;
    if (!commitSwipe) return;
    if (distance < -45) move(1);
    else if (distance > 45) move(-1);
  };
  const triggerUpgradeFeedback = () => {
    const character = carouselRef.current?.querySelector<HTMLElement>("[data-upgrade-character]");
    upgradeCharacterAnimation.current?.cancel();
    upgradeFlashAnimation.current?.cancel();

    playSoundEffect("idleUpgrade");
    if (character) {
      upgradeCharacterAnimation.current = character.animate([
        { transform: "translate3d(calc(-50% + var(--drag-main, 0px)), 0, 0) scale(1)", filter: "brightness(1) drop-shadow(0 10px 10px rgba(125,55,91,.12))" },
        { transform: "translate3d(calc(-50% + var(--drag-main, 0px)), -10px, 0) scale(1.12)", filter: "brightness(1.34) drop-shadow(0 8px 25px rgba(255,182,224,.7))", offset: .28 },
        { transform: "translate3d(calc(-50% + var(--drag-main, 0px)), 3px, 0) scale(.965)", filter: "brightness(1.16) drop-shadow(0 6px 20px rgba(243,170,215,.48))", offset: .58 },
        { transform: "translate3d(calc(-50% + var(--drag-main, 0px)), 0, 0) scale(1)", filter: "brightness(1) drop-shadow(0 10px 10px rgba(125,55,91,.12))" },
      ], { duration: 340, easing: "cubic-bezier(.18,.88,.22,1)" });
    }

    if (upgradeFlashRef.current) {
      upgradeFlashAnimation.current = upgradeFlashRef.current.animate([
        { opacity: 0, transform: "translate(-50%,-50%) scale(.68)" },
        { opacity: .95, transform: "translate(-50%,-50%) scale(1.02)", offset: .28 },
        { opacity: 0, transform: "translate(-50%,-50%) scale(1.25)" },
      ], { duration: 320, easing: "ease-out" });
    }
  };

  useEffect(() => () => {
    if (dragFrame.current !== null) window.cancelAnimationFrame(dragFrame.current);
    upgradeCharacterAnimation.current?.cancel();
    upgradeFlashAnimation.current?.cancel();
    tapAnimation.current?.cancel();
    tapTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  /** Toque no personagem da aba Melhorias: mesmo som, animação e "+dinheiro" da tela inicial, mas só o clique simples
   *  (o servidor ignora combo, marcos de 50 e eventos quando a origem é "upgrades"). */
  const tapCharacter = async (clientX: number, clientY: number, target: HTMLElement) => {
    if (!selected.purchased) return;
    if (lastDragDistance.current > 12) { lastDragDistance.current = 0; return; } // foi um arrasto para trocar de personagem
    const carousel = carouselRef.current;
    const rect = carousel?.getBoundingClientRect();
    const sprite = target.firstElementChild as HTMLElement | null; // a própria imagem do personagem (primeiro filho)
    tapAnimation.current?.cancel();
    // anima só a imagem: o contêiner já tem a respiração e as animações de melhoria rodando em `transform`
    tapAnimation.current = sprite?.animate?.([
      { transform: "translateY(0) scale(1) rotate(0deg)", filter: "brightness(1)" },
      { transform: "translateY(5px) scale(.9) rotate(-1.5deg)", filter: "brightness(1.12)", offset: .34 },
      { transform: "translateY(-7px) scale(1.08) rotate(1deg)", filter: "brightness(1.16)", offset: .68 },
      { transform: "translateY(0) scale(1) rotate(0deg)", filter: "brightness(1)" },
    ], { duration: 310, easing: "cubic-bezier(.2,.9,.25,1)" }) ?? null;
    playSoundEffect("idlePop");
    const reward = await onClickItem(selected.definition.id);
    if (!reward || !rect) return;
    const id = Date.now() + Math.random();
    const keyboard = clientX === 0 && clientY === 0;
    const left = keyboard ? rect.width / 2 : Math.max(24, Math.min(rect.width - 24, clientX - rect.left));
    const top = keyboard ? rect.height * .32 : Math.max(24, clientY - rect.top);
    setBursts((current) => [...current.slice(-9), { id, left, top, reward, multiplier: data.clickMultiplier, rushMultiplier: data.clickBoost?.visualMultiplier ?? data.clickBoost?.multiplier ?? 1 }]);
    const timer = window.setTimeout(() => {
      tapTimers.current.delete(timer);
      setBursts((current) => current.filter((burst) => burst.id !== id));
    }, 1_150);
    tapTimers.current.add(timer);
  };
  const onTouchStart = (event: TouchEvent) => {
    lastDragDistance.current = 0;
    touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    dragXRef.current = 0;
    pendingDragX.current = 0;
    paintDrag(0);
    carouselRef.current?.setAttribute("data-dragging", "yes");
  };
  const onTouchMove = (event: TouchEvent) => {
    if (!touchStart.current) return;
    const dx = event.touches[0].clientX - touchStart.current.x;
    const dy = event.touches[0].clientY - touchStart.current.y;
    if (Math.abs(dx) <= Math.abs(dy)) return;
    dragXRef.current = dx;
    queueDrag(dx);
  };
  const onTouchEnd = () => resetDrag(true);
  const onTouchCancel = () => resetDrag(false);
  return <section className={`${styles.content} ${styles.kittyContent}`}>
    <PurchaseModePicker value={purchaseMode} onChange={onPurchaseModeChange} />
    <div ref={carouselRef} className={`${styles.carousel} ${selectedAwake ? devStyles.awakeCarousel : ""}`} data-prestige={prestige} data-tier={tier} data-purchased={selected.purchased ? "yes" : "no"} data-dragging="no" style={{ "--prestige": RARITY_COLORS[tier - 1][0], "--prestige-soft": RARITY_COLORS[tier - 1][1] } as CSSProperties} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchCancel}>
      <div className={styles.prestigeBackdrop} />
      {data.items.map((item, itemIndex) => {
        const offset = itemIndex - index;
        if (Math.abs(offset) > 1) return null;
        const itemTier = rarityTier(item.definition.unlockOrder);
        const dragVariable = offset === 0 ? "var(--drag-main, 0px)" : "var(--drag-side, 0px)";
        return <span
          key={`rarity-${item.definition.id}`}
          className={`${styles.raritySlide} ${!item.purchased ? styles.raritySlideLocked : ""}`}
          data-tier={itemTier}
          aria-hidden="true"
          style={{
            left: `${50 + offset * 104}%`,
            transform: `translate3d(calc(-50% + ${dragVariable}), 0, 0) scale(${offset === 0 ? 1 : .59})`,
            backgroundImage: `url(${RARITY_ASSETS[itemTier - 1]})`,
          } as CSSProperties}
        />;
      })}
      <div className={styles.prestigeParticles} aria-hidden="true">{UPGRADE_PARTICLES.slice(0, particleCount).map(([x, y, size, delay, duration, drift], particle) => <i key={particle} className={styles[["particleStar", "particleHeart", "particleOrb"][particle % 3]]} style={{ "--x": `${x}%`, "--y": `${y}%`, "--size": `${Math.round(size * (1 + Math.max(0, tier - 2) * .055))}px`, "--delay": `${delay}s`, "--duration": `${Math.max(1.65, duration * particleSpeed).toFixed(2)}s`, "--drift": `${Math.round(drift * particleSpread)}px`, "--lift-mid": `${-Math.round(particleLift * .55)}px`, "--lift": `${-particleLift}px` } as CSSProperties} />)}</div>
      {data.items.map((item, itemIndex) => {
        const offset = itemIndex - index;
        const visible = Math.abs(offset) <= 1;
        if (!visible) return null;
        return <div key={item.definition.id} className={`${styles.carouselCharacter} ${offset === 0 ? styles.carouselSelected : ""} ${!item.purchased ? styles.carouselLocked : ""}`} data-upgrade-character={offset === 0 ? item.definition.id : undefined} {...(offset === 0 && item.purchased ? { role: "button", tabIndex: 0, "aria-label": `Coletar com ${item.definition.name}`, onClick: (event: MouseEvent<HTMLDivElement>) => void tapCharacter(event.clientX, event.clientY, event.currentTarget), onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); void tapCharacter(0, 0, event.currentTarget); } } } : {})} style={{ left: `${50 + offset * 104}%`, opacity: visible ? (offset === 0 ? 1 : .48) : 0, transform: `translate3d(calc(-50% + ${offset === 0 ? "var(--drag-main, 0px)" : "var(--drag-side, 0px)"}), 0, 0) scale(${offset === 0 ? 1 : .59})`, pointerEvents: offset === 0 ? "auto" : "none", "--locked-brightness": lockedBrightness(item.definition.unlockOrder, furthestPurchased) } as CSSProperties}>{(() => { const sprite = dev ? spriteFor(item, dev.kittyDev) : { src: item.definition.asset, awake: false }; return <><Image className={sprite.awake ? devStyles.awakeImg : undefined} src={sprite.src} alt={item.definition.name} fill sizes="78vw" priority={itemIndex === 0} />{sprite.awake && offset === 0 && <AwakeEffects />}</>; })()}{!item.purchased && <LockKeyhole className={styles.carouselLockIcon} size={28} aria-hidden="true" />}{offset === 0 && <span ref={upgradeFlashRef} className={styles.upgradeFlash} aria-hidden="true" />}</div>;
      })}
      <div className={styles.panelStack}>
        <div className={styles.carouselDots}>{data.items.map((item, dot) => <button key={item.definition.id} type="button" aria-label={`Ver ${item.definition.name}`} className={dot === index ? styles.carouselDotActive : ""} onClick={() => setIndex(dot)} />)}</div>
        <div className={`${styles.characterPanel} ${selectedAwake ? devStyles.awakePanel : ""}`} data-tier={tier}>
          {selectedAwake && <AwakePanelCorners />}
          <div className={styles.panelFx} aria-hidden="true">
            <BowIcon className={styles.fxBow} />
            <SparkleIcon className={`${styles.fxSpark} ${styles.fxSparkA}`} />
            <SparkleIcon className={`${styles.fxSpark} ${styles.fxSparkB}`} />
            <SparkleIcon className={`${styles.fxSpark} ${styles.fxSparkC}`} />
            <HeartIcon className={`${styles.fxHeart} ${styles.fxHeartA}`} />
            <HeartIcon className={`${styles.fxHeart} ${styles.fxHeartB}`} />
            <HeartIcon className={`${styles.fxHeart} ${styles.fxHeartC}`} />
          </div>
          <span className={styles.characterOrder}>{index + 1}/{data.items.length}</span>
          <div className={styles.productionBox}>
            <span className={styles.productionLabel}><ArrowUp size={13} strokeWidth={3.6} aria-hidden="true" />Produção</span>
            <div className={styles.productionRow}>
              <span className={styles.productionSpriteWrap} aria-hidden="true">
                <span className={styles.productionGlow} />
                <Image className={styles.productionSprite} src="/idle/icons/production.webp" alt="" width={160} height={160} />
                <SparkleIcon className={`${styles.spriteSpark} ${styles.spriteSparkA}`} />
                <SparkleIcon className={`${styles.spriteSpark} ${styles.spriteSparkB}`} />
              </span>
              <strong className={styles.productionValue} data-size={productionSize(formatIdleNumber(selected.production))} aria-label={`Produção de ${formatIdleNumber(selected.production)} por segundo`}>{formatIdleNumber(selected.production)}/s</strong>
            </div>
          </div>
          {dev && devInfo && selected.purchased && <KittyDevExtras item={selected} info={devInfo} balance={balance} onSnapshot={dev.onSnapshot} />}
          <button type="button" className={`${styles.actionButton} ${styles.kittyUpgradeButton} ${!selected.purchased ? styles.buyButton : ""} ${selectedAwake ? devStyles.awakeButton : ""}`} disabled={!selected.unlocked || busyItemId === selected.definition.id || (selected.purchased && !quoteFor(selected, purchaseMode))} onClick={() => {
            if (selected.purchased) {
              triggerUpgradeFeedback();
              void buyUpgrades(selected.definition.id, purchaseMode);
              return;
            }
            void act(selected.definition.id, "buy");
          }}>{selected.purchased ? quoteFor(selected, purchaseMode) ? <>
            <ArrowBigUp className={styles.btnArrow} size={22} fill="currentColor" strokeWidth={1.6} aria-hidden="true" />
            <span className={styles.btnText}>Melhorar x{quoteFor(selected, purchaseMode)!.count}</span>
            <span className={styles.btnDivider} aria-hidden="true" />
            <span className={styles.btnCost}><GameStatIcon type="money" /><span>{formatIdleNumber(quoteFor(selected, purchaseMode)!.totalCost)}</span></span>
            {(pendingUpgrades[selected.definition.id] ?? 0) > 0 && <span className={styles.pendingBadge}>+{pendingUpgrades[selected.definition.id]}</span>}
          </> : <span className={styles.btnText}>Saldo insuficiente</span> : busyItemId === selected.definition.id ? <span className={styles.btnText}>Comprando…</span> : selected.unlocked ? <>
            <span className={styles.btnText}>Comprar</span>
            <span className={styles.btnDivider} aria-hidden="true" />
            <span className={styles.btnCost}><GameStatIcon type="money" /><span>{formatIdleNumber(selected.nextCost)}</span></span>
          </> : <span className={styles.btnText}>Compre a personagem anterior</span>}</button>
        </div>
      </div>
      {bursts.map((burst) => <span key={burst.id} className={`${styles.clickBurst} ${styles.carouselBurst}`} data-rush={burst.rushMultiplier} style={{ left: burst.left, top: burst.top }}><GameStatIcon type="money" />+{formatIdleNumber(burst.reward)}{burst.multiplier > 1 && <small>x{burst.multiplier}</small>}</span>)}
    </div>
  </section>;
}

const OBJECTIVE_ART: Record<string, string> = {
  farmEntries: "/idle/farm/garden.webp",
  kittyEntries: "/idle/characters/v2/p01.webp",
  kittyEarnings: "/idle/icons/game-money.webp",
  earnings: "/idle/icons/game-money.webp",
  kittyClicks: "/idle/relics/clique.webp",
  kittyEvents: "/idle/events/money.webp",
  kittyBoosts: "/idle/events/production2.webp",
  kittyBestCombo: "/idle/events/click2.webp",
  kittyMilestones: "/idle/events/click5.webp",
};

function ObjectiveArt({ metric }: { metric: string }) {
  if (metric === "upgrades" || metric === "kittyUpgrades") return <BowIcon className={styles.missionSvg} />;
  if (metric === "minigames") return <ControllerIcon className={styles.missionSvg} />;
  if (metric === "kittyDays") return <CalendarCheckIcon className={styles.missionSvg} />;
  const src = OBJECTIVE_ART[metric];
  return src ? <Image src={src} alt="" fill sizes="56px" /> : <GameStatIcon type="global" />;
}

function formatRenewal(endsAt: number | undefined, now: number): string | null {
  if (!endsAt) return null;
  const minutes = Math.max(0, Math.ceil((endsAt - now) / 60_000));
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  const rest = minutes % 60;
  return days > 0 ? `${days}d ${hours}h` : `${hours}h ${String(rest).padStart(2, "0")}m`;
}

function MissionRow({ objective }: { objective: RenewableObjectiveSnapshot }) {
  const done = Boolean(objective.completedAt);
  const shown = Math.min(objective.progress, objective.target);
  const percent = Math.min(100, objective.target > 0 ? objective.progress / objective.target * 100 : 0);
  return <article className={`${styles.mission} ${done ? styles.missionDone : ""}`} data-objective-id={objective.id}>
    <div className={styles.missionIcon}><ObjectiveArt metric={objective.metric} /></div>
    <div className={styles.missionBody}>
      <h3>{objective.title}</h3>
      <p>{objective.description}</p>
      <div className={styles.missionProgress} role="progressbar" aria-label={`Progresso de ${objective.title}`} aria-valuemin={0} aria-valuemax={objective.target} aria-valuenow={shown}>
        <div className={styles.missionTrack}><div className={styles.missionFill} style={{ width: `${done ? 100 : percent}%` }} /></div>
        <span>{done ? `${formatIdleNumber(objective.target)}/${formatIdleNumber(objective.target)}` : `${formatIdleNumber(shown)}/${formatIdleNumber(objective.target)}`}</span>
      </div>
    </div>
    <div className={styles.missionSide}>
      <span className={styles.missionReward}><GameStatIcon type="global" />+{objective.reward}</span>
      {done ? <span className={`${styles.missionStatus} ${styles.missionStatusDone}`}><Check size={15} strokeWidth={3.4} aria-hidden="true" />Feita</span> : <span className={styles.missionStatus}><Clock3 size={14} strokeWidth={2.8} aria-hidden="true" />Em progresso</span>}
    </div>
  </article>;
}

function MissionSection({ variant, title, subtitle, objectives }: { variant: "daily" | "weekly"; title: string; subtitle: string; objectives: RenewableObjectiveSnapshot[] }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const renewal = formatRenewal(objectives[0]?.periodEndsAt, now);
  return <section className={`${styles.missionSection} ${variant === "weekly" ? styles.missionWeekly : ""}`} aria-label={title}>
    <div className={styles.missionBanner}>
      <span className={styles.missionBannerIcon}>{variant === "daily" ? <CalendarHeartIcon /> : <CalendarStarIcon />}</span>
      <div><h2>{title}</h2><p>{subtitle}</p></div>
      {renewal && <span className={styles.missionTimer}><Clock3 size={15} strokeWidth={2.8} aria-hidden="true" /><span><small>Renova em</small><strong>{renewal}</strong></span></span>}
    </div>
    <div className={styles.missionList}>{objectives.map((objective) => <MissionRow key={objective.id} objective={objective} />)}</div>
  </section>;
}

/** Arte das conquistas permanentes que não são de um personagem (as de personagem usam o próprio sprite). */
function permanentArt(achievement: IdleAchievementSnapshot): { asset?: string; medal?: boolean } {
  const { id } = achievement;
  if (id.startsWith("kitty-level-")) return { medal: true };
  if (id.startsWith("kitty-clicks-")) return { asset: "/idle/relics/clique.webp" };
  if (id === "kitty-relics-all") return { asset: "/idle/relics/todososmundos.webp" };
  if (/^kitty-(100|1k|10k|1m|1b|1t|1qa)$/.test(id)) return { asset: "/idle/icons/production.webp" };
  return {};
}

function PermanentCard({ achievement, asset }: { achievement: IdleAchievementSnapshot; asset?: string }) {
  const art = asset ? { asset } : permanentArt(achievement);
  const done = Boolean(achievement.completedAt);
  const percent = Math.min(100, achievement.target > 0 ? achievement.progress / achievement.target * 100 : 0);
  return <article className={`${styles.permanentCard} ${done ? styles.permanentDone : ""}`} data-achievement-id={achievement.id}>
    <div className={`${styles.permanentArt} ${(art.asset || art.medal) && !done ? styles.achievementIconLocked : ""}`}>
      {art.asset ? <Image src={art.asset} alt="" fill sizes="96px" /> : art.medal ? <MedalIcon className={styles.missionSvg} /> : <TrophyIcon className={styles.missionSvg} />}
      {(art.asset || art.medal) && !done && <LockKeyhole size={16} className={styles.achievementLock} aria-hidden="true" />}
    </div>
    <h3>{achievement.title}</h3>
    <p>{achievement.description}</p>
    {!done && <div className={styles.permanentTrack} aria-hidden="true"><div style={{ width: `${percent}%` }} /></div>}
    {done ? <span className={`${styles.permanentButton} ${styles.permanentButtonDone}`}><Check size={15} strokeWidth={3.4} aria-hidden="true" />Feita</span> : <span className={styles.permanentButton}><GameStatIcon type="global" />+{achievement.reward}</span>}
  </article>;
}

function KittyAchievements({ data, snapshot }: { data: IdleModeSnapshot; snapshot: IdleSnapshot }) {
  const itemById = useMemo(() => new Map(data.items.map((item) => [item.definition.id, item])), [data.items]);
  const objectives = snapshot.kittyObjectives ?? snapshot.objectives;
  const complete = data.achievements.filter((item) => item.completedAt).length;
  return <section className={`${styles.content} ${styles.missionPage}`} aria-label="Conquistas da Hello Kitty">
    <MissionSection variant="daily" title="Missões Diárias" subtitle="Conclua hoje e ganhe recompensas especiais!" objectives={objectives.daily} />
    <MissionSection variant="weekly" title="Missões Semanais" subtitle="Desafios maiores, recompensas incríveis!" objectives={objectives.weekly} />
    <section className={`${styles.missionSection} ${styles.permanentSection}`} aria-label="Conquistas permanentes">
      <div className={styles.missionBanner}>
        <span className={styles.missionBannerIcon}><TrophyIcon /></span>
        <div><h2>Conquistas Permanentes</h2><p>Complete uma única vez e ganhe para sempre!</p></div>
        <span className={styles.permanentCount}>{complete}/{data.achievements.length}</span>
      </div>
      <div className={styles.permanentGrid}>{data.achievements.map((achievement) => <PermanentCard key={achievement.id} achievement={achievement} asset={achievement.iconItemId ? itemById.get(achievement.iconItemId)?.definition.asset : undefined} />)}</div>
    </section>
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
  return <article className={`${styles.achievement} ${completed ? styles.achievementCompleted : ""}`}><div className={`${styles.achievementIcon} ${asset && !completed ? styles.achievementIconLocked : ""}`}>{asset ? <Image src={asset} alt="" fill sizes="58px" /> : <GameStatIcon type="global" />}{asset && !completed && <LockKeyhole size={16} className={styles.achievementLock} aria-hidden="true" />}</div><div><h3>{title}</h3><p>{description}</p>{!completed && <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${percent}%` }} /></div>}</div><span className={`${styles.reward} ${completed ? styles.done : ""}`}>{completed ? <><Check size={15} /> Feita</> : <><GameStatIcon type="global" />+{reward}</>}</span></article>;
}

function CelebrationPopup({ celebration, onClose }: { celebration: Celebration; onClose: () => void }) {
  if (celebration.type === "unlock") {
    const noun = celebration.mode === "farm" ? "produtor" : "personagem";
    const tier = celebration.mode === "kitty" ? rarityTier(celebration.item.definition.unlockOrder) : 1;
    const final = celebration.mode === "kitty" && celebration.item.definition.unlockOrder === 23;
    return <div className={styles.achievementOverlay} role="dialog" aria-label={`Novo ${noun} desbloqueado`} onClick={onClose}><div className={`${styles.achievementPopup} ${styles.unlockPopup}`} data-unlock-tier={tier} data-final={final}><span className={styles.unlockFlash} />{tier >= 2 && <><Sparkles className={styles.popupSparkleLeft} /><Sparkles className={styles.popupSparkleRight} /></>}{tier >= 3 && <span className={styles.unlockRarity} style={{ backgroundImage: `url(${RARITY_ASSETS[tier - 1]})` }} aria-hidden="true" />}{tier >= 4 && <span className={styles.unlockParticles} aria-hidden="true">{PARTICLES.slice(0, final ? 8 : tier >= 6 ? 6 : 3).map(([x, y, size, delay, duration], index) => <i key={index} style={{ "--x": `${x}%`, "--y": `${y}%`, "--size": `${size}px`, "--delay": `${delay}s`, "--duration": `${duration}s` } as CSSProperties} />)}</span>}<div className={styles.unlockAsset}><Image src={celebration.item.definition.asset} alt={celebration.item.definition.name} fill sizes="180px" /></div><p>{final ? "As estrelas finalmente se encontraram!" : `Novo ${noun} desbloqueado!`}</p><h2>{celebration.item.definition.name}</h2><span className={styles.popupReward}><GameStatIcon type="production" /> {formatIdleNumber(celebration.item.production)}/s</span><small>Toque para continuar</small></div></div>;
  }
  return <div className={styles.achievementOverlay} role="dialog" aria-label="Conquista alcançada" onClick={onClose}><div className={styles.achievementPopup}><span className={styles.achievementGlow} /><Sparkles className={styles.popupSparkleLeft} /><Sparkles className={styles.popupSparkleRight} /><Image src="/idle/icons/global-coin.webp" alt="" width={92} height={92} /><p>Conquista alcançada!</p><h2>{celebration.achievement.title}</h2><span className={styles.popupReward}><GameStatIcon type="global" />+{celebration.achievement.reward} moedas globais</span><small>Toque para continuar</small></div></div>;
}
