"use client";

import Image from "next/image";
import { BarChart3, Clock3, Coins, Crown, MousePointerClick, Sparkles, TrendingUp, Trophy, Zap } from "lucide-react";
import { formatIdleNumber } from "@/lib/formatIdleNumber";
import { IdleModeSnapshot } from "@/lib/idleTypes";
import styles from "./IdleGame.module.css";

function duration(ms: number) {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

export default function IdleStatistics({ data }: { data: IdleModeSnapshot }) {
  const complete = data.achievements.filter((item) => item.completedAt).length;
  const owned = data.items.filter((item) => item.purchased);
  const highestLevel = Math.max(0, ...owned.map((item) => item.level));
  const incomeSorted = [...data.items].sort((a, b) =>
    (b.statistics.passiveEarned + b.statistics.clickEarned) - (a.statistics.passiveEarned + a.statistics.clickEarned));
  const clickSorted = [...data.items].sort((a, b) => b.statistics.clicks - a.statistics.clicks);
  const leader = incomeSorted[0];
  const mostClicked = clickSorted[0];
  const s = data.statistics;
  const currentClick = Math.max(0, ...owned.map((item) => Math.max(1, Math.floor(item.production * .22)) * data.clickMultiplier));
  const cards = [
    { label: "Saldo atual", value: formatIdleNumber(data.balance), icon: Coins },
    { label: "Produção atual", value: `${formatIdleNumber(data.effectiveProduction)}/s`, icon: TrendingUp },
    { label: "Dinheiro total produzido", value: formatIdleNumber(data.totalEarned), icon: BarChart3 },
    { label: "Produzido hoje", value: formatIdleNumber(s.earnedToday), icon: Sparkles },
    { label: "Renda passiva", value: formatIdleNumber(s.passiveEarned), icon: Clock3 },
    { label: "Renda por clique", value: formatIdleNumber(s.clickEarned), icon: MousePointerClick },
    { label: "Renda de eventos", value: formatIdleNumber(s.eventEarned), icon: Sparkles },
    { label: "Total de cliques", value: formatIdleNumber(data.totalClicks), icon: MousePointerClick },
    { label: "Valor atual por clique", value: formatIdleNumber(currentClick), icon: Zap },
    { label: "Maior clique", value: formatIdleNumber(s.largestClick), icon: Zap },
    { label: "Desbloqueados", value: `${owned.length}/10`, icon: Crown },
    { label: "Níveis comprados", value: formatIdleNumber(data.totalUpgrades), icon: TrendingUp },
    { label: "Maior nível", value: formatIdleNumber(highestLevel), icon: Trophy },
    { label: "Conquistas", value: `${complete}/${data.achievements.length}`, icon: Trophy },
    { label: "Eventos coletados", value: formatIdleNumber(s.eventsCollected), icon: Sparkles },
    { label: "Boosts coletados", value: formatIdleNumber(s.boostsCollected), icon: Zap },
    { label: "Produção offline", value: formatIdleNumber(s.offlineEarned), icon: Clock3 },
    { label: "Tempo ativo", value: duration(s.activeTimeMs), icon: Clock3 },
    { label: "Maior produção", value: `${formatIdleNumber(s.highestProduction)}/s`, icon: TrendingUp },
  ];

  return (
    <section className={styles.content + " " + styles.statisticsPage}>
      {leader && (
        <article className={styles.incomeLeader}>
          <div className={styles.incomeLeaderArt}><Image src={leader.definition.asset} alt="" fill sizes="120px" /></div>
          <div><span>Maior fonte de renda</span><h2>{leader.definition.name}</h2><strong>{formatIdleNumber(leader.statistics.passiveEarned + leader.statistics.clickEarned)} produzidos</strong></div>
        </article>
      )}
      <h2 className={styles.sectionTitle}>Hoje e desde o início<small>Os novos detalhamentos começaram a ser registrados nesta atualização.</small></h2>
      <div className={styles.statDashboard}>
        {cards.map(({ label, value, icon: Icon }) => <article key={label} className={styles.dashboardCard}><Icon size={18} /><span>{label}</span><strong>{value}</strong></article>)}
      </div>
      <h2 className={styles.sectionTitle}>Eventos e boosts</h2>
      <div className={styles.eventStatGrid}>
        {(["money", "production2", "click2", "click3", "click5", "click10"] as const).map((type) => (
          <article key={type}><span>{type === "money" ? "Tesouro" : type === "production2" ? "Produção x2" : type.replace("click", "CLICK x")}</span><strong>{s.eventCounters[type]}</strong></article>
        ))}
      </div>
      <h2 className={styles.sectionTitle}>Por item<small>Renda, cliques e nível de cada produtor.</small></h2>
      <div className={styles.itemStatsList}>
        {data.items.map((item) => (
          <article key={item.definition.id} className={styles.itemStatsRow}>
            <div className={styles.itemStatsArt}><Image src={item.definition.asset} alt="" fill sizes="58px" /></div>
            <div><h3>{item.definition.name}</h3><p>Nível {item.level} · {formatIdleNumber(item.statistics.clicks)} cliques</p><p>{formatIdleNumber(item.statistics.passiveEarned)} passivo · {formatIdleNumber(item.statistics.clickEarned)} por clique</p></div>
            <strong>{formatIdleNumber(item.statistics.passiveEarned + item.statistics.clickEarned)}</strong>
          </article>
        ))}
      </div>
      {mostClicked && <p className={styles.mostClicked}>Mais clicado: <strong>{mostClicked.definition.name}</strong> · {formatIdleNumber(mostClicked.statistics.clicks)} cliques</p>}
    </section>
  );
}
