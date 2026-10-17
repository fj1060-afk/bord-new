"use client";

import { useState, useTransition } from "react";
import { Wand2 } from "lucide-react";
import type { ActionState } from "@/components/ui/form";

/** A one-click fix; works inside a <summary> without toggling it. */
export function AutoFix({ action, label = "صحّح تلقائياً" }: { action: () => Promise<ActionState>; label?: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>(null);
  return (
    <span className="inline-flex shrink-0 items-center gap-2">
      {state && !state.ok && <span className="text-xs text-danger">{state.message}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          start(async () => setState(await action()));
        }}
        className="motion-press inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs text-on-primary hover:opacity-90 disabled:opacity-50"
      >
        <Wand2 size={13} aria-hidden="true" /> {pending ? "جارٍ التصحيح…" : label}
      </button>
    </span>
  );
}
