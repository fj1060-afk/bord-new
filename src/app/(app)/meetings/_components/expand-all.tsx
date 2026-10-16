"use client";

import { useState } from "react";
import { ChevronsDownUp, ChevronsUpDown } from "lucide-react";

/** Opens or folds every agenda item in the list with the given id. */
export function ExpandAll({ listId }: { listId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        document.querySelectorAll<HTMLDetailsElement>(`#${listId} > li > div > details`).forEach((d) => (d.open = !open));
        setOpen(!open);
      }}
      className="ms-auto inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
    >
      {open ? <ChevronsDownUp size={16} aria-hidden="true" /> : <ChevronsUpDown size={16} aria-hidden="true" />}
      {open ? "طي كل البنود" : "فتح كل البنود"}
    </button>
  );
}
