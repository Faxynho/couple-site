import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PETS } from "../pets/config";
import PetRoomDrawer from "../pets/components/PetRoomDrawer";

afterEach(cleanup);

test("aba Quarto mostra a arte real e alterna o estado visual ao tocar", () => {
  const onToggle = vi.fn();
  const view = render(<PetRoomDrawer pet={PETS[0]} slots={{}} ready error="" onToggle={onToggle} />);
  fireEvent.click(screen.getByRole("tab", { name: "Quarto" }));

  const heart = screen.getByRole("button", { name: "Colocar Quadro coração" });
  expect(heart.getAttribute("aria-pressed")).toBe("false");
  expect(heart.querySelector("img")?.getAttribute("src")).toBe("/images/pets/room/decor/heart-frame.webp");
  fireEvent.click(heart);
  expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: "heart-frame", slot: "wall-heart" }));

  view.rerender(<PetRoomDrawer pet={PETS[0]} slots={{ "wall-heart": "heart-frame" }} ready error="" onToggle={onToggle} />);
  expect(screen.getByRole("button", { name: "Remover Quadro coração" }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Remover Quadro coração" }));
  expect(onToggle).toHaveBeenCalledTimes(2);

  fireEvent.click(screen.getByRole("button", { name: "Parede" }));
  expect(screen.queryByRole("button", { name: "Colocar Caminha" })).toBeNull();
  expect(screen.getByRole("button", { name: "Colocar Quadro patinha" })).toBeTruthy();
});
