import { cleanup, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import PetsPage from "@/app/pets/page";

const mocks = vi.hoisted(() => ({ accountId: "andre" as "andre" | "flavia" }));
vi.mock("next/image", () => ({ default: ({ alt = "" }: { alt?: string }) => <span role={alt ? "img" : undefined} aria-label={alt || undefined} /> }));
vi.mock("@/lib/accountSession", () => ({ getActiveAccountId: () => mocks.accountId }));

describe("seleção PET DEV", () => {
  afterEach(() => { cleanup(); mocks.accountId = "andre"; });

  it("aparece abaixo de Nix e Max apenas para André", async () => {
    const view = render(<PetsPage searchParams={{}} />);
    expect(await screen.findByRole("link", { name: /Modo Desenvolvedor/ })).toHaveAttribute("href", "/pets/dev");
    expect(screen.getByRole("link", { name: "Visitar o quarto de Nix" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Visitar o quarto de Max" })).toBeInTheDocument();
    view.unmount();
    mocks.accountId = "flavia";
    render(<PetsPage searchParams={{}} />);
    await waitFor(() => expect(screen.queryByRole("link", { name: /Modo Desenvolvedor/ })).not.toBeInTheDocument());
  });
});
