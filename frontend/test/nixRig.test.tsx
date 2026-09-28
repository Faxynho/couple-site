import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PETS } from "../pets/config";
import PetSprite from "../pets/components/PetSprite";

const nix = PETS.find((pet) => pet.id === "nix");
if (!nix || nix.renderer !== "rig" || !nix.rig.blink) throw new Error("Nix rig artwork missing");

describe("Nix layered idle", () => {
  const running: Array<{ cancel: ReturnType<typeof vi.fn> }> = [];
  const animate = vi.fn(() => {
    const animation = { cancel: vi.fn(), onfinish: null, oncancel: null };
    running.push(animation);
    return animation;
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    Object.defineProperty(Element.prototype, "animate", { value: animate, configurable: true });
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(Element.prototype, "animate");
    running.length = 0;
    animate.mockClear();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders anchored layers and independent motion without a sprite strip", () => {
    const { container, unmount } = render(<PetSprite pet={nix} />);
    expect(container.querySelector('[data-pet="nix"]')).not.toBeNull();
    expect(container.querySelectorAll("[data-rig-part]")).toHaveLength(8);
    expect(container.querySelector('[data-rig-part="tail"]')).not.toBeNull();
    expect(container.querySelector('[data-rig-part="breath"]')).not.toBeNull();
    expect(container.querySelector("[data-blink-state] [style*='blink-half.webp']")).not.toBeNull();
    expect(container.querySelector('[class*="petStrip"]')).toBeNull();
    expect(animate).toHaveBeenCalledTimes(4); // chest, head lift, neck sway, tail

    unmount();
    expect(running.every(({ cancel }) => cancel.mock.calls.length === 1)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("blinks independently of the idle and retains the random double blink", () => {
    const { container, unmount } = render(<PetSprite pet={nix} />);
    const stage = () => container.querySelector<HTMLElement>("[data-blink-state]")?.dataset.blinkState;
    act(() => vi.advanceTimersByTime(4750));
    expect(stage()).toBe("half");
    act(() => vi.advanceTimersByTime(53));
    expect(stage()).toBe("closed");
    act(() => vi.advanceTimersByTime(135));
    expect(stage()).toBe("open");
    expect(animate.mock.calls.length).toBeGreaterThanOrEqual(4);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps a simple blink and gentle CSS breathing in reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<PetSprite pet={nix} />);
    expect(animate).not.toHaveBeenCalled();
    expect(container.querySelector('[data-rig-part="breath"]')).not.toBeNull();
    act(() => vi.advanceTimersByTime(4750));
    expect(container.querySelector<HTMLElement>("[data-blink-state]")?.dataset.blinkState).toBe("half");
  });

  it.each(PETS)("$name troca apenas a expressão durante tristeza, carinho e alimentação", async (pet) => {
    class DecodedImage {
      onload: (() => void) | null = null;
      naturalWidth = 790;
      complete = true;
      decode() { return Promise.resolve(); }
      set src(_value: string) { this.onload?.(); }
    }
    vi.stubGlobal("Image", DecodedImage);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 1));
    vi.stubGlobal("cancelAnimationFrame", window.clearTimeout);
    const view = render(<PetSprite pet={pet} mood="sad" />);
    const head = () => view.container.querySelector<HTMLElement>('[data-rig-part="head"]');
    const expression = () => Array.from(head()?.querySelectorAll("span") || []).map((layer) => layer.style.backgroundImage).join(" ");
    const settle = async () => { await act(async () => { await Promise.resolve(); }); act(() => vi.advanceTimersByTime(2)); };
    await settle();
    expect(expression()).toContain(`/pets/${pet.id}/head-sad.webp`);
    expect(view.container.querySelector('[data-rig-part="fixed"]')?.getAttribute("style")).toContain(`/pets/${pet.id}/body.webp`);
    view.rerender(<PetSprite pet={pet} mood="sad" animation="petting" />);
    await settle();
    expect(expression()).toContain(`/pets/${pet.id}/head-petting.webp`);
    view.rerender(<PetSprite pet={pet} mood="happy" animation="eating" />);
    await settle();
    expect(expression()).toContain(`/pets/${pet.id}/head-eating.webp`);
    view.rerender(<PetSprite pet={pet} mood="happy" />);
    await settle();
    expect(expression()).toContain(`/pets/${pet.id}/head.webp`);
    expect(view.container.querySelector('[data-blink-state]')).not.toBeNull();
  });
});

