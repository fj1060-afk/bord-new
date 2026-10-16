"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { SidebarBrand } from "./sidebar";
import { SidebarNav, type CommitteeLink } from "./sidebar-nav";

export function MobileNav({ allowed, committees }: { allowed: string[]; committees: CommitteeLink[] }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-me-2 rounded-md p-2 text-ink hover:bg-primary-soft lg:hidden"
        aria-label="فتح القائمة"
      >
        <Menu size={22} aria-hidden="true" />
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        aria-label="القائمة الرئيسية"
        className="m-0 me-auto h-dvh max-h-none w-72 max-w-[85vw] bg-sidebar p-0 backdrop:bg-black/40 lg:hidden"
      >
        <div className="flex h-full flex-col gap-8 overflow-y-auto side-scroll px-3 py-6">
          <div className="flex items-center justify-between">
            <SidebarBrand />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-2 text-sidebar-ink hover:bg-white/5"
              aria-label="إغلاق القائمة"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <SidebarNav allowed={allowed} committees={committees} onNavigate={() => setOpen(false)} />
        </div>
      </dialog>
    </>
  );
}
