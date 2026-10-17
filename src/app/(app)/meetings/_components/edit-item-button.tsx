"use client";

import { Pencil } from "lucide-react";
import { reveal } from "@/components/ui/smooth-details";
import { editItem } from "./edit-item-event";

/** The pencil beside an agenda item: opens the item if folded and switches it to its edit form. */
export function EditItemButton({ itemId, title }: { itemId: string; title: string }) {
  return (
    <button
      type="button"
      aria-label={`تعديل البند: ${title}`}
      title="تعديل البند"
      onClick={() => {
        const el = document.getElementById(`item-${itemId}`);
        if (el) reveal(el);
        editItem(itemId);
      }}
      className="motion-press rounded p-1.5 text-ink-muted hover:bg-primary-soft hover:text-primary"
    >
      <Pencil size={16} aria-hidden="true" />
    </button>
  );
}
