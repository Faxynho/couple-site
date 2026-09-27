export const PET_FOODS = [
  { id: "biscoito", name: "Biscoitinho", price: 2, satiety: 12 },
  { id: "racao", name: "Ração", price: 4, satiety: 22 },
  { id: "sache", name: "Sachê", price: 7, satiety: 38 },
  { id: "refeicao", name: "Refeição", price: 10, satiety: 56 },
  { id: "premium", name: "Refeição especial", price: 14, satiety: 80 },
] as const;
export type PetFood = (typeof PET_FOODS)[number];
