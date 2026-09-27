import catalog from "./catalog.json";

/** Generated from the ZIP manifest; parity with the frontend is checked in tests. */
export const PET_DECORATION_CATALOG = catalog;
export const PET_DECORATION_PRICES: Readonly<Record<string, number>> = Object.fromEntries(
  catalog.map(({ id, price }) => [id, price]),
);
export type PetDecorationId = string;
export const PET_DECORATION_IDS = catalog.map(({ id }) => id);
export const PET_DECORATION_TOTAL_PRICE = catalog.reduce((sum, item) => sum + item.price, 0);

/** The ten items owned before the shop existed; never expand this for a new release. */
export const LEGACY_PET_DECORATION_IDS = [
  "heart-frame", "paw-poster", "shelf", "plant", "rug",
  "bed", "dresser", "lamp", "bowls", "bone",
] as const;

export function isPetDecorationId(value: unknown): value is PetDecorationId {
  return typeof value === "string" && Object.hasOwn(PET_DECORATION_PRICES, value);
}
