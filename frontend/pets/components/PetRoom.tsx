"use client";

import { useState } from "react";
import { Bone, Heart, Sofa, Sparkles, Shirt } from "lucide-react";
import type { PetDefinition } from "../config";
import PetSprite from "./PetSprite";
import styles from "../pets.module.css";

const TABS = [
  { id: "food", label: "Comida", icon: Bone },
  { id: "care", label: "Carinho", icon: Heart },
  { id: "play", label: "Brincar", icon: Sparkles },
  { id: "style", label: "Visual", icon: Shirt },
  { id: "room", label: "Quarto", icon: Sofa },
] as const;

type TabId = (typeof TABS)[number]["id"];

const PANELS: Record<TabId, { heading: string; detail: string; options: readonly string[] }> = {
  food: { heading: "Hora de comer", detail: "O cantinho das refeições", options: [] },
  care: { heading: "Um carinho", detail: "Um espaço para ficar pertinho", options: [] },
  play: { heading: "Vamos brincar", detail: "Os brinquedos vão morar aqui", options: [] },
  style: { heading: "O visual", detail: "Peças para escolher depois", options: ["Roupas", "Cabeça", "Coleiras"] },
  room: { heading: "O quartinho", detail: "Cada detalhe do espaço deles", options: ["Móveis", "Decoração", "Parede", "Piso"] },
};

export default function PetRoom({ pet }: { pet: PetDefinition }) {
  const [activeTab, setActiveTab] = useState<TabId>("care");
  const panel = PANELS[activeTab];
  const panelId = `pet-panel-${activeTab}`;

  return (
    <div className={styles.roomLayout}>
      <div className={styles.roomScene} aria-label={`Quarto de ${pet.name}`}>
        <span className={styles.roomWindow} aria-hidden="true"><span /></span>
        <span className={styles.roomShelf} aria-hidden="true"><span /><span /></span>
        <span className={styles.roomWallLine} aria-hidden="true" />
        <span className={styles.roomFloor} aria-hidden="true" />
        <span className={styles.roomRug} aria-hidden="true" />
        <span className={styles.roomBed} aria-hidden="true" />
        <span className={styles.roomBowl} aria-hidden="true" />
        <span className={styles.roomBall} aria-hidden="true" />
        <PetSprite pet={pet} className={styles.roomPet} />
        <span className={styles.roomName}>{pet.name}</span>
      </div>

      <div className={styles.roomControls}>
        <section className={styles.tabPanel} id={panelId} role="tabpanel" aria-labelledby={`pet-tab-${activeTab}`} key={activeTab}>
          <span className={styles.panelMark} aria-hidden="true">✦</span>
          <div className={styles.panelCopy}>
            <h2>{panel.heading}</h2>
            <p>{panel.detail}</p>
          </div>
          {panel.options.length > 0 && (
            <div className={styles.panelOptions} aria-label="Categorias previstas">
              {panel.options.map((option) => <span key={option}>{option}</span>)}
            </div>
          )}
        </section>

        <div className={styles.tabs} role="tablist" aria-label={`Áreas do quarto de ${pet.name}`}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              id={`pet-tab-${id}`}
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={activeTab === id ? panelId : undefined}
              className={`${styles.tab} ${activeTab === id ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
