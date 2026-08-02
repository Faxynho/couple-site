"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

const PASTEL_COLORS = ["#F6D3DE", "#C9E0F2", "#DFCBF0", "#C7DBC9", "#F1E4D3"];

export default function Confetti() {
  useEffect(() => {
    const duration = 1400;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: PASTEL_COLORS,
        scalar: 0.8,
        gravity: 0.9,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: PASTEL_COLORS,
        scalar: 0.8,
        gravity: 0.9,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  return null;
}
