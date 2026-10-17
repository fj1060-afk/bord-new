"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import { useJustCleared } from "./use-resolved";

type Level = "block" | "warn" | null;

// The frame tells an item's state from outside: red with a blocker, brass with only warnings, green for a moment once fixed.
const FRAME = { block: "border-danger ring-1 ring-danger", warn: "border-brass ring-1 ring-brass", done: "border-primary ring-1 ring-primary", none: "border-rule" } as const;
const BADGE = { block: "bg-danger text-white", warn: "bg-brass text-white", done: "bg-primary text-on-primary" } as const;

const state = (level: Level, cleared: boolean) => (cleared ? "done" : (level ?? "none"));

/** The agenda item's <li>, framed by its issues. */
export function ItemFrame({ level, count, className, children, ...props }: { level: Level; count: number; className?: string; children: ReactNode } & Record<string, unknown>) {
  const cleared = useJustCleared(count);
  return (
    <li {...props} className={clsx(className, "transition-[border-color,box-shadow] duration-(--motion-menu) ease-(--ease-out)", FRAME[state(level, cleared)])}>
      {children}
    </li>
  );
}

/** How many issues in the item need someone to act, at the end of its header. */
export function IssueBadge({ level, count }: { level: Level; count: number }) {
  const cleared = useJustCleared(count);
  const s = state(level, cleared);
  if (s === "none") return null;
  const label = cleared ? "اكتمل البند" : count === 1 ? "ملاحظة واحدة تحتاج تدخلك" : `${count} ملاحظات تحتاج تدخلك`;
  return (
    <span title={label} aria-label={label} className={clsx("motion-pop mt-1 grid h-6 min-w-6 shrink-0 place-items-center rounded-full px-1.5 font-mono text-xs font-bold motion-colors", BADGE[s])}>
      {cleared ? <Check size={14} aria-hidden="true" /> : count}
    </span>
  );
}
