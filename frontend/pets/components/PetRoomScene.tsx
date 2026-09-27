"use client";

import { memo, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import type { PetDefinition } from "../config";
import { decorationStyle, type Decoration } from "../petRoomDecorations";
import PetSprite from "./PetSprite";
import styles from "../PetRoom.module.css";

const BASE = "/images/pets/room/base/";
type TimeOfDay = "day" | "night";
const localTimeOfDay = (): TimeOfDay => {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "day" : "night";
};

function SceneAsset({ name, className }: { name: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${BASE}${name}.webp`} alt="" className={className} draggable={false} aria-hidden="true" />;
}

function PetRoomScene({ pet, decorations, coins, environment }: { pet: PetDefinition; decorations: readonly Decoration[]; coins: number; environment: "real" | "dev" }) {
  const [visible, setVisible] = useState(() => decorations.map((item) => ({ item, exiting: false })));
  const [automaticTime, setAutomaticTime] = useState<TimeOfDay>("day");
  const [preview, setPreview] = useState<TimeOfDay | null>(null);
  const timeOfDay = preview ?? automaticTime;
  useEffect(() => {
    const update = () => setAutomaticTime(localTimeOfDay());
    update();
    const timer = window.setInterval(update, 60_000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  useEffect(() => {
    const incoming = new Set(decorations.map((item) => item.id));
    setVisible((previous) => {
      const existing = new Set(previous.map(({ item }) => item.id));
      const changed = previous.some(({ item, exiting }) => exiting !== !incoming.has(item.id))
        || decorations.some((item) => !existing.has(item.id));
      if (!changed) return previous;
      return [
        ...previous.map(({ item }) => ({ item, exiting: !incoming.has(item.id) })),
        ...decorations.filter((item) => !existing.has(item.id)).map((item) => ({ item, exiting: false })),
      ];
    });
    const timeout = window.setTimeout(() => {
      setVisible((previous) => previous.some(({ exiting }) => exiting)
        ? previous.filter(({ exiting }) => !exiting)
        : previous);
    }, 190);
    return () => window.clearTimeout(timeout);
  }, [decorations]);

  const byLayer = (layer: Decoration["layer"]) => visible
    .filter(({ item }) => item.layer === layer)
    .sort((a, b) => a.item.stack - b.item.stack || a.item.id.localeCompare(b.item.id))
    .map(({ item, exiting }) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img key={item.id} src={item.asset} alt="" aria-hidden="true" draggable={false}
        className={`${styles.decoration} ${styles[`decor${layer}`]} ${exiting ? styles.decorExit : ""}`}
        style={{ ...decorationStyle(item), zIndex: item.stack }} />
    ));

  return (
    <section className={styles.scene} aria-label={`Quarto de ${pet.name}`} data-time-of-day={timeOfDay}>
      <div className={styles.stage}>
        <div className={styles.wall} aria-hidden="true" />
        <div className={styles.floor} aria-hidden="true" />
        <div className={styles.baseboard} aria-hidden="true" />
        <div className={styles.windowSky} aria-hidden="true">
          <SceneAsset name="sky-day" className={styles.skyDay} />
          <SceneAsset name="sky-night" className={styles.skyNight} />
        </div>
        <SceneAsset name="window-frame" className={styles.windowFrame} />
        <SceneAsset name="curtains" className={styles.curtains} />
        {byLayer("wall")}
        {byLayer("rear")}
        <div className={styles.petShadow} aria-hidden="true" />
        <PetSprite pet={pet} className={styles.pet} />
        {byLayer("front")}
        <div className={styles.nightShade} aria-hidden="true" />
        <div className={styles.ceilingGlow} aria-hidden="true" />
        {visible.filter(({ item, exiting }) => item.light && !exiting).map(({ item }) => (
          <span key={item.id} className={styles.lampGlow} style={{
            ...decorationStyle(item),
            // The light origin belongs to the trimmed lamp sprite, and scales with it.
            ["--light-x" as string]: `${item.light!.originX}%`,
            ["--light-y" as string]: `${item.light!.originY}%`,
          }} aria-hidden="true" />
        ))}
      </div>
      <div className={styles.petWalletTop} aria-label={`${coins.toLocaleString("pt-BR")} ${environment === "dev" ? "moedas DEV" : "moedas globais"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/idle/icons/global-coin.webp" alt="" aria-hidden="true" />
        <strong>{coins.toLocaleString("pt-BR")}</strong>
      </div>
      <button type="button" className={styles.timePreview}
        aria-label={`Visualizar ${timeOfDay === "day" ? "noite" : "dia"}`}
        title={`Prévia de ${timeOfDay === "day" ? "noite" : "dia"} · automático ao reabrir`}
        onClick={() => setPreview(timeOfDay === "day" ? "night" : "day")}>
        {timeOfDay === "day" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </section>
  );
}

export default memo(PetRoomScene);
