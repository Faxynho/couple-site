"use client";

import { useState, type ReactNode } from "react";
import {
  Armchair, BedDouble, Bone, ChevronDown, CircleDot, Crown, Grid3X3,
  Flower2, Heart, Paintbrush, PawPrint, Shirt, Square, ToyBrick, Coins, Layers3,
  Utensils, FlaskConical, LockKeyhole, RotateCcw, ChevronLeft, type LucideIcon,
} from "lucide-react";
import type { PetDefinition } from "../config";
import type { PetCareSnapshot } from "@/lib/petApi";
import type { PetFood } from "../food";
import PetFoodShelf from "./PetFoodShelf";
import { DECOR_COLLECTIONS, PET_ROOM_DECORATIONS, type DecorCollection, type Decoration, type PetRoomSlots } from "../petRoomDecorations";
import PetItemGrid, { type PetItemPreview } from "./PetItemGrid";
import styles from "../PetRoom.module.css";

const TABS = [
  { id: "care", label: "Carinho", icon: Heart },
  { id: "food", label: "Comida", icon: Utensils },
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
  { label: "Brinquedos", icon: ToyBrick },
  { label: "Estrutura", icon: Layers3 },
];

const COLLECTION_ICONS: Record<DecorCollection, LucideIcon> = { feminine: Flower2, masculine: Bone };
const COLLECTION_PREVIEWS: Record<DecorCollection, string> = {
  feminine: "/images/pets/room/decor/bed-heart.webp",
  masculine: "/images/pets/room/decor/blue-star-dog-bed.webp",
};

