"use client";

import { Pencil } from "lucide-react";
import { menuItem } from "@/components/ui/row-menu";
import { reveal } from "@/components/ui/smooth-details";
import { editItem } from "./edit-item-event";

/** «تعديل البند» in an item's menu: opens the item if folded and switches it to its edit form. */
export function EditItemButton({ itemId, title }: { itemId: string; title: string }) {
  return (
    <button
      type="button"
      aria-label={`تعديل البند: ${title}`}
      onClick={(event) => {
        const el = document.getElementById(`item-${itemId}`);
        // Close the menu this sits in, then open the item on its form.
        event.currentTarget.closest("details")?.removeAttribute("open");
        if (el) reveal(el);
        editItem(itemId);
      }}
      className={menuItem}
    >
      <Pencil size={15} aria-hidden="true" /> تعديل البند
    </button>
  );
}
