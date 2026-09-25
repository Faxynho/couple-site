import type { CSSProperties } from "react";

export type PetId = "nix" | "max";
export type DecorCategory = "Parede" | "Chão" | "Móveis";

export interface Decoration {
  id: string;
  name: string;
  asset: string;
  category: DecorCategory;
  slot: string;
  position: { left: number; top?: number; bottom?: number; width: number };
  layer: "wall" | "rear" | "front";
}

const art = (name: string) => `/images/pets/room/decor/${name}.svg`;

// Percentages refer to the room stage. Objects retain their intrinsic SVG aspect ratio.
// A slot has one occupant; selecting another item in it replaces the current one.
export const PET_ROOM_DECORATIONS: readonly Decoration[] = [
  { id: "heart-frame", name: "Quadro coração", asset: art("heart-frame"), category: "Parede", slot: "wall-left", position: { left: 7, top: 28, width: 14 }, layer: "wall" },
  { id: "paw-poster", name: "Pôster de patinha", asset: art("paw-poster"), category: "Parede", slot: "wall-left", position: { left: 7, top: 26, width: 14 }, layer: "wall" },
  { id: "clock", name: "Relógio", asset: art("clock"), category: "Parede", slot: "wall-left", position: { left: 7, top: 27, width: 13 }, layer: "wall" },
  { id: "polaroids", name: "Fotinhas", asset: art("polaroids"), category: "Parede", slot: "wall-right", position: { left: 71, top: 27, width: 23 }, layer: "wall" },
  { id: "garland", name: "Cordão de luzes", asset: art("garland"), category: "Parede", slot: "wall-high", position: { left: 5, top: 15, width: 28 }, layer: "wall" },
  { id: "heart-mobile", name: "Corações suspensos", asset: art("heart-mobile"), category: "Parede", slot: "wall-high", position: { left: 14, top: 11, width: 13 }, layer: "wall" },
  { id: "pillow", name: "Almofada", asset: art("pillow"), category: "Chão", slot: "floor-left", position: { left: 6, bottom: 4, width: 17 }, layer: "front" },
  { id: "toy-basket", name: "Cesta de brinquedos", asset: art("toy-basket"), category: "Chão", slot: "floor-left", position: { left: 5, bottom: 3, width: 18 }, layer: "front" },
  { id: "plush", name: "Ursinho de pelúcia", asset: art("plush"), category: "Chão", slot: "floor-left", position: { left: 8, bottom: 3, width: 13 }, layer: "front" },
  { id: "rope-toy", name: "Brinquedo de corda", asset: art("rope-toy"), category: "Chão", slot: "floor-right", position: { left: 76, bottom: 5, width: 15 }, layer: "front" },
  { id: "ball", name: "Bolinha lilás", asset: art("ball"), category: "Chão", slot: "floor-right", position: { left: 80, bottom: 5, width: 10 }, layer: "front" },
  { id: "flowers", name: "Vaso de flores", asset: art("flowers"), category: "Chão", slot: "floor-corner", position: { left: 75, bottom: 29, width: 10 }, layer: "rear" },
  { id: "storage-box", name: "Caixa organizadora", asset: art("storage-box"), category: "Móveis", slot: "furniture-right", position: { left: 75, bottom: 18, width: 14 }, layer: "rear" },
  { id: "side-table", name: "Mesinha de flores", asset: art("side-table"), category: "Móveis", slot: "furniture-right", position: { left: 72, bottom: 17, width: 17 }, layer: "rear" },
  { id: "star-lamp", name: "Luz de estrela", asset: art("star-lamp"), category: "Móveis", slot: "furniture-top", position: { left: 85, bottom: 37, width: 8 }, layer: "rear" },
  { id: "blanket", name: "Mantinha lilás", asset: art("blanket"), category: "Móveis", slot: "bed-top", position: { left: 8, bottom: 16, width: 18 }, layer: "front" },
];

export type PetRoomSlots = Record<string, string>;
export interface PetRoomSnapshot {
  petId: PetId;
  revision: number;
  slots: PetRoomSlots;
}

export function decorationStyle(decoration: Decoration): CSSProperties {
  return {
    left: `${decoration.position.left}%`,
    top: decoration.position.top === undefined ? undefined : `${decoration.position.top}%`,
    bottom: decoration.position.bottom === undefined ? undefined : `${decoration.position.bottom}%`,
    width: `${decoration.position.width}%`,
  };
}

export function toggledSlots(current: PetRoomSlots, decoration: Decoration): PetRoomSlots {
  const next = { ...current };
  if (next[decoration.slot] === decoration.id) delete next[decoration.slot];
  else next[decoration.slot] = decoration.id;
  return next;
}
