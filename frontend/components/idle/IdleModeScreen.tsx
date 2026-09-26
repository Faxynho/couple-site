"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useIdleGame } from "@/hooks/useIdleGame";
import { formatIdleNumber } from "@/lib/formatIdleNumber";
import { IdleItemSnapshot, IdleModeId, IdleModeSnapshot } from "@/lib/idleTypes";
import IdleBottomNav, { IdleTab } from "./IdleBottomNav";
import IdleHeader from "./IdleHeader";
import styles from "./IdleGame.module.css";

const FARM_POSITIONS = [
  { left: "1%", top: "48%", width: "39%" },
  { left: "60%", top: "47%", width: "34%" },
  { left: "57%", top: "61%", width: "37%" },
  { left: "4%", top: "64%", width: "34%" },
  { left: "35%", top: "55%", width: "32%" },
  { left: "2%", top: "33%", width: "30%" },
  { left: "66%", top: "30%", width: "31%" },
  { left: "34%", top: "67%", width: "31%" },
  { left: "34%", top: "37%", width: "29%" },
  { left: "29%", top: "48%", width: "43%" },
];

const KITTY_POSITIONS = [
  { left: "29%", top: "34%", width: "43%" },
  { left: "57%", top: "45%", width: "39%" },
  { left: "2%", top: "52%", width: "43%" },
  { left: "47%", top: "62%", width: "46%" },
  { left: "4%", top: "35%", width: "34%" },
  { left: "64%", top: "31%", width: "30%" },
  { left: "7%", top: "66%", width: "31%" },
  { left: "35%", top: "52%", width: "28%" },
  { left: "34%", top: "69%", width: "31%" },
  { left: "30%", top: "27%", width: "42%" },
];

