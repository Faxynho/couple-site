import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PETS } from "../pets/config";
import PetRoomDrawer from "../pets/components/PetRoomDrawer";

afterEach(cleanup);

test("aba Quarto mostra a arte real e alterna o estado visual ao tocar", () => {
  const onToggle = vi.fn();
  const onBuy = vi.fn();
  const purchased = ["heart-frame", "paw-poster", "bed", "rug", "dresser", "shelf", "lamp", "plant", "bowls", "bone"];
  const commonProps = { ready: true, error: "", onToggle, onBuy, coins: 500, purchased, environment: "real" as const, onDevAction: vi.fn() };
  const view = render(<PetRoomDrawer pet={PETS[0]} slots={{}} {...commonProps} />);
  fireEvent.click(screen.getByRole("tab", { name: "Quarto" }));
  fireEvent.click(screen.getByRole("button", { name: /Feminino/ }));

  const heart = screen.getByRole("button", { name: "Colocar Quadro coração" });
  expect(heart.getAttribute("aria-pressed")).toBe("false");
  expect(heart.querySelector("img")?.getAttribute("src")).toBe("/images/pets/room/decor/heart-frame.webp");
  fireEvent.click(heart);
  expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: "heart-frame", slot: "wall-heart" }));

  view.rerender(<PetRoomDrawer pet={PETS[0]} slots={{ "wall-heart": "heart-frame" }} {...commonProps} />);
  expect(screen.getByRole("button", { name: "Remover Quadro coração" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Remover Quadro coração" }));
  expect(onToggle).toHaveBeenCalledTimes(2);

  fireEvent.click(screen.getByRole("button", { name: "Parede" }));
  expect(screen.queryByRole("button", { name: "Colocar Caminha" })).toBeNull();
  expect(screen.getByRole("button", { name: "Colocar Quadro patinha" })).toBeTruthy();
});

test("decoração não comprada mostra preço e aciona compra em vez de equipar", () => {
  const onToggle = vi.fn();
  const onBuy = vi.fn();
  render(<PetRoomDrawer pet={PETS[0]} slots={{}} ready error="" onToggle={onToggle} onBuy={onBuy} coins={79} purchased={[]} environment="real" onDevAction={vi.fn()} />);
  fireEvent.click(screen.getByRole("tab", { name: "Quarto" }));
  fireEvent.click(screen.getByRole("button", { name: /Feminino/ }));
  const bone = screen.getByRole("button", { name: "Comprar Ossinho por 80 moedas globais" });
  expect(bone.textContent).toContain("80");
  fireEvent.click(bone);
  expect(onBuy).toHaveBeenCalledWith(expect.objectContaining({ id: "bone", price: 80 }));
  expect(onToggle).not.toHaveBeenCalled();
});
