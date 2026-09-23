export type PetAnimation = "idle";

export interface PetDefinition {
  id: "nix" | "max";
  name: string;
  portrait: string;
  portraitWidth: number;
  portraitHeight: number;
  animations: Record<PetAnimation, {
    src: string;
    frames: number;
    frameWidth: number;
    frameHeight: number;
    duration: number;
  }>;
}

export const PETS: readonly PetDefinition[] = [
  {
    id: "nix",
    name: "Nix",
    portrait: "/pets/nix/portrait.webp",
    portraitWidth: 1229,
    portraitHeight: 1536,
    animations: {
      idle: {
        src: "/pets/nix/idle.webp",
        frames: 8,
        frameWidth: 384,
        frameHeight: 480,
        duration: 2.2,
      },
    },
  },
  {
    id: "max",
    name: "Max",
    portrait: "/pets/max/portrait.webp",
    portraitWidth: 1536,
    portraitHeight: 1536,
    animations: {
      idle: {
        src: "/pets/max/idle-breathing.webp",
        frames: 16,
        frameWidth: 384,
        frameHeight: 384,
        duration: 2.4,
      },
    },
  },
];

export function getPet(id: string): PetDefinition | undefined {
  return PETS.find((pet) => pet.id === id);
}

export function petReturnHref(roomCode?: string): string {
  return roomCode && /^[A-Z0-9]{5}$/.test(roomCode.toUpperCase())
    ? `/sala/${roomCode.toUpperCase()}`
    : "/duo";
}

export function petRoomQuery(roomCode?: string): string {
  return roomCode && /^[A-Z0-9]{5}$/.test(roomCode.toUpperCase())
    ? `?sala=${encodeURIComponent(roomCode.toUpperCase())}`
    : "";
}
