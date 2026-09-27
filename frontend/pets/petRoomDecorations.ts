import type { CSSProperties } from "react";
import catalog from "./catalog.json";

export type PetId = "nix" | "max";
export type DecorCategory = "Parede" | "Chão" | "Móveis" | "Brinquedos" | "Estrutura";

export interface Decoration {
  id: string;
  name: string;
  asset: string;
  category: DecorCategory;
  slot: string;
  kind: "decor" | "curtain" | "structure";
  conflictsWithSlots?: readonly string[];
  position: { left: number; top?: number; bottom?: number; width: number };
  layer: "wall" | "rear" | "front";
  /** Stable scene depth. Higher values always render in front, regardless of toggle order. */
  stack: number;
  light?: { originX: number; originY: number };
  price: number;
}

// Both copies are generated from scripts/build_pet_room_assets.py and tested for parity.
export const PET_ROOM_DECORATIONS: readonly Decoration[] = catalog as readonly Decoration[];

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
  else {
    for (const slot of decoration.conflictsWithSlots || []) delete next[slot];
    next[decoration.slot] = decoration.id;
  }
  return next;
}
