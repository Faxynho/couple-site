export type PetAnimation = "idle" | "petting" | "eating";
export type PetMood = "happy" | "neutral" | "sad";

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
    // Optional anatomical adjustments; absent values keep Max's established motion.
    motion?: { breathWidth?: number; breathHeight?: number; ear?: number };
    blink?: {
      half: string;
      closed: string;
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

export type PetDefinition = SheetPet | RigPet;

export const PETS: readonly PetDefinition[] = [
  {
    id: "nix",
    name: "Nix",
    renderer: "rig",
    portrait: "/pets/nix/portrait.webp",
    portraitWidth: 1229,
    portraitHeight: 1536,
    rig: {
      canvasSize: 1536,
      duration: 3.6,
      motion: { breathWidth: 0.36, breathHeight: 0.7, ear: 0.42 },
      blink: {
        half: "/pets/nix/blink-half.webp",
        closed: "/pets/nix/blink-closed.webp",
        x: 588, y: 302, width: 405, height: 173,
      },
      // The supplied 1229px artwork is centered inside the rig's 1536px square.
      // Four feet stay in the fixed body; all other layers overlap their joints.
      parts: [
        { src: "/pets/nix/tail.webp", x: 183, y: 1040, width: 390, height: 390, motion: "tail", pivot: { x: 82, y: 36 } },
        { src: "/pets/nix/body.webp", x: 308, y: 580, width: 960, height: 950, motion: "fixed" },
        { src: "/pets/nix/chest.webp", x: 498, y: 655, width: 570, height: 410, motion: "breath", pivot: { x: 50, y: 84 } },
        { src: "/pets/nix/head.webp", x: 383, y: 180, width: 790, height: 645, motion: "head" },
        { src: "/pets/nix/ear-left.webp", x: 403, y: 0, width: 290, height: 450, motion: "earLeft", pivot: { x: 62, y: 82 } },
        { src: "/pets/nix/ear-right.webp", x: 883, y: 5, width: 310, height: 450, motion: "earRight", pivot: { x: 39, y: 83 } },
      ],
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
      duration: 3.3,
      blink: {
        half: "/pets/max/blink-half.webp",
        closed: "/pets/max/blink-closed.webp",
        x: 620,
        y: 195,
        width: 460,
        height: 255,
      },
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
