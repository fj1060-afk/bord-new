"use client";

import { useTransition } from "react";
import { buttonClass } from "@/components/ui/form";
import { endSession } from "./actions";

export function EndSessionButton({ sessionId }: { sessionId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => endSession(sessionId))}
      className={buttonClass("danger", "px-3 py-1 text-xs")}
    >
      إنهاء
    </button>
  );
}
