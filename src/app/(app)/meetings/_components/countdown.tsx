"use client";

import { useEffect, useState } from "react";
import { countdown } from "@/lib/meeting-table";

const pad = (n: number) => String(n).padStart(2, "0");

/** Days, hours and minutes to the next meeting, refreshed every half minute. */
export function Countdown({ target, initialNow }: { target: string; initialNow: number }) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const left = countdown(Date.parse(target), now);
  return (
    <div className="grid grid-cols-3 gap-2" role="timer" aria-label={`${left.days} يوم و${left.hours} ساعة و${left.minutes} دقيقة`}>
      {(
        [
          [left.days, "يوم"],
          [left.hours, "ساعة"],
          [left.minutes, "دقيقة"],
        ] as const
      ).map(([n, label]) => (
        <span key={label} className="flex flex-col items-center rounded-lg border border-primary/25 bg-surface py-1.5">
          <b className="font-mono text-xl text-primary">{pad(n)}</b>
          <span className="text-[11px] text-ink-muted">{label}</span>
        </span>
      ))}
    </div>
  );
}
