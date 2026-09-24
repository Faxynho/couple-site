"use client";

import { useState } from "react";
import {
  Armchair, BedDouble, Bone, CircleDot, Crown, Grid3X3, HandHeart,
  Heart, Lamp, Paintbrush, PawPrint, Shirt, Sparkles, Square, ToyBrick,
  Utensils, Cookie, type LucideIcon,
} from "lucide-react";
import type { PetDefinition } from "../config";
import PetItemGrid, { type PetItemPreview } from "./PetItemGrid";
import styles from "../PetRoom.module.css";

const TABS = [
  { id: "food", label: "Comida", icon: Utensils },
  { id: "care", label: "Carinho", icon: Heart },
  { id: "play", label: "Brincar", icon: CircleDot },
  { id: "style", label: "Visual", icon: Shirt },
  { id: "room", label: "Quarto", icon: BedDouble },
] as const;
type TabId = (typeof TABS)[number]["id"];

const STYLE_FILTERS: readonly { label: string; icon: LucideIcon }[] = [
  { label: "Roupas", icon: Shirt },
  { label: "Cabeça", icon: Crown },
  { label: "Coleiras", icon: CircleDot },
];
const ROOM_FILTERS: readonly { label: string; icon: LucideIcon }[] = [
  { label: "Todos", icon: Grid3X3 },
  { label: "Camas", icon: BedDouble },
  { label: "Tapetes", icon: Square },
  { label: "Parede", icon: Paintbrush },
  { label: "Janelas", icon: Square },
  { label: "Móveis", icon: Armchair },
  { label: "Decoração", icon: Sparkles },
];

const FOOD: readonly PetItemPreview[] = [
  { label: "Tigela", icon: Utensils, tone: "peach" },
  { label: "Petisco", icon: Bone, tone: "rose" },
  { label: "Lanchinho", icon: Cookie, tone: "sage" },
];
const TOYS: readonly PetItemPreview[] = [
  { label: "Bola", icon: CircleDot, tone: "rose" },
  { label: "Brinquedo", icon: ToyBrick, tone: "sage" },
  { label: "Mordedor", icon: Bone, tone: "peach" },
];
const STYLE: readonly PetItemPreview[] = [
  { label: "Roupinha", icon: Shirt, tone: "rose", category: "Roupas" },
  { label: "Acessório", icon: Crown, tone: "peach", category: "Cabeça" },
  { label: "Coleira", icon: CircleDot, tone: "sage", category: "Coleiras" },
];
const FURNITURE: readonly PetItemPreview[] = [
  { label: "Caminha", icon: BedDouble, tone: "rose", category: "Camas" },
  { label: "Tapete", icon: Square, tone: "peach", category: "Tapetes" },
  { label: "Parede", icon: Paintbrush, tone: "lilac", category: "Parede" },
  { label: "Janela", icon: Square, tone: "sage", category: "Janelas" },
  { label: "Móvel", icon: Armchair, tone: "peach", category: "Móveis" },
  { label: "Enfeite", icon: Lamp, tone: "rose", category: "Decoração" },
];

function FilterStrip({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly { label: string; icon: LucideIcon }[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className={styles.filterStrip} role="group" aria-label={label}>
      {options.map(({ label: name, icon: Icon }) => (
        <button
          type="button"
          key={name}
          className={`${styles.filter} ${selected === name ? styles.filterActive : ""}`}
          aria-pressed={selected === name}
          onClick={() => onSelect(name)}
        >
          <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
          <span>{name}</span>
        </button>
      ))}
    </div>
  );
}

export default function PetRoomDrawer({ pet }: { pet: PetDefinition }) {
  const [activeTab, setActiveTab] = useState<TabId>("food");
  const [styleFilter, setStyleFilter] = useState("Roupas");
  const [roomFilter, setRoomFilter] = useState("Todos");
  const panelId = `pet-panel-${activeTab}`;

  const items = activeTab === "food" ? FOOD
    : activeTab === "play" ? TOYS
      : activeTab === "style" ? STYLE.filter((item) => item.category === styleFilter)
        : activeTab === "room" ? FURNITURE.filter((item) => roomFilter === "Todos" || item.category === roomFilter)
          : [];

  return (
    <div className={styles.drawer}>
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
            <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <section
        id={panelId}
        role="tabpanel"
        aria-labelledby={`pet-tab-${activeTab}`}
        className={styles.drawerPanel}
        key={activeTab}
      >
        {activeTab === "care" ? (
          <div className={styles.carePanel}>
            <span className={styles.careIllustration} aria-hidden="true"><HandHeart size={48} strokeWidth={1.35} /><PawPrint size={18} /></span>
            <div>
              <h2>Um carinho para {pet.name}</h2>
              <p>Um momento tranquilo, só de vocês.</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === "style" && (
              <FilterStrip label="Categorias de visual" options={STYLE_FILTERS} selected={styleFilter} onSelect={setStyleFilter} />
            )}
            {activeTab === "room" && (
              <FilterStrip label="Categorias de decoração" options={ROOM_FILTERS} selected={roomFilter} onSelect={setRoomFilter} />
            )}
            {(activeTab === "food" || activeTab === "play") && (
              <p className={styles.drawerHint}>{activeTab === "food" ? "Para o cantinho das refeições" : "Para os momentos de brincadeira"}</p>
            )}
            <div className={styles.drawerScroll} key={activeTab === "style" ? styleFilter : activeTab === "room" ? roomFilter : activeTab}>
              <PetItemGrid items={items} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
