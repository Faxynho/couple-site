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
  motion: "fixed" | "breath" | "head" | "earLeft" | "earRight" | "tail";
  pivot?: { x: number; y: number };
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
      duration: 3.6,
      parts: [
        { src: "/pets/max/tail.webp", x: 180, y: 880, width: 520, height: 500, motion: "tail", pivot: { x: 82, y: 45 } },
        { src: "/pets/max/body.webp", x: 190, y: 585, width: 1110, height: 935, motion: "fixed" },
        { src: "/pets/max/chest.webp", x: 585, y: 595, width: 605, height: 570, motion: "breath", pivot: { x: 50, y: 82 } },
        { src: "/pets/max/head.webp", x: 370, y: 10, width: 930, height: 740, motion: "head" },
        { src: "/pets/max/ear-left.webp", x: 350, y: 130, width: 320, height: 495, motion: "earLeft", pivot: { x: 88, y: 8 } },
        { src: "/pets/max/ear-right.webp", x: 985, y: 125, width: 315, height: 380, motion: "earRight", pivot: { x: 14, y: 11 } },
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
