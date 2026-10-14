"use client";

import { useSyncExternalStore } from "react";
import { formatGregorianDate, formatHijriDate } from "@/lib/format";

const subscribe = () => () => {};

/**
 * Today's date in both calendars, like the header of an official letter.
 * Rendered on the client only, so a statically built page never shows a stale date.
 */
export function Today() {
  const now = useSyncExternalStore(
    subscribe,
    () => new Date().toDateString(),
    () => null,
  );
  if (!now) return <span className="h-4 w-48" aria-hidden="true" />;

  const date = new Date();
  return (
    <p className="text-xs text-ink-muted">
      <span>{formatGregorianDate(date)}</span>
      <span className="mx-2 text-brass" aria-hidden="true">
        ·
      </span>
      <span>{formatHijriDate(date)}</span>
    </p>
  );
}
