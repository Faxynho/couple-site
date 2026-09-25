import { memo, useEffect, useState } from "react";
import type { PetDefinition } from "../config";
import { decorationStyle, type Decoration } from "../petRoomDecorations";
import PetSprite from "./PetSprite";
import styles from "../PetRoom.module.css";

const BASE = "/images/pets/room/base/";

function SceneAsset({ name, className }: { name: string; className: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${BASE}${name}.svg`} alt="" className={className} draggable={false} aria-hidden="true" />;
}

function PetRoomScene({ pet, decorations }: { pet: PetDefinition; decorations: readonly Decoration[] }) {
  const [visible, setVisible] = useState(() => decorations.map((item) => ({ item, exiting: false })));
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

  const byLayer = (layer: Decoration["layer"]) => visible.filter(({ item }) => item.layer === layer).map(({ item, exiting }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img key={item.id} src={item.asset} alt="" aria-hidden="true" draggable={false}
      className={`${styles.decoration} ${styles[`decor${layer}`]} ${exiting ? styles.decorExit : ""}`}
      style={decorationStyle(item)} />
  ));

  return (
    <section className={styles.scene} aria-label={`Quarto de ${pet.name}`}>
      <div className={styles.stage}>
        <div className={styles.wall} aria-hidden="true" />
        <div className={styles.floor} aria-hidden="true" />
        <div className={styles.baseboard} aria-hidden="true" />
        <div className={styles.windowSky}>
          <SceneAsset name="sky-day" className={styles.skyDay} />
          <SceneAsset name="sky-night" className={styles.skyNight} />
        </div>
        <SceneAsset name="window-frame" className={styles.windowFrame} />
        <SceneAsset name="curtains" className={styles.curtains} />
        {byLayer("wall")}
        <SceneAsset name="wall-charm" className={styles.wallCharm} />
        <SceneAsset name="shelf" className={styles.shelf} />
        <SceneAsset name="plant" className={styles.basePlant} />
        <SceneAsset name="dresser" className={styles.dresser} />
        <SceneAsset name="lamp" className={styles.lamp} />
        {byLayer("rear")}
        <SceneAsset name="rug" className={styles.rug} />
        <SceneAsset name="bed" className={styles.bed} />
        <SceneAsset name="bowls" className={styles.bowls} />
        <SceneAsset name="toy-bones" className={styles.toyBones} />
        <div className={styles.petShadow} aria-hidden="true" />
        <PetSprite pet={pet} className={styles.pet} />
        {byLayer("front")}
        <div className={styles.nightLight} aria-hidden="true" />
      </div>
    </section>
  );
}

export default memo(PetRoomScene);
