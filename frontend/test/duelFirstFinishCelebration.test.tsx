import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDuelFirstFinishCelebration } from "../hooks/useDuelFirstFinishCelebration";

vi.mock("@/components/Confetti", () => ({
  default: () => <div data-testid="duel-first-finish-confetti" />,
}));

function Harness({
  enabled,
  matchKey,
  ownFinished,
  opponentFinished,
  matchFinished,
}: {
  enabled: boolean;
  matchKey: number;
  ownFinished: boolean;
  opponentFinished: boolean;
  matchFinished: boolean;
}) {
  return useDuelFirstFinishCelebration({ enabled, matchKey, ownFinished, opponentFinished, matchFinished });
}

describe("useDuelFirstFinishCelebration", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("celebra a transição de término uma única vez e expira em 1,5s", () => {
    vi.useFakeTimers();
    const { rerender } = render(<Harness enabled matchKey={1} ownFinished={false} opponentFinished={false} matchFinished={false} />);
    expect(screen.queryByTestId("duel-first-finish-confetti")).not.toBeInTheDocument();

    rerender(<Harness enabled matchKey={1} ownFinished opponentFinished={false} matchFinished={false} />);
    expect(screen.getByTestId("duel-first-finish-confetti")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1_500));
    expect(screen.queryByTestId("duel-first-finish-confetti")).not.toBeInTheDocument();

    rerender(<Harness enabled matchKey={1} ownFinished opponentFinished={false} matchFinished={false} />);
    expect(screen.queryByTestId("duel-first-finish-confetti")).not.toBeInTheDocument();
  });

  it("não celebra um snapshot inicial já finalizado", () => {
    render(<Harness enabled matchKey={1} ownFinished opponentFinished={false} matchFinished={false} />);
    expect(screen.queryByTestId("duel-first-finish-confetti")).not.toBeInTheDocument();
  });

  it.each([
    { enabled: false, opponentFinished: false, matchFinished: false },
    { enabled: true, opponentFinished: true, matchFinished: false },
    { enabled: true, opponentFinished: false, matchFinished: true },
  ])("não celebra fora da condição de primeiro término (%o)", ({ enabled, opponentFinished, matchFinished }) => {
    const { rerender } = render(<Harness enabled matchKey={1} ownFinished={false} opponentFinished={false} matchFinished={false} />);
    rerender(<Harness enabled={enabled} matchKey={1} ownFinished opponentFinished={opponentFinished} matchFinished={matchFinished} />);
    expect(screen.queryByTestId("duel-first-finish-confetti")).not.toBeInTheDocument();
  });
});
