import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import PetRig from "../pets/components/PetRig";
import { PETS } from "../pets/config";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

for (const pet of PETS) {
  if (pet.renderer !== "rig") continue;
  test(`${pet.name} mantém uma cabeça visível nas trocas rápidas de humor, carinho e comida`, async () => {
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
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }));
    const { container, rerender } = render(<PetRig pet={pet} animation="idle" mood="happy" reactionTick={0} className="" />);
    const head = () => container.querySelector('[data-rig-part="head"]') as HTMLElement;
    expect(head().querySelectorAll("span")).toHaveLength(1);
    rerender(<PetRig pet={pet} animation="idle" mood="sad" reactionTick={0} className="" />);
    expect(head().querySelectorAll("span").length).toBeGreaterThanOrEqual(1);
    await waitFor(() => expect(head().querySelectorAll("span")).toHaveLength(2));
    expect(Array.from(head().querySelectorAll("span")).some((layer) => (layer as HTMLElement).style.backgroundImage.includes("/head.webp"))).toBe(true);
    rerender(<PetRig pet={pet} animation="petting" mood="sad" reactionTick={1} className="" />);
    rerender(<PetRig pet={pet} animation="eating" mood="neutral" reactionTick={2} className="" />);
    await waitFor(() => expect(Array.from(head().querySelectorAll("span")).some((layer) => (layer as HTMLElement).style.backgroundImage.includes("head-eating.webp"))).toBe(true));
    expect(head().querySelectorAll("span").length).toBeGreaterThanOrEqual(1);
    expect(head().style.width).toBe(`${pet.rig.parts.find((part) => part.motion === "head")!.width / pet.rig.canvasSize * 100}%`);
  });
}
