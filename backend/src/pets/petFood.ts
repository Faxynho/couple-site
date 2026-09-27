export const PET_FOODS = [
  { id: "biscoito", name: "Biscoitinho", price: 2, satiety: 12 },
  { id: "racao", name: "Ração", price: 4, satiety: 22 },
  { id: "sache", name: "Sachê", price: 7, satiety: 38 },
  { id: "refeicao", name: "Refeição", price: 10, satiety: 56 },
  { id: "premium", name: "Refeição especial", price: 14, satiety: 80 },
] as const;

export function getPetFood(id: unknown) {
  return PET_FOODS.find((food) => food.id === id);
}

export function feedPetPurchase(
  pets: Pick<import("../rooms/persistentDuo").PersistentDuoStore, "getPetCare" | "feedPet">,
  wallet: Pick<import("../idle/IdleStore").IdleStore, "spendPetFood">,
  petId: import("../rooms/persistentDuo").PetRoomId,
  environment: "real" | "dev",
  food: (typeof PET_FOODS)[number],
) {
  const current = pets.getPetCare(petId, environment);
  if (current.satiety >= 100) return { ok: false as const, reason: "full" as const, care: current };
  // Synchronous spend and update: concurrent requests cannot interleave here.
  const payment = wallet.spendPetFood(food.price);
  if (!payment.ok) return { ok: false as const, reason: "coins" as const, care: current, globalCoins: payment.snapshot.globalCoins };
  const care = pets.feedPet(petId, environment, food.satiety);
  return { ok: true as const, care, globalCoins: payment.snapshot.globalCoins };
}
