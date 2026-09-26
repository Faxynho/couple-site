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
  // Composition follows the room reference: wall art is more readable, the left side is
  // anchored by the plant/bed, the rug frames the pet, and the right-side props sit higher.
  { id: "heart-frame", name: "Quadro coração", asset: art("heart-frame"), category: "Parede", slot: "wall-heart", position: { left: 7, top: 21, width: 11.5 }, layer: "wall" },
  { id: "paw-poster", name: "Quadro patinha", asset: art("paw-poster"), category: "Parede", slot: "wall-paw", position: { left: 7, top: 35, width: 11.5 }, layer: "wall" },
  { id: "shelf", name: "Prateleira", asset: art("shelf"), category: "Parede", slot: "wall-shelf", position: { left: 70, top: 29, width: 27 }, layer: "wall" },
  { id: "plant", name: "Planta", asset: art("plant"), category: "Chão", slot: "floor-plant", position: { left: 0, bottom: 29, width: 27 }, layer: "rear" },
  { id: "rug", name: "Tapete", asset: art("rug"), category: "Chão", slot: "floor-rug", position: { left: 12, bottom: 3.5, width: 76 }, layer: "rear" },
  { id: "bed", name: "Caminha", asset: art("bed"), category: "Móveis", slot: "floor-bed", position: { left: 1, bottom: 17, width: 34 }, layer: "rear" },
  { id: "dresser", name: "Cômoda", asset: art("dresser"), category: "Móveis", slot: "floor-dresser", position: { left: 80, bottom: 23, width: 18 }, layer: "rear" },
  { id: "lamp", name: "Abajur", asset: art("lamp"), category: "Móveis", slot: "floor-lamp", position: { left: 78, top: 20.5, width: 12 }, layer: "wall", light: { originX: 50, originY: 18 } },
  { id: "bowls", name: "Potes", asset: art("bowls"), category: "Chão", slot: "floor-bowls", position: { left: 74, bottom: 7, width: 21 }, layer: "front" },
  { id: "bone", name: "Ossinho", asset: art("bone"), category: "Chão", slot: "floor-bone", position: { left: 66, bottom: 16.5, width: 11.5 }, layer: "rear" },
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
