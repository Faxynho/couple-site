/* eslint-disable @next/next/no-img-element */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import PersistentDuoLobbyScene from "@/components/duo/PersistentDuoLobbyScene";

vi.mock("next/image", () => ({ default: ({ alt = "", src, style, className }: { alt?: string; src: string; style?: React.CSSProperties; className?: string }) => <img alt={alt} src={src} style={style} className={className} /> }));

describe("botões ilustrados do lobby", () => {
  afterEach(() => cleanup());

  it("mostra as duas imagens novas e cada botão chama a sua ação", () => {
    const onWorld = vi.fn();
    const onMinigames = vi.fn();
    const { container } = render(<PersistentDuoLobbyScene onWorldClick={onWorld} onMinigamesClick={onMinigames} />);
    const world = screen.getByRole("button", { name: "Entrar no Nosso Mundo" });
    const minigames = screen.getByRole("button", { name: "Abrir Minijogos" });
    expect(world.querySelector("img")).toHaveAttribute("src", "/images/botao-lobby-nosso-mundo.webp");
    expect(minigames.querySelector("img")).toHaveAttribute("src", "/images/botao-lobby-minijogos.webp");
    fireEvent.click(world);
    expect(onWorld).toHaveBeenCalledTimes(1);
    expect(onMinigames).not.toHaveBeenCalled();
    fireEvent.click(minigames);
    expect(onMinigames).toHaveBeenCalledTimes(1);
    // continua preso à mesma caixa do vídeo de fundo (cobertura por altura)
    const scene = container.firstElementChild as HTMLElement;
    expect(scene).toHaveClass("absolute", "inset-0");
    expect(scene).not.toHaveClass("fixed");
    expect((scene.firstElementChild as HTMLElement).style.width).toContain("cqh");
  });

  it("as áreas clicáveis usam porcentagem, ficam dentro do lobby e não se sobrepõem", () => {
    render(<PersistentDuoLobbyScene onWorldClick={() => {}} onMinigamesClick={() => {}} />);
    const boxes = ["Entrar no Nosso Mundo", "Abrir Minijogos"].map((name) => {
      const style = screen.getByRole("button", { name }).style;
      const [left, top, width, height] = [style.left, style.top, style.width, style.height].map((value) => {
        expect(value).toMatch(/%$/);
        return parseFloat(value);
      });
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left + width).toBeLessThanOrEqual(100);
      expect(top + height).toBeLessThan(100);
      return { left, top, width, height };
    });
    const [world, minigames] = boxes;
    expect(world.left + world.width).toBeLessThanOrEqual(minigames.left);
    // arte do mundo à esquerda, do minijogos à direita, ambos na metade de cima do lobby
    expect(world.left).toBeLessThan(minigames.left);
    expect(world.top).toBe(49);
    expect(minigames.top).toBe(49);
    expect(Math.max(world.top + world.height, minigames.top + minigames.height)).toBeLessThan(90);
  });

  it("a arte é recortada pela parte visível (sem margens transparentes) mantendo a proporção", () => {
    render(<PersistentDuoLobbyScene onWorldClick={() => {}} onMinigamesClick={() => {}} />);
    for (const name of ["Entrar no Nosso Mundo", "Abrir Minijogos"]) {
      const image = screen.getByRole("button", { name }).querySelector("img") as HTMLImageElement;
      const widthPct = parseFloat(image.style.width);
      const heightPct = parseFloat(image.style.height);
      // imagem original 1024x1536 → proporção 2:3 mantida dentro do recorte
      const recortWidth = 1024 / (widthPct / 100);
      const recortHeight = 1536 / (heightPct / 100);
      expect(recortWidth).toBeGreaterThan(700);
      expect(recortHeight).toBeGreaterThan(1200);
      expect(parseFloat(image.style.left)).toBeLessThanOrEqual(0);
      expect(parseFloat(image.style.top)).toBeLessThanOrEqual(0);
    }
  });
});
