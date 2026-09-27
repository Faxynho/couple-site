"use client";

import { useState } from "react";
import {
  Armchair, BedDouble, Bone, ChevronDown, CircleDot, Crown, Grid3X3, HandHeart,
  Heart, Paintbrush, PawPrint, Shirt, Square, ToyBrick, Coins,
  Utensils, Cookie, FlaskConical, LockKeyhole, RotateCcw, type LucideIcon,
} from "lucide-react";
import type { PetDefinition } from "../config";
import { PET_ROOM_DECORATIONS, type Decoration, type PetRoomSlots } from "../petRoomDecorations";
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
  { label: "Parede", icon: Paintbrush },
  { label: "Chão", icon: Square },
  { label: "Móveis", icon: Armchair },
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

export default function PetRoomDrawer({ pet, slots, ready, error, onToggle, onBuy, coins: _coins, purchased, environment, onDevAction }: {
  pet: PetDefinition;
  slots: PetRoomSlots;
  ready: boolean;
  error: string;
  onToggle: (decoration: Decoration) => void;
  onBuy: (decoration: Decoration) => void;
  coins: number;
  purchased: string[];
  environment: "real" | "dev";
  onDevAction: (payload: Record<string, unknown>) => void;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("food");
  const [styleFilter, setStyleFilter] = useState("Roupas");
  const [roomFilter, setRoomFilter] = useState("Todos");
  const [roomExpanded, setRoomExpanded] = useState(false);
  const [devAmount, setDevAmount] = useState("500");
  const [devDecorationId, setDevDecorationId] = useState(PET_ROOM_DECORATIONS[0].id);
  const panelId = `pet-panel-${activeTab}`;

  const items = activeTab === "food" ? FOOD
    : activeTab === "play" ? TOYS
      : activeTab === "style" ? STYLE.filter((item) => item.category === styleFilter)
        : activeTab === "room" ? []
          : [];

  return (
    <div className={`${styles.drawer} ${activeTab === "room" ? styles.drawerRoom : ""} ${activeTab === "room" && roomExpanded ? styles.drawerRoomExpanded : ""}`}>
      <div
        className={`${styles.tabs} ${activeTab === "room" && roomExpanded ? styles.tabsCollapsed : ""}`}
        role="tablist"
        aria-label={`Áreas do quarto de ${pet.name}`}
        aria-hidden={activeTab === "room" && roomExpanded}
      >
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            id={`pet-tab-${id}`}
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={activeTab === id ? panelId : undefined}
            tabIndex={activeTab === "room" && roomExpanded ? -1 : undefined}
            className={`${styles.tab} ${activeTab === id ? styles.tabActive : ""}`}
            onClick={() => {
              setActiveTab(id);
              setRoomExpanded(false);
            }}
          >
            <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      {activeTab === "room" && roomExpanded && (
        <button
          type="button"
          className={styles.catalogCollapse}
          aria-label="Voltar ao menu principal"
          title="Voltar ao menu principal"
          onClick={() => setRoomExpanded(false)}
        >
          <ChevronDown size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      )}

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
            <div
              className={styles.drawerScroll}
              key={activeTab === "style" ? styleFilter : activeTab === "room" ? roomFilter : activeTab}
              onScroll={(event) => {
                if (activeTab === "room" && !roomExpanded && event.currentTarget.scrollTop > 6) {
                  setRoomExpanded(true);
                }
              }}
            >
              {activeTab === "room" ? (
                <div className={styles.decorGrid}>
                  {PET_ROOM_DECORATIONS.filter((item) => roomFilter === "Todos" || item.category === roomFilter).map((item) => {
                    const selected = slots[item.slot] === item.id;
                    const owned = purchased.includes(item.id);
                    return (
                      <button key={item.id} type="button" className={`${styles.decorCard} ${selected ? styles.decorCardActive : ""} ${!owned ? styles.decorCardLocked : ""}`}
                        aria-pressed={selected} aria-label={owned ? `${selected ? "Remover" : "Colocar"} ${item.name}` : `Comprar ${item.name} por ${item.price} moedas globais`}
                        disabled={!ready} onClick={() => {
                          setRoomExpanded(true);
                          if (owned) onToggle(item);
                          else onBuy(item);
                        }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.asset} alt="" loading="lazy" className={styles.decorPreview} />
                        {!owned && <span className={styles.decorLock}><LockKeyhole size={15} /></span>}
                        <span className={styles.decorLabel}>{item.name}</span>
                        <span className={styles.decorIndicator}>{owned ? selected ? "Colocado" : "Colocar" : <><img src="/idle/icons/global-coin.webp" alt="" /> {item.price}</>}</span>
                      </button>
                    );
                  })}
                </div>
              ) : <PetItemGrid items={items} />}
            </div>
            {activeTab === "room" && (error || !ready) && <p className={styles.decorStatus} role="status">{error || "Carregando decorações..."}</p>}
            {activeTab === "room" && environment === "dev" && <details className={styles.petDevTools}>
              <summary><FlaskConical size={16} /> Ferramentas PET DEV</summary>
              <label><Coins size={15} /> Moeda global DEV<input inputMode="numeric" value={devAmount} onChange={(event) => setDevAmount(event.target.value.replace(/\D/g, ""))} aria-label="Quantidade de moeda DEV" /></label>
              <div>
                <button onClick={() => onDevAction({ action: "balance", operation: "add", amount: Number(devAmount) || 0 })}>Adicionar</button>
                <button onClick={() => onDevAction({ action: "balance", operation: "remove", amount: Number(devAmount) || 0 })}>Remover</button>
                <button onClick={() => onDevAction({ action: "balance", operation: "set", amount: Number(devAmount) || 0 })}>Definir</button>
                <button className={styles.petDevDanger} onClick={() => window.confirm("Zerar somente a moeda global DEV?") && onDevAction({ action: "balance", operation: "zero" })}>Zerar moeda</button>
              </div>
              <label>Decoração DEV<select value={devDecorationId} onChange={(event) => setDevDecorationId(event.target.value)}>{PET_ROOM_DECORATIONS.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
              <div>
                <button onClick={() => onDevAction({ action: "decoration", decorationId: devDecorationId, owned: true })}>Desbloquear uma</button>
                <button className={styles.petDevDanger} onClick={() => window.confirm("Bloquear esta decoração DEV e removê-la dos quartos DEV?") && onDevAction({ action: "decoration", decorationId: devDecorationId, owned: false })}>Bloquear uma</button>
                <button onClick={() => onDevAction({ action: "allDecorations", owned: true })}>Desbloquear todas</button>
                <button className={styles.petDevDanger} onClick={() => window.confirm("Remover todas as compras de decoração PET DEV?") && onDevAction({ action: "allDecorations", owned: false })}>Nenhuma comprada</button>
                <button className={styles.petDevDanger} onClick={() => window.confirm(`Resetar somente o quarto ${pet.name} DEV?`) && onDevAction({ action: "resetRoom", petId: pet.id })}><RotateCcw size={14} /> Resetar {pet.name} DEV</button>
                <button className={styles.petDevDanger} onClick={() => window.confirm("Resetar Nix DEV, Max DEV e compras PET DEV? A moeda DEV será preservada.") && onDevAction({ action: "resetEnvironment" })}>Reset geral PET DEV</button>
              </div>
            </details>}
          </>
        )}
      </section>
    </div>
  );
}
