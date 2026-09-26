import { beforeEach, describe, expect, it, vi } from "vitest";
import { playSoundEffect } from "@/lib/sound";

describe("feedback sonoro do idle", () => {
  beforeEach(() => {
    localStorage.setItem("couple-site:sound-enabled", "true");
  });

  it("sintetiza o pop de coleta sem depender de arquivo externo", () => {
    const oscillators: Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }> = [];
    class MockAudioContext {
      currentTime = 0;
      state = "running";
      destination = {};
      resume = vi.fn();
      createOscillator() {
        const oscillator = {
          type: "sine",
          frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn().mockReturnThis(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        oscillators.push(oscillator);
        return oscillator;
      }
      createGain() {
        return {
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn().mockReturnThis(),
        };
      }
    }
    Object.defineProperty(window, "AudioContext", { configurable: true, value: MockAudioContext });

    expect(() => playSoundEffect("idlePop")).not.toThrow();
    expect(oscillators).toHaveLength(2);
    expect(oscillators.every((oscillator) => oscillator.start.mock.calls.length === 1 && oscillator.stop.mock.calls.length === 1)).toBe(true);
  });
});
