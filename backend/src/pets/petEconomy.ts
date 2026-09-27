export const PET_DECORATION_PRICES = {
  bone: 80,
  bowls: 100,
  "paw-poster": 120,
  "heart-frame": 140,
  lamp: 180,
  plant: 220,
  shelf: 260,
  rug: 320,
  dresser: 400,
  bed: 500,
} as const;

export type PetDecorationId = keyof typeof PET_DECORATION_PRICES;
export const PET_DECORATION_IDS = Object.keys(PET_DECORATION_PRICES) as PetDecorationId[];
export const PET_DECORATION_TOTAL_PRICE = Object.values(PET_DECORATION_PRICES).reduce((sum, price) => sum + price, 0);

export function isPetDecorationId(value: unknown): value is PetDecorationId {
  return typeof value === "string" && value in PET_DECORATION_PRICES;
}
