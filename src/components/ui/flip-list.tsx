"use client";

import { useLayoutEffect, useRef, type ReactNode, type Ref } from "react";
import { EASE_OUT, motion, reducedMotion } from "@/lib/motion";

const glow = () => getComputedStyle(document.documentElement).getPropertyValue("--brass-soft").trim() || "#f4ecdc";

type Snapshot = Map<string, { top: number; state: string | null }>;

/**
 * A list whose rows glide to their new places when the order changes or a row
 * is added or removed, and briefly glow when their state changes. Each row
 * carries data-flip-key (and optionally data-flip-state). Large changes, like
 * a search or a filter, are applied at once so results are never delayed.
 */
export function FlipList({ as = "ul", children, ...props }: { as?: "ul" | "ol" | "tbody" | "div"; children: ReactNode } & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  const before = useRef<Snapshot | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rows = [...el.querySelectorAll<HTMLElement>(":scope > [data-flip-key]")];
    const now: Snapshot = new Map(rows.map((r) => [r.dataset.flipKey!, { top: r.offsetTop, state: r.dataset.flipState ?? null }]));
    const prev = before.current;
    before.current = now;
    if (!prev || reducedMotion()) return;

    const kept = rows.filter((r) => prev.has(r.dataset.flipKey!));
    const added = rows.length - kept.length;
    const removed = [...prev.keys()].filter((k) => !now.has(k)).length;
    // A filter or a new page of results: show it as it is.
    if (added + removed > Math.max(2, rows.length / 2)) return;

    for (const row of rows) {
      const old = prev.get(row.dataset.flipKey!);
      if (!old) {
        row.animate({ opacity: [0, 1], transform: [`translateY(${motion("shift")}px)`, "none"] }, { duration: motion("page"), easing: EASE_OUT });
        continue;
      }
      const dy = old.top - row.offsetTop;
      if (dy) row.animate({ transform: [`translateY(${dy}px)`, "none"] }, { duration: motion("page"), easing: EASE_OUT });
      if (old.state !== null && old.state !== row.dataset.flipState) row.animate([{ backgroundColor: glow(), offset: 0 }], { duration: 1200, easing: EASE_OUT });
    }
  });

  const Tag = as as "ul";
  return (
    <Tag ref={ref as Ref<HTMLUListElement>} {...props}>
      {children}
    </Tag>
  );
}
