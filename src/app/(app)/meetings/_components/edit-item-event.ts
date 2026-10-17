"use client";

// Lets a fix button open an item's edit form, which keeps its own state.

const EVENT = "bord:edit-item";

export function editItem(itemId: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: itemId }));
}

/** Calls `open` when something asks to edit this item; returns the cleanup. */
export function onEditItem(itemId: string, open: () => void) {
  const handle = (e: Event) => {
    if ((e as CustomEvent<string>).detail === itemId) open();
  };
  window.addEventListener(EVENT, handle);
  return () => window.removeEventListener(EVENT, handle);
}
