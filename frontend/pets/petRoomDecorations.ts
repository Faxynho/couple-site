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
  /** Stable scene depth. Higher values always render in front, regardless of toggle order. */
  stack: number;
  light?: { originX: number; originY: number };
  price: number;
}

const art = (name: string) => `/images/pets/room/decor/${name}.webp`;

// Positions are percentages of the stage. Slots are validated on the server.
export const PET_ROOM_DECORATIONS: readonly Decoration[] = [
  // Composition follows the room reference: wall art sits higher, the enlarged plant stays
  // above the curtain layer, the bed/dresser are lifted, and the lamp rests on the dresser.
  { id: "heart-frame", name: "Quadro coração", price: 140, asset: art("heart-frame"), category: "Parede", slot: "wall-heart", position: { left: 7, top: 15, width: 11.5 }, layer: "wall", stack: 30 },
  { id: "paw-poster", name: "Quadro patinha", price: 120, asset: art("paw-poster"), category: "Parede", slot: "wall-paw", position: { left: 7, top: 28.5, width: 11.5 }, layer: "wall", stack: 31 },
  { id: "shelf", name: "Prateleira", price: 260, asset: art("shelf"), category: "Parede", slot: "wall-shelf", position: { left: 70, top: 29, width: 27 }, layer: "wall", stack: 32 },
  { id: "plant", name: "Planta", price: 220, asset: art("plant"), category: "Chão", slot: "floor-plant", position: { left: -1, bottom: 33.5, width: 31 }, layer: "rear", stack: 60 },
  { id: "rug", name: "Tapete", price: 320, asset: art("rug"), category: "Chão", slot: "floor-rug", position: { left: 12, bottom: 3.5, width: 76 }, layer: "rear", stack: 50 },
  { id: "bed", name: "Caminha", price: 500, asset: art("bed"), category: "Móveis", slot: "floor-bed", position: { left: 0, bottom: 21.5, width: 38 }, layer: "rear", stack: 70 },
  { id: "dresser", name: "Cômoda", price: 400, asset: art("dresser"), category: "Móveis", slot: "floor-dresser", position: { left: 77.5, bottom: 27, width: 21 }, layer: "rear", stack: 65 },
  { id: "lamp", name: "Abajur", price: 180, asset: art("lamp"), category: "Móveis", slot: "floor-lamp", position: { left: 82.25, bottom: 42.5, width: 11.5 }, layer: "rear", stack: 125, light: { originX: 50, originY: 18 } },
  { id: "bowls", name: "Potes", price: 100, asset: art("bowls"), category: "Chão", slot: "floor-bowls", position: { left: 73, bottom: 7.5, width: 25 }, layer: "front", stack: 74 },
  { id: "bone", name: "Ossinho", price: 80, asset: art("bone"), category: "Chão", slot: "floor-bone", position: { left: 71, bottom: 16.5, width: 13.5 }, layer: "rear", stack: 72 },
];

export type PetRoomSlots = Record<string, string>;
export interface PetRoomSnapshot {
  petId: PetId;
  environment: "real" | "dev";
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
