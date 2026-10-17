"use client";

import { useEffect, useState } from "react";

const SHOW_MS = 1800;
const FADE_MS = 500;

/**
 * Entries that were in the previous `list` and are gone from this one, kept for a moment
 * so the page can show them as done (✓) before they fade out.
 */
export function useResolved<T>(list: T[], key: (t: T) => string) {
  const [prev, setPrev] = useState(list);
  const [gone, setGone] = useState<T[]>([]);
  const [fading, setFading] = useState(false);
  if (list !== prev) {
    setPrev(list);
    const now = new Set(list.map(key));
    const left = prev.filter((t) => !now.has(key(t)));
    if (left.length) {
      setGone((g) => [...g.filter((t) => now.has(key(t)) === false && !left.some((l) => key(l) === key(t))), ...left]);
      setFading(false);
    }
  }
  useEffect(() => {
    if (!gone.length) return;
    const fade = setTimeout(() => setFading(true), SHOW_MS);
    const clear = setTimeout(() => {
      setGone([]);
      setFading(false);
    }, SHOW_MS + FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(clear);
    };
  }, [gone]);
  return { gone, fading };
}
