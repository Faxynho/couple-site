"use client";

import { useState } from "react";
import { FlaskConical, RotateCcw, WalletCards, WandSparkles } from "lucide-react";
import { idleDevAction } from "@/lib/idleApi";
import { IdleEventType, IdleModeId, IdleModeSnapshot, IdleSnapshot } from "@/lib/idleTypes";
import styles from "./IdleGame.module.css";

export default function IdleDevPanel({ mode, data, onSnapshot }: { mode: IdleModeId; data: IdleModeSnapshot; onSnapshot: (snapshot: IdleSnapshot) => void }) {
  const [amount, setAmount] = useState("1000");
  const [level, setLevel] = useState("10");
  const [itemId, setItemId] = useState(data.items[0]?.definition.id ?? "");
  const [achievementId, setAchievementId] = useState(data.achievements[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const run = async (payload: Record<string, unknown>, confirmation?: string) => {
    if (confirmation && !window.confirm(confirmation)) return;
    try {
      const snapshot = await idleDevAction(payload);
      onSnapshot(snapshot);
      setMessage("Ação aplicada no ambiente DEV.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha na ferramenta DEV.");
    }
  };
  const money = (target: "global" | IdleModeId, operation: "add" | "remove" | "set" | "zero") =>
    run(
      { action: "balance", target, operation, amount: Number(amount) || 0 },
      operation === "zero" ? "Zerar este saldo do ambiente DEV?" : undefined,
    );

  return (
    <section className={styles.content + " " + styles.devTools}>
      <div className={styles.devIntro}><FlaskConical size={24} /><div><h2>Ferramentas do ambiente DEV</h2><p>Nada nesta aba altera o save real.</p></div></div>
      <article className={styles.devSection}>
        <h3><WalletCards size={17} /> Saldos DEV</h3>
        <input aria-label="Valor da ferramenta DEV" value={amount} onChange={(event) => setAmount(event.target.value)} type="number" inputMode="decimal" />
        {(["farm", "kitty", "global"] as const).map((target) => <div key={target} className={styles.devActionRow}><strong>{target === "global" ? "Moeda global DEV" : target === "farm" ? "Fazendinha DEV" : "Hello Kitty DEV"}</strong><div><button onClick={() => void money(target, "add")}>Adicionar</button><button onClick={() => void money(target, "remove")}>Remover</button><button onClick={() => void money(target, "set")}>Definir</button><button className={styles.devDanger} onClick={() => void money(target, "zero")}>Zerar</button></div></div>)}
      </article>
      <article className={styles.devSection}>
        <h3><WandSparkles size={17} /> Itens e níveis</h3>
        <select aria-label="Item DEV" value={itemId} onChange={(event) => setItemId(event.target.value)}>{data.items.map((item) => <option key={item.definition.id} value={item.definition.id}>{item.definition.name}</option>)}<option value="all">Todos</option></select>
        <input aria-label="Nível DEV" value={level} onChange={(event) => setLevel(event.target.value)} type="number" min="1" max="10000" />
        <div className={styles.devButtonGrid}><button onClick={() => void run({ action: "item", mode, itemId, itemAction: "unlock" })}>Desbloquear</button><button onClick={() => void run({ action: "item", mode, itemId, itemAction: "setLevel", level: Number(level) })}>Definir nível</button><button onClick={() => void run({ action: "item", mode, itemId, itemAction: "resetLevels" }, "Resetar os níveis selecionados no DEV?")}>Resetar níveis</button><button className={styles.devDanger} onClick={() => void run({ action: "item", mode, itemId, itemAction: "lock" }, "Bloquear novamente os itens selecionados no DEV?")}>Bloquear</button></div>
      </article>
      {mode === "kitty" && data.kittyDev && <article className={styles.devSection} aria-label="Dias jogados neste mundo">
        <h3>Dias jogados neste mundo</h3>
        <p className={styles.devNote}><strong style={{ fontSize: "1.6rem" }}>{(data.kittyDev.days ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong> dias · conta o tempo real e soma as simulações (12 × 2h = 1 dia). Zera junto com o reset do mundo.</p>
        <div className={styles.devButtonGrid}>
          <button onClick={() => void run({ action: "kittyDev", kittyAction: "setDays", characterId: "all", amount: Number(amount) || 0 })}>Definir dias</button>
          <button className={styles.devDanger} onClick={() => void run({ action: "kittyDev", kittyAction: "resetDays", characterId: "all" }, "Zerar o contador de dias jogados?")}>Zerar contador</button>
        </div>
      </article>}
      {mode === "kitty" && data.kittyDev && <article className={styles.devSection}>
        <h3>Estrelas, itens e Pedras Estelares</h3>
        <p>Pedras: <strong>{data.kittyDev.stones}</strong> · usa o personagem selecionado em Itens e níveis</p>
        <div className={styles.devButtonGrid}>
          <button onClick={() => void run({ action: "kittyDev", kittyAction: "addStones", characterId: "all", amount: 10 })}>+10 pedras</button>
          <button onClick={() => void run({ action: "kittyDev", kittyAction: "addStones", characterId: "all", amount: 100 })}>+100 pedras</button>
          <button onClick={() => void run({ action: "kittyDev", kittyAction: "setStones", characterId: "all", amount: Number(amount) || 0 })}>Definir pedras</button>
          <button onClick={() => void run({ action: "kittyDev", kittyAction: "maxStars", characterId: itemId })}>5 estrelas</button>
          <button onClick={() => void run({ action: "kittyDev", kittyAction: "maxItems", characterId: itemId })}>Itens no máx.</button>
          <button className={styles.devDanger} onClick={() => void run({ action: "kittyDev", kittyAction: "resetStars", characterId: itemId }, "Zerar estrelas e despertar do personagem selecionado?")}>Zerar estrelas</button>
          <button className={styles.devDanger} onClick={() => void run({ action: "kittyDev", kittyAction: "resetItems", characterId: itemId }, "Zerar os itens do personagem selecionado?")}>Zerar itens</button>
          <button className={styles.devDanger} onClick={() => void run({ action: "kittyDev", kittyAction: "resetAll", characterId: "all" }, "Zerar TODAS as estrelas, itens, pedras e despertares do DEV?")}>Zerar tudo</button>
        </div>
      </article>}
      <article className={styles.devSection}>
        <h3>Conquistas e popups</h3>
        <select aria-label="Conquista DEV" value={achievementId} onChange={(event) => setAchievementId(event.target.value)}>{data.achievements.map((achievement) => <option key={achievement.id} value={achievement.id}>{achievement.title}</option>)}<option value="all">Todas</option></select>
        <div className={styles.devButtonGrid}><button onClick={() => void run({ action: "achievement", mode, achievementId, completed: true })}>Completar / popup</button><button className={styles.devDanger} onClick={() => void run({ action: "achievement", mode, achievementId, completed: false }, "Resetar a conquista selecionada no DEV?")}>Resetar</button></div>
      </article>
      <article className={styles.devSection}>
        <h3>Eventos e simulações</h3>
        <div className={styles.devButtonGrid}>{(["money", "production2", "click2", "click3", "click5", "click10"] as IdleEventType[]).map((eventType) => <button key={eventType} onClick={() => void run({ action: "forceEvent", mode, eventType })}>{eventType === "money" ? "Money event" : eventType === "production2" ? "Produção x2" : eventType.replace("click", "CLICK x")}</button>)}</div>
        <div className={styles.devButtonGrid}>
                  <button className={styles.devWideButton} onClick={() => void run({ action: "simulateOffline", mode, elapsedMs: 2 * 60 * 60 * 1000 })}>Simular 2h offline</button>
          <button onClick={() => void run({ action: "simulateDevOffline", mode, elapsedMs: 8 * 60 * 60 * 1000 })}>Simular 8h offline</button>
          <button onClick={() => void run({ action: "simulateDevOffline", mode, elapsedMs: 16 * 60 * 60 * 1000 })}>Simular 16h offline</button>
        </div>
      </article>
      <button className={styles.devResetWorld} onClick={() => void run({ action: "resetMode", mode }, "Isso vai resetar completamente este mundo DEV. Continuar?")}><RotateCcw size={17} /> Resetar mundo DEV</button>
      {message && <p className={styles.developerMessage}>{message}</p>}
    </section>
  );
}
