"use client";

import { useCallback, useEffect, useState } from "react";
import { getSoundEnabled, setSoundEnabled, subscribeSoundEnabled } from "@/lib/sound";

export function useSoundEnabled() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const sync = () => setEnabled(getSoundEnabled());
    sync();
    return subscribeSoundEnabled(sync);
  }, []);

  const toggle = useCallback(() => setSoundEnabled(!getSoundEnabled()), []);
  return { enabled, toggle };
}
