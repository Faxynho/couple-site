export type PetAnimation = "idle";

interface PetBase {
  id: "nix" | "max";
  name: string;
  portrait: string;
  portraitWidth: number;
  portraitHeight: number;
}

interface SheetPet extends PetBase {
  renderer: "sheet";
  animations: Record<PetAnimation, {
    src: string;
    frames: number;
    frameWidth: number;
    frameHeight: number;
    duration: number;
  }>;
}

interface RigPart {
  src: string;
  // Coordinates in the original square master artwork, kept at one scale.
  x: number;
  y: number;
  width: number;
  height: number;
  motion: "fixed" | "breath" | "head";
}

interface RigPet extends PetBase {
  renderer: "rig";
  rig: {
    canvasSize: number;
    duration: number;
    parts: readonly RigPart[];
  };
}

export type PetDefinition = SheetPet | RigPet;

export const PETS: readonly PetDefinition[] = [
  {
    id: "nix",
    name: "Nix",
    renderer: "sheet",
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
    renderer: "rig",
    portrait: "/pets/max/portrait.webp",
    portraitWidth: 1125,
    portraitHeight: 1536,
    rig: {
      canvasSize: 1536,
      duration: 3.4,
      parts: [
        { src: "/pets/max/body.webp", x: 190, y: 585, width: 1110, height: 935, motion: "fixed" },
        { src: "/pets/max/chest.webp", x: 625, y: 640, width: 510, height: 430, motion: "breath" },
        { src: "/pets/max/head.webp", x: 370, y: 10, width: 930, height: 740, motion: "head" },
      ],
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