const DEV_AFFECTION_PRESETS = [
  { value: 0, label: "Zerado" },
  { value: 25, label: "Baixo" },
  { value: 50, label: "Médio" },
  { value: 75, label: "Alto" },
  { value: 100, label: "Máximo" },
] as const;
const DEV_SATIETY_PRESETS = [
  { value: 0, label: "Faminto" },
  { value: 25, label: "Muita fome" },
  { value: 50, label: "Com fome" },
  { value: 75, label: "Pouca fome" },
  { value: 100, label: "Cheio" },
] as const;

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
  leading,
}: {
  label: string;
  options: readonly { label: string; icon: LucideIcon }[];
  selected: string;
  onSelect: (value: string) => void;
  leading?: ReactNode;
}) {
  return (
    <div className={styles.filterStrip} role="group" aria-label={label}>
      {leading}
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

function CareMeter({ label, value, icon: Icon, tone }: { label: string; value: number | undefined; icon: LucideIcon; tone: "heart" | "meal" }) {
  return <div className={`${styles.careMeter} ${tone === "meal" ? styles.careMeal : styles.careHeart}`}>
    <span className={styles.careIcon}><Icon size={26} strokeWidth={1.8} aria-hidden="true" /></span>
    <div className={styles.careMeasure}>
      <span className={styles.careMeasureText}><strong>{label}</strong><span>{value === undefined ? "—" : `${Math.round(value)}%`}</span></span>
      <span className={styles.careTrack} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value === undefined ? 0 : Math.round(value)}>
        <span className={styles.careFill} style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
      </span>
    </div>
  </div>;
}

export default function PetRoomDrawer({ pet, slots, ready, error, onToggle, onBuy, coins: _coins, purchased, environment, onDevAction, care = null, onFeed = async () => false, onFoodArrive = () => {}, onFoodHover = () => {}, feedback = "" }: {
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
  care?: PetCareSnapshot | null;
  onFeed?: (food: PetFood) => Promise<boolean>;
  onFoodArrive?: () => void;
  onFoodHover?: (value: boolean) => void;
  feedback?: string;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("care");
  const [styleFilter, setStyleFilter] = useState("Roupas");
  const [roomFilter, setRoomFilter] = useState("Todos");
  // null = the "Feminino / Masculino" choice that comes before the catalog.
  const [roomCollection, setRoomCollection] = useState<DecorCollection | null>(null);
  const [roomExpanded, setRoomExpanded] = useState(false);
  const [devAmount, setDevAmount] = useState("500");
  const [devDecorationId, setDevDecorationId] = useState(PET_ROOM_DECORATIONS[0].id);
  const panelId = `pet-panel-${activeTab}`;

  const items = activeTab === "play" ? TOYS
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
              if (id === "room" && activeTab !== "room") setRoomCollection(null);
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
            <div className={styles.careHeading}><span className={styles.careHeadingMark} aria-hidden="true"><PawPrint size={22} /></span><h2>Faça carinho {pet.id === "nix" ? "na" : "no"} {pet.name}</h2><span className={styles.careTitleHeart} aria-hidden="true">♥</span><span className={styles.careMood} data-mood={care?.mood}>{care?.mood === "sad" ? "Triste" : care?.mood === "neutral" ? "Sério" : care ? "Feliz" : "—"}</span></div>
            <div className={styles.careMeters}><CareMeter label="Carinho" value={care?.affection} icon={Heart} tone="heart" /><CareMeter label="Saciedade" value={care?.satiety} icon={Utensils} tone="meal" /></div>
            {environment === "dev" && (
              <details className={styles.petDevCareTools}>
                <summary><FlaskConical size={15} /> Forçar estado DEV</summary>
                <div className={styles.petDevCareGroup}>
                  <span className={styles.petDevCareLabel}><Heart size={14} /> Carinho</span>
                  <div className={styles.petDevPresetGrid}>
                    {DEV_AFFECTION_PRESETS.map((preset) => (
                      <button type="button" key={preset.value} disabled={!care}
                        aria-label={`Carinho ${preset.label}, ${preset.value}%`}
                        aria-pressed={Boolean(care && Math.abs(care.affection - preset.value) < 1)}
                        onClick={() => onDevAction({ action: "care", petId: pet.id, affection: preset.value })}>
                        <strong>{preset.label}</strong><small>{preset.value}%</small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.petDevCareGroup}>
                  <span className={styles.petDevCareLabel}><Utensils size={14} /> Saciedade</span>
                  <div className={styles.petDevPresetGrid}>
                    {DEV_SATIETY_PRESETS.map((preset) => (
                      <button type="button" key={preset.value} disabled={!care}
                        aria-label={`Saciedade ${preset.label}, ${preset.value}%`}
                        aria-pressed={Boolean(care && Math.abs(care.satiety - preset.value) < 1)}
                        onClick={() => onDevAction({ action: "care", petId: pet.id, satiety: preset.value })}>
                        <strong>{preset.label}</strong><small>{preset.value}%</small>
                      </button>
                    ))}
                  </div>
                </div>
              </details>
            )}
          </div>
        ) : (
          <>
            {activeTab === "style" && (
              <FilterStrip label="Categorias de visual" options={STYLE_FILTERS} selected={styleFilter} onSelect={setStyleFilter} />
            )}
            {activeTab === "room" && roomCollection && (
              <FilterStrip label="Categorias de decoração" options={ROOM_FILTERS} selected={roomFilter} onSelect={setRoomFilter}
                leading={
                  <button type="button" className={styles.collectionBack} aria-label="Trocar coleção de decorações"
                    onClick={() => { setRoomCollection(null); setRoomExpanded(false); }}>
                    <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
                    <span>{DECOR_COLLECTIONS.find((value) => value.id === roomCollection)?.label}</span>
                  </button>
                } />
            )}
            {activeTab === "play" && (
              <p className={styles.drawerHint}>Para os momentos de brincadeira</p>
            )}
            <div
              className={styles.drawerScroll}
              key={activeTab === "style" ? styleFilter : activeTab === "room" ? `${roomCollection}-${roomFilter}` : activeTab}
              onScroll={(event) => {
                if (activeTab === "room" && !roomExpanded && event.currentTarget.scrollTop > 6) {
                  setRoomExpanded(true);
                }
              }}
            >
              {activeTab === "room" && !roomCollection ? (
                <div className={styles.collectionChoice} role="group" aria-label="Coleção de decorações">
                  {DECOR_COLLECTIONS.map(({ id, label }) => {
                    const Icon = COLLECTION_ICONS[id];
                    const count = PET_ROOM_DECORATIONS.filter((item) => item.collection === id).length;
                    return (
                      <button type="button" key={id} className={`${styles.collectionCard} ${id === "masculine" ? styles.collectionMasculine : ""}`}
                        onClick={() => { setRoomCollection(id); setRoomFilter("Todos"); }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={COLLECTION_PREVIEWS[id]} alt="" loading="lazy" decoding="async" />
                        <span className={styles.collectionTitle}><Icon size={17} strokeWidth={1.9} aria-hidden="true" />{label}</span>
                        <span className={styles.collectionCount}>{count} decorações</span>
                      </button>
                    );
                  })}
                </div>
              ) : activeTab === "room" ? (
                <div className={styles.decorGrid}>
                  {PET_ROOM_DECORATIONS.filter((item) => item.collection === roomCollection && (roomFilter === "Todos" || item.category === roomFilter))
                    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, "pt-BR"))
                    .map((item) => {
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
                        <img src={item.asset} alt="" loading="lazy" decoding="async" className={styles.decorPreview} />
                        {!owned && <span className={styles.decorLock}><LockKeyhole size={15} /></span>}
                        <span className={styles.decorLabel}>{item.name}</span>
                        <span className={styles.decorIndicator}>{owned ? selected ? "Colocado" : "Colocar" : <><img src="/idle/icons/global-coin.webp" alt="" /> {item.price}</>}</span>
                      </button>
                    );
                  })}
                </div>
              ) : activeTab === "food" ? <PetFoodShelf onFeed={onFeed} onArrive={onFoodArrive} onHover={onFoodHover} ready={ready && Boolean(care)} /> : <PetItemGrid items={items} />}
            </div>
            {activeTab === "food" && feedback && <p className={styles.foodFeedback} role="status">{feedback}</p>}
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
              <label>Decoração DEV<select value={devDecorationId} onChange={(event) => setDevDecorationId(event.target.value)}>{DECOR_COLLECTIONS.map(({ id, label }) => <optgroup label={label} key={id}>{PET_ROOM_DECORATIONS.filter((item) => item.collection === id).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</optgroup>)}</select></label>
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

