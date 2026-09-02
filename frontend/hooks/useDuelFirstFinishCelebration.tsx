import { useEffect, useRef, useState } from "react";

import Confetti from "@/components/Confetti";

type MatchKey = string | number;

interface DuelFirstFinishCelebrationOptions {
  enabled: boolean;
  matchKey: MatchKey | null | undefined;
  ownFinished: boolean;
  opponentFinished: boolean;
  matchFinished: boolean;
}

/**
 * Runs the existing confetti effect once when this player finishes first in a
 * duel. The first state snapshot is only observed, so reconnecting to a match
 * that was already completed by this player does not replay the celebration.
 */
export function useDuelFirstFinishCelebration({
  enabled,
  matchKey,
  ownFinished,
  opponentFinished,
  matchFinished,
}: DuelFirstFinishCelebrationOptions) {
  const initializedMatchRef = useRef<MatchKey | null>(null);
  const previousOwnFinishedRef = useRef<boolean | null>(null);
  const celebratedMatchRef = useRef<MatchKey | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || matchKey == null) return;

    // Initialize from the first snapshot of each match. React Strict Mode can
    // replay this effect on mount, but the stored value makes that replay
    // harmless and a reconnect cannot look like a new finish.
    if (initializedMatchRef.current !== matchKey) {
      initializedMatchRef.current = matchKey;
      previousOwnFinishedRef.current = ownFinished;
      return;
    }

    const justFinished = ownFinished && previousOwnFinishedRef.current === false;
    previousOwnFinishedRef.current = ownFinished;
    if (!justFinished || opponentFinished || matchFinished || celebratedMatchRef.current === matchKey) return;

    celebratedMatchRef.current = matchKey;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 1_500);
    return () => {
      window.clearTimeout(timer);
      setVisible(false);
    };
  }, [enabled, matchFinished, matchKey, opponentFinished, ownFinished]);

  return visible ? <Confetti /> : null;
}
