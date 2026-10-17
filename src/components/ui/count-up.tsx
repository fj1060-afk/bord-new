"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, tween } from "@/lib/motion";

// Numbers already counted this visit, so returning to a page shows them at once.
const counted = new Set<string>();

const parse = (value: string | number) => {
  const m = String(value).match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  return m ? { pre: m[1], n: Number(m[2]), post: m[3], decimals: (m[2].split(".")[1] ?? "").length } : null;
};

/**
 * A headline number that counts up the first time it appears and glides to
 * new values afterwards (never restarting from zero). Anything that is not a
 * plain number, such as "—", is shown as is.
 */
export function CountUp({ value, id }: { value: string | number; id: string }) {
  const target = parse(value);
  const [shown, setShown] = useState<number | null>(null);
  const from = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (!target) return;
    const start = from.current ?? (counted.has(id) ? target.n : 0);
    counted.add(id);
    from.current = target.n;
    return tween(start, target.n, start === 0 ? motion("page") * 2.5 : motion("page"), setShown);
  }, [id, target?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!target) return <>{value}</>;
  const n = shown ?? target.n;
  return (
    <span aria-label={String(value)}>
      <span aria-hidden="true">
        {target.pre}
        {n.toFixed(target.decimals)}
        {target.post}
      </span>
    </span>
  );
}
