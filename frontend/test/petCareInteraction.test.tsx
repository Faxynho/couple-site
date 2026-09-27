import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import PetInteraction, { isPetDropPoint } from "../pets/components/PetInteraction";
import { PETS } from "../pets/config";
import { PET_FOODS } from "../pets/food";
import PetFoodShelf from "../pets/components/PetFoodShelf";
import PetRoomDrawer from "../pets/components/PetRoomDrawer";

vi.mock("../pets/components/PetSprite", () => ({ default: ({ animation, mood }: { animation: string; mood: string }) => <span data-action={animation} data-mood={mood} /> }));
afterEach(cleanup);

test("somente um deslize real dentro do pet causa carinho e corações", async () => {
  class MockPointerEvent extends MouseEvent { pointerId: number; constructor(type: string, init: MouseEventInit & { pointerId?: number }) { super(type, init); this.pointerId = init.pointerId ?? 0; } }
  Object.defineProperty(window, "PointerEvent", { configurable: true, value: MockPointerEvent });
  const stroke = vi.fn().mockResolvedValue(true);
  const { container } = render(<PetInteraction pet={PETS[0]} mood="neutral" onStroke={stroke} />);
  const pet = container.querySelector("[data-pet-drop-target]") as HTMLElement;
  pet.setPointerCapture = vi.fn();
  pet.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON: () => ({}) });
  fireEvent.pointerDown(pet, { pointerId: 1, clientX: 100, clientY: 100 });
  expect(pet.setPointerCapture).toHaveBeenCalledWith(1);
  fireEvent.pointerMove(pet, { pointerId: 1, clientX: 105, clientY: 102 });
  expect(stroke).not.toHaveBeenCalled();
  fireEvent.pointerMove(pet, { pointerId: 1, clientX: 155, clientY: 104 });
  await waitFor(() => expect(stroke).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(pet.textContent).toContain("♥"));
  expect(container.querySelector("[data-action='petting']")).toBeTruthy();
  fireEvent.pointerUp(pet, { pointerId: 1 });
  fireEvent.pointerMove(pet, { pointerId: 1, clientX: 105, clientY: 105 });
  expect(stroke).toHaveBeenCalledTimes(1);
  expect(isPetDropPoint(pet, 100, 100)).toBe(true);
  expect(isPetDropPoint(pet, 5, 5)).toBe(false);
});

test("comidas têm cinco valores crescentes e imagens próprias", () => {
  expect(PET_FOODS).toHaveLength(5);
  for (const [index, food] of PET_FOODS.entries()) {
    expect(food.price).toBeGreaterThan(0);
    expect(food.satiety).toBeGreaterThan(0);
    if (index) expect(food.price).toBeGreaterThan(PET_FOODS[index - 1].price);
  }
});

test("soltar comida fora cancela; somente soltar no pet solicita alimentação", async () => {
  class MockPointerEvent extends MouseEvent { pointerId: number; constructor(type: string, init: MouseEventInit & { pointerId?: number }) { super(type, init); this.pointerId = init.pointerId ?? 0; } }
  Object.defineProperty(window, "PointerEvent", { configurable: true, value: MockPointerEvent });
  const onFeed = vi.fn().mockResolvedValue(false);
  const hover = vi.fn();
  const { container } = render(<><span data-pet-drop-target="" /><PetFoodShelf onFeed={onFeed} onHover={hover} ready /></>);
  const target = container.querySelector("[data-pet-drop-target]") as HTMLElement;
  target.getBoundingClientRect = () => ({ left: 100, top: 100, width: 100, height: 100, right: 200, bottom: 200, x: 100, y: 100, toJSON: () => ({}) });
  const biscuit = container.querySelector("button") as HTMLButtonElement;
  fireEvent.pointerDown(biscuit, { pointerId: 1, clientX: 30, clientY: 250 });
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 50, clientY: 220 });
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 50, clientY: 220 });
  expect(onFeed).not.toHaveBeenCalled();
  for (const [index, food] of PET_FOODS.entries()) {
    const button = container.querySelectorAll("button")[index];
    fireEvent.pointerDown(button, { pointerId: index + 2, clientX: 30, clientY: 250 });
    fireEvent.pointerMove(window, { pointerId: index + 2, clientX: 150, clientY: 150 });
    expect(hover).toHaveBeenCalledWith(true);
    fireEvent.pointerUp(window, { pointerId: index + 2, clientX: 150, clientY: 150 });
    await waitFor(() => expect(onFeed).toHaveBeenCalledWith(food));
  }
  expect(onFeed).toHaveBeenCalledTimes(5);
});

test.each(PETS)("$name abre Carinho primeiro, mostra seu humor e deixa Comida em segundo", (pet) => {
  const { container } = render(<PetRoomDrawer pet={pet} slots={{}} ready error="" onToggle={vi.fn()} onBuy={vi.fn()} coins={8}
    purchased={[]} environment="real" onDevAction={vi.fn()} care={{ petId: pet.id, environment: "real", affection: 42, satiety: 75, lastUpdatedAt: Date.now(), revision: 1, mood: "neutral" }} />);
  const tabs = Array.from(container.querySelectorAll("[role=tab]")).map((tab) => tab.textContent);
  expect(tabs.slice(0, 2)).toEqual(["Carinho", "Comida"]);
  expect(container.querySelector("[role=tab][aria-selected=true]")?.textContent).toBe("Carinho");
  expect(container.textContent).toContain(`Faça carinho ${pet.id === "nix" ? "na" : "no"} ${pet.name}`);
  expect(container.querySelectorAll("[role=progressbar]")).toHaveLength(2);
  fireEvent.click(container.querySelectorAll("[role=tab]")[1]);
  expect(container.querySelectorAll("button[aria-label*='Arraste até o pet']")).toHaveLength(5);
});
