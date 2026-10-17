"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import { useResolved } from "./use-resolved";

type Row = { id: string; label: string };

/** Meeting-wide checks that just passed, shown with ✓ for a moment before they move to «مكتملة». */
export function ResolvedChecks({ open }: { open: Row[] }) {
  const { gone, fading } = useResolved(open, (r) => r.id);
  if (!gone.length) return null;
  return (
    <ul role="status" className={clsx("border-t border-rule px-5 py-2 text-sm transition-opacity duration-(--motion-menu)", fading && "opacity-0")}>
      {gone.map((r) => (
        <li key={r.id} className="motion-pop flex items-center gap-2 py-1 text-primary">
          <Check size={15} aria-hidden="true" /> {r.label}
        </li>
      ))}
    </ul>
  );
}
