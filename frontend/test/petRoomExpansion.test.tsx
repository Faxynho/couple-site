import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PETS } from "../pets/config";
import { PET_ROOM_DECORATIONS, toggledSlots, type PetRoomSlots } from "../pets/petRoomDecorations";
import PetRoomDrawer from "../pets/components/PetRoomDrawer";
import PetRoomScene from "../pets/components/PetRoomScene";

// The room scene is tested independently of the existing animated pet rig.
vi.mock("../pets/components/PetSprite", () => ({ default: () => null }));

afterEach(cleanup);

const get = (id: string) => {
  const item = PET_ROOM_DECORATIONS.find((value) => value.id === id);
  if (!item) throw new Error(id);
  return item;
};

test("quadro duplo e quadros individuais apagam os slots em conflito", () => {
  let slots: PetRoomSlots = { "wall-heart": "heart-frame", "wall-paw": "paw-poster" };
  slots = toggledSlots(slots, get("frame-double"));
  expect(slots).toEqual({ "wall-left-feature": "frame-double" });
  slots = toggledSlots(slots, get("frame-flower"));
  expect(slots).toEqual({ "wall-heart": "frame-flower" });
  slots = toggledSlots(slots, get("frame-double"));
  slots = toggledSlots(slots, get("frame-bone"));
  expect(slots["wall-left-feature"]).toBeUndefined();
  expect(slots["wall-paw"]).toBe("frame-bone");
});

test("drawer filtra brinquedos e estrutura por preço crescente sem trocar de aba ao comprar", () => {
  const onBuy = vi.fn();
  render(<PetRoomDrawer pet={PETS[0]} slots={{}} ready error="" onToggle={vi.fn()} onBuy={onBuy}
    coins={1000} purchased={[]} environment="real" onDevAction={vi.fn()} />);
  fireEvent.click(screen.getByRole("tab", { name: "Quarto" }));
  fireEvent.click(screen.getByRole("button", { name: "Brinquedos" }));
  const cards = screen.getAllByRole("button", { name: /^Comprar / });
  const prices = cards.map((card) => Number(card.getAttribute("aria-label")?.match(/por (\d+) moedas/)?.[1]));
  expect(prices).toEqual([...prices].sort((a, b) => a - b));
  expect(cards.length).toBe(7);
  fireEvent.click(cards[0]);
  expect(onBuy).toHaveBeenCalledWith(expect.objectContaining({ id: "bone", price: 80 }));
  expect(screen.getByRole("button", { name: "Brinquedos" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Estrutura" }));
  expect(screen.getAllByRole("button", { name: /^Comprar / })).toHaveLength(9);
});

test.each(PETS)("$name mantém base, troca cortina e aplica skins independentes", (pet) => {
  const base = render(<PetRoomScene pet={pet} decorations={[]} coins={0} environment="real" />);
  expect(base.container.querySelector("img[class*='curtains']")?.getAttribute("src")).toBe("/images/pets/room/base/curtains.webp");
  expect((base.container.querySelector("[class*='wall']") as HTMLElement)?.style.backgroundImage).toBe("");
  base.rerender(<PetRoomScene pet={pet} decorations={[
    get("curtain-cloud"), get("wall-floral"), get("floor-honey"), get("baseboard-hearts"), get("lamp-moon"),
  ]} coins={0} environment="real" />);
  expect(base.container.querySelectorAll("img[class*='curtains']")).toHaveLength(1);
  expect(base.container.querySelector("img[class*='curtains']")?.getAttribute("src")).toContain("curtain-cloud.webp");
  expect((base.container.querySelector("[class*='wall']") as HTMLElement)?.style.backgroundImage).toContain("wall-floral.webp");
  expect((base.container.querySelector("[class*='floor']") as HTMLElement)?.style.backgroundImage).toContain("floor-honey.webp");
  expect((base.container.querySelector("[class*='baseboard']") as HTMLElement)?.style.backgroundImage).toContain("baseboard-hearts.webp");
  expect(base.container.querySelectorAll("[class*='lampGlow']")).toHaveLength(1);
  base.rerender(<PetRoomScene pet={pet} decorations={[get("dresser-snowglobe")]} coins={0} environment="real" />);
  expect(base.container.querySelectorAll("[class*='lampGlow']")).toHaveLength(0);
  expect(base.container.querySelector("img[class*='curtains']")?.getAttribute("src")).toContain("/base/curtains.webp");
  expect((base.container.querySelector("[class*='wall']") as HTMLElement)?.style.backgroundImage).toBe("");
});
