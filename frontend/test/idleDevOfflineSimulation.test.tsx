import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "jsdom-global/register";
import IdleDevPanel from "@/components/idle/IdleDevPanel";
import { idleDevAction } from "@/lib/idleApi";
import type { IdleModeSnapshot } from "@/lib/idleTypes";

vi.mock("@/lib/idleApi", () => ({ idleDevAction: vi.fn(() => Promise.resolve({})) }));

const data = {
  items: [{ definition: { id: "hello-kitty", name: "Hello Kitty" } }],
  achievements: [{ id: "kitty-first", title: "Primeira amizade" }],
  kittyDev: { stones: 0 },
} as unknown as IdleModeSnapshot;

describe("ferramentas DEV de simulação offline", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it("mantém 2h e adiciona 8h e 16h", async () => {
    const onSnapshot = vi.fn();
    render(<IdleDevPanel mode="kitty" data={data} onSnapshot={onSnapshot} />);
    expect(screen.getByRole("button", { name: "Simular 2h offline" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Simular 8h offline" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Simular 16h offline" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Simular 8h offline" }));
    await waitFor(() => expect(idleDevAction).toHaveBeenLastCalledWith({ action: "simulateDevOffline", mode: "kitty", elapsedMs: 8 * 60 * 60 * 1_000 }));
    fireEvent.click(screen.getByRole("button", { name: "Simular 16h offline" }));
    await waitFor(() => expect(idleDevAction).toHaveBeenLastCalledWith({ action: "simulateDevOffline", mode: "kitty", elapsedMs: 16 * 60 * 60 * 1_000 }));
  });
});
