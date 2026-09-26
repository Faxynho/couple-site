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
  light?: { originX: number; originY: number };
}

const art = (name: string) => `/images/pets/room/decor/${name}.webp`;

// Positions are percentages of the stage. Slots are validated on the server.
export const PET_ROOM_DECORATIONS: readonly Decoration[] = [
  { id: "heart-frame", name: "Quadro coração", asset: art("heart-frame"), category: "Parede", slot: "wall-heart", position: { left: 8, top: 22, width: 9 }, layer: "wall" },
  { id: "paw-poster", name: "Quadro patinha", asset: art("paw-poster"), category: "Parede", slot: "wall-paw", position: { left: 8, top: 34, width: 9 }, layer: "wall" },
  { id: "shelf", name: "Prateleira", asset: art("shelf"), category: "Parede", slot: "wall-shelf", position: { left: 73, top: 29, width: 22 }, layer: "wall" },
  { id: "plant", name: "Planta", asset: art("plant"), category: "Chão", slot: "floor-plant", position: { left: 2, bottom: 27, width: 18 }, layer: "rear" },
  { id: "rug", name: "Tapete", asset: art("rug"), category: "Chão", slot: "floor-rug", position: { left: 21, bottom: 4, width: 57 }, layer: "rear" },
  { id: "bed", name: "Caminha", asset: art("bed"), category: "Móveis", slot: "floor-bed", position: { left: 2, bottom: 14, width: 30 }, layer: "rear" },
  { id: "dresser", name: "Cômoda", asset: art("dresser"), category: "Móveis", slot: "floor-dresser", position: { left: 82, bottom: 19, width: 16 }, layer: "rear" },
  { id: "lamp", name: "Abajur", asset: art("lamp"), category: "Móveis", slot: "floor-lamp", position: { left: 71, bottom: 19, width: 10 }, layer: "rear", light: { originX: 50, originY: 18 } },
  { id: "bowls", name: "Potes", asset: art("bowls"), category: "Chão", slot: "floor-bowls", position: { left: 76, bottom: 5, width: 22 }, layer: "front" },
  { id: "bone", name: "Ossinho", asset: art("bone"), category: "Chão", slot: "floor-bone", position: { left: 69, bottom: 13, width: 10 }, layer: "rear" },
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
