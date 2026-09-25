import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PETS } from "../pets/config";
import MaxBlink from "../pets/components/MaxBlink";

const max = PETS.find((pet) => pet.id === "max");
if (!max || max.renderer !== "rig" || !max.rig.blink) throw new Error("Max blink artwork missing");
const artwork = max.rig.blink;

function stage(container: HTMLElement) {
  return container.querySelector<HTMLElement>("[data-blink-state]")?.dataset.blinkState;
}

describe("Max blink", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("closes both eyes through the half-blink and reopens without changing the rig", () => {
    const { container, unmount } = render(<MaxBlink artwork={artwork} canvasSize={1536} />);
    expect(stage(container)).toBe("open");
    act(() => vi.advanceTimersByTime(4749));
    expect(stage(container)).toBe("open");
    act(() => vi.advanceTimersByTime(1));
    expect(stage(container)).toBe("half");
    act(() => vi.advanceTimersByTime(52));
    expect(stage(container)).toBe("closed");
    act(() => vi.advanceTimersByTime(64));
    expect(stage(container)).toBe("half");
    act(() => vi.advanceTimersByTime(70));
    expect(stage(container)).toBe("open");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps a simple blink in reduced motion without scheduling a double blink", () => {
    vi.mocked(Math.random).mockReturnValue(0);
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    const { container } = render(<MaxBlink artwork={artwork} canvasSize={1536} />);
    act(() => vi.advanceTimersByTime(1900));
    expect(stage(container)).toBe("half");
    act(() => vi.advanceTimersByTime(160));
    expect(stage(container)).toBe("open");
    act(() => vi.advanceTimersByTime(280));
    expect(stage(container)).toBe("open");
  });

  it("occasionally starts a second blink shortly after the first one", () => {
    vi.mocked(Math.random).mockReturnValue(0);
    const { container } = render(<MaxBlink artwork={artwork} canvasSize={1536} />);
    act(() => vi.advanceTimersByTime(1900 + 160));
    expect(stage(container)).toBe("open");
    act(() => vi.advanceTimersByTime(120));
    expect(stage(container)).toBe("half");
  });
});
