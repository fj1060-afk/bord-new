"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";

/**
 * Shows or hides content by folding its height (grid rows 0fr ↔ 1fr) and
 * fading it, for conditional fields, messages and explanations. While it
 * folds away it keeps showing what it last held, so nothing vanishes mid-way.
 */
export function Collapse({ show, children, className }: { show: boolean; children: ReactNode; className?: string }) {
  // Remember the last content shown, updated while rendering (no effect needed).
  const [kept, setKept] = useState<ReactNode>(children);
  if (show && kept !== children) setKept(children);
  return (
    <div
      className={clsx(
        "grid transition-[grid-template-rows,opacity] duration-(--motion-menu) ease-(--ease-out)",
        show ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className,
      )}
      inert={!show}
      aria-hidden={!show || undefined}
    >
      {/* While folding away the old content stays visible but disabled, so hidden fields are never submitted. */}
      <div className="min-h-0 overflow-hidden">
        {show ? (
          children
        ) : (
          <fieldset disabled className="m-0 min-w-0 border-0 p-0">
            {kept}
          </fieldset>
        )}
      </div>
    </div>
  );
}