export default function IdleModeScreen({ mode }: { mode: IdleModeId }) {
  const router = useRouter();
  const [tab, setTab] = useState<IdleTab>("home");
  const [showOfflineReward, setShowOfflineReward] = useState(false);
  const { snapshot, error, loading, displayedBalance, busyItemId, act } = useIdleGame(mode);
  const data = snapshot?.modes[mode];
  const farm = mode === "farm";
  const title = farm ? "Fazendinha" : "Mundo da Hello Kitty";

  useEffect(() => {
    if (snapshot?.offlineReward?.mode !== mode) return;
    setShowOfflineReward(true);
    const timer = window.setTimeout(() => setShowOfflineReward(false), 5_200);
    return () => window.clearTimeout(timer);
  }, [mode, snapshot?.offlineReward]);

  if (loading || !snapshot || !data) return <main className={styles.page}><div className={styles.loading}>Carregando {title}…</div></main>;

  return (
    <main className={styles.page}>
      <div className={styles.background}>
        <Image
          src={farm ? "/idle/backgrounds/farm.webp" : "/idle/backgrounds/kitty-room.webp"}
          alt=""
          fill
          priority
          sizes="100vw"
        />
      </div>
      <IdleHeader
        title={tab === "home" ? title : tab === "upgrades" ? "Melhorias" : "Conquistas"}
        subtitle={tab === "home" ? (farm ? "Nosso cantinho rende juntinho" : "Nosso cantinho super fofo") : tab === "upgrades" ? "Compre e evolua para render mais" : "Complete objetivos e ganhe recompensas"}
        coins={snapshot.globalCoins}
        onBack={() => router.push("/cantinho")}
      />

      {tab === "home" && <HomeScene mode={mode} data={data} balance={displayedBalance} />}
      {tab === "upgrades" && (farm
        ? <FarmUpgrades data={data} balance={displayedBalance} busyItemId={busyItemId} act={act} />
        : <KittyCarousel data={data} balance={displayedBalance} busyItemId={busyItemId} act={act} />
      )}
      {tab === "achievements" && <Achievements mode={mode} data={data} snapshot={snapshot} />}

      {showOfflineReward && snapshot.offlineReward?.mode === mode && (
        <div className={styles.toast}>Enquanto vocês estavam fora: +{formatIdleNumber(snapshot.offlineReward.amount)}</div>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <IdleBottomNav active={tab} onChange={setTab} />
    </main>
  );
}

function BalancePill({ balance, production }: { balance: number; production: number }) {
  return (
    <div className={styles.statsPill}>
      <div className={styles.stat}><span>Dinheiro interno</span><strong>{formatIdleNumber(balance)}</strong></div>
      <div className={styles.statDivider} />
      <div className={styles.stat}><span>Produção/s</span><strong>{formatIdleNumber(production)}/s</strong></div>
    </div>
  );
}

function HomeScene({ mode, data, balance }: { mode: IdleModeId; data: IdleModeSnapshot; balance: number }) {
  const purchased = data.items.filter((item) => item.purchased);
  const positions = mode === "farm" ? FARM_POSITIONS : KITTY_POSITIONS;
  return (
    <section className={styles.scene} aria-label={mode === "farm" ? "Cenário da Fazendinha" : "Sala dos personagens"}>
      <BalancePill balance={balance} production={data.totalProduction} />
      {purchased.map((item) => {
        const position = positions[item.definition.unlockOrder] ?? positions[0];
        return (
          <div
            key={item.definition.id}
            className={mode === "farm" ? styles.producer : styles.character}
            style={{ ...position, animationDelay: `${item.definition.unlockOrder * -.31}s` }}
            title={`${item.definition.name}: ${formatIdleNumber(item.production)}/s`}
          >
            <Image src={item.definition.asset} alt={item.definition.name} fill sizes="45vw" />
          </div>
        );
      })}
    </section>
  );
}

function Summary({ balance, production }: { balance: number; production: number }) {
  return (
    <div className={styles.summary}>
      <div className={styles.stat}><span>Dinheiro interno</span><strong>{formatIdleNumber(balance)}</strong></div>
      <div className={styles.stat}><span>Produção/s</span><strong>{formatIdleNumber(production)}/s</strong></div>
    </div>
  );
}

type ActionProps = {
  data: IdleModeSnapshot;
  balance: number;
  busyItemId: string | null;
  act: (itemId: string, action: "buy" | "upgrade") => Promise<void>;
};

function FarmUpgrades({ data, balance, busyItemId, act }: ActionProps) {
  return (
    <section className={styles.content}>
      <Summary balance={balance} production={data.totalProduction} />
      <h2 className={styles.sectionTitle}>Produtores<small>Melhore os desbloqueados e compre novos para aumentar a renda.</small></h2>
      <div className={styles.cardGrid}>
        {data.items.map((item) => <ItemCard key={item.definition.id} item={item} busy={busyItemId === item.definition.id} onAction={act} />)}
      </div>
    </section>
  );
}

function ItemCard({ item, busy, onAction }: {
  item: IdleItemSnapshot;
  busy: boolean;
  onAction: ActionProps["act"];
}) {
  const action = item.purchased ? "upgrade" : "buy";
  return (
    <article className={`${styles.itemCard} ${!item.unlocked ? styles.locked : ""}`}>
      {!item.unlocked && <span className={styles.lockBadge}><LockKeyhole size={16} /></span>}
      <div className={styles.itemImage}><Image src={item.definition.asset} alt="" fill sizes="42vw" /></div>
      <h3>{item.definition.name}</h3>
      <div className={styles.itemMeta}>
        <span>{item.purchased ? `Nv. ${item.level}` : "Não comprado"}</span>
        <span>+{formatIdleNumber(item.production)}/s</span>
      </div>
      <p className={styles.price}><span className={styles.miniCoin}>✦</span> {formatIdleNumber(item.nextCost)}</p>
      <button
        type="button"
        className={`${styles.actionButton} ${!item.purchased ? styles.buyButton : ""}`}
        disabled={!item.unlocked || busy}
        onClick={() => void onAction(item.definition.id, action)}
      >
        {busy ? "Aguarde…" : item.purchased ? "Melhorar" : item.unlocked ? "Comprar" : "Bloqueado"}
      </button>
    </article>
  );
}

function KittyCarousel({ data, balance, busyItemId, act }: ActionProps) {
  const [index, setIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  const count = data.items.length;
  const selected = data.items[index];
  const previous = data.items[(index - 1 + count) % count];
  const next = data.items[(index + 1) % count];
  const move = (direction: -1 | 1) => setIndex((current) => (current + direction + count) % count);
  const handleEnd = (x: number) => {
    if (touchStart.current === null) return;
    const delta = x - touchStart.current;
    if (Math.abs(delta) > 38) move(delta > 0 ? -1 : 1);
    touchStart.current = null;
  };
  return (
    <section className={styles.content}>
      <Summary balance={balance} production={data.totalProduction} />
      <div
        className={styles.carousel}
        onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
        onTouchEnd={(event) => handleEnd(event.changedTouches[0].clientX)}
      >
        <CarouselImage item={previous} className={styles.carouselSideLeft} />
        <CarouselImage item={next} className={styles.carouselSideRight} />
        <CarouselImage item={selected} />
        <button type="button" className={`${styles.carouselArrow} ${styles.carouselArrowLeft}`} onClick={() => move(-1)} aria-label="Personagem anterior"><ChevronLeft /></button>
        <button type="button" className={`${styles.carouselArrow} ${styles.carouselArrowRight}`} onClick={() => move(1)} aria-label="Próxima personagem"><ChevronRight /></button>
        <div className={styles.characterPanel}>
          <h2>{selected.definition.name} ♥</h2>
          <div className={styles.itemMeta}>
            <span>{selected.purchased ? `Nv. ${selected.level}` : selected.unlocked ? "Disponível" : "Bloqueado"}</span>
            <span>{formatIdleNumber(selected.production)}/s</span>
          </div>
          <button
            type="button"
            className={`${styles.actionButton} ${!selected.purchased ? styles.buyButton : ""}`}
            disabled={!selected.unlocked || busyItemId === selected.definition.id}
            onClick={() => void act(selected.definition.id, selected.purchased ? "upgrade" : "buy")}
          >
            {busyItemId === selected.definition.id ? "Aguarde…" : selected.purchased ? `Melhorar · ${formatIdleNumber(selected.nextCost)}` : selected.unlocked ? `Comprar · ${formatIdleNumber(selected.nextCost)}` : "Compre a personagem anterior"}
          </button>
        </div>
      </div>
    </section>
  );
}

function CarouselImage({ item, className = "" }: { item: IdleItemSnapshot; className?: string }) {
  return (
    <div className={`${styles.carouselCharacter} ${className}`}>
      <Image src={item.definition.asset} alt={item.definition.name} fill sizes="76vw" priority={item.definition.id === "hello-kitty"} />
    </div>
  );
}

function Achievements({ mode, data, snapshot }: { mode: IdleModeId; data: IdleModeSnapshot; snapshot: NonNullable<ReturnType<typeof useIdleGame>["snapshot"]> }) {
  const complete = data.achievements.filter((item) => item.completedAt).length;
  const earned = data.achievements.filter((item) => item.completedAt).reduce((sum, item) => sum + item.reward, 0);
  const itemById = new Map(data.items.map((item) => [item.definition.id, item]));
  return (
    <section className={styles.content}>
      <div className={styles.achievementStats}>
        <div className={styles.stat}><span>Concluídas</span><strong>{complete}</strong></div>
        <div className={styles.stat}><span>Em andamento</span><strong>{data.achievements.length - complete}</strong></div>
        <div className={styles.stat}><span>Moedas ganhas</span><strong>{earned}</strong></div>
      </div>
      <h2 className={styles.sectionTitle}>Conquistas permanentes<small>Completadas uma única vez neste modo.</small></h2>
      <div className={styles.achievementList}>
        {data.achievements.map((achievement) => (
          <AchievementRow
            key={achievement.id}
            title={achievement.title}
            description={achievement.description}
            reward={achievement.reward}
            progress={achievement.progress}
            target={achievement.target}
            completed={Boolean(achievement.completedAt)}
            asset={achievement.iconItemId ? itemById.get(achievement.iconItemId)?.definition.asset : undefined}
          />
        ))}
      </div>
      <h2 className={styles.sectionTitle}>Objetivos diários<small>Renovam todos os dias no horário de Brasília.</small></h2>
      <div className={styles.achievementList}>
        {snapshot.objectives.daily.map((objective) => <AchievementRow key={objective.id} {...objective} completed={Boolean(objective.completedAt)} />)}
      </div>
      <h2 className={styles.sectionTitle}>Objetivos semanais<small>Metas maiores para construir juntos.</small></h2>
      <div className={styles.achievementList}>
        {snapshot.objectives.weekly.map((objective) => <AchievementRow key={objective.id} {...objective} completed={Boolean(objective.completedAt)} />)}
      </div>
    </section>
  );
}

function AchievementRow({ title, description, reward, progress, target, completed, asset }: {
  title: string; description: string; reward: number; progress: number; target: number; completed: boolean; asset?: string;
}) {
  const percent = Math.min(100, target > 0 ? progress / target * 100 : 0);
  return (
    <article className={styles.achievement}>
      <div className={styles.achievementIcon}>
        {asset ? <Image src={asset} alt="" fill sizes="58px" /> : <span className={styles.coin} style={{ width: "3.2rem", height: "3.2rem", fontSize: "1.3rem" }}>✦</span>}
      </div>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        {!completed && <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${percent}%` }} /></div>}
      </div>
      <span className={`${styles.reward} ${completed ? styles.done : ""}`}>{completed ? <><Check size={15} /> Feita</> : `+${reward}`}</span>
    </article>
  );
}
