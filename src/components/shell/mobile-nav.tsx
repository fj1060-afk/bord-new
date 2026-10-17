"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { EASE_IN, EASE_OUT, motion, reducedMotion } from "@/lib/motion";
import { SidebarBrand } from "./sidebar";
import { SidebarNav, type CommitteeLink } from "./sidebar-nav";

export function MobileNav({ allowed, committees, portal }: { allowed: string[]; committees: CommitteeLink[]; portal?: { account: string } }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // The panel slides in from the start edge and the page dims; closing plays it backwards.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const still = reducedMotion();
    const play = (reverse: boolean) => {
      const options: KeyframeAnimationOptions = { duration: reverse ? motion("menu") : motion("page"), easing: reverse ? EASE_IN : EASE_OUT, direction: reverse ? "reverse" : "normal", fill: "both" };
      const panel = dialog.animate({ transform: ["translateX(100%)", "translateX(0)"] }, options);
      try {
        dialog.animate({ opacity: [0, 1] }, { ...options, pseudoElement: "::backdrop" });
      } catch {
        // Older browsers cannot animate the backdrop; the panel still slides.
      }
      return panel;
    };
    if (open && !dialog.open) {
      dialog.getAnimations().forEach((a) => a.cancel());
      dialog.showModal();
      dialog.focus();
      if (!still) play(false);
    }
    if (!open && dialog.open) {
      if (still) dialog.close();
      else {
        const shut = () => {
          dialog.close();
          dialog.getAnimations().forEach((a) => a.cancel());
        };
        play(true).finished.then(shut, shut);
      }
    }
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
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        tabIndex={-1}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        aria-label="القائمة الرئيسية"
        className="m-0 me-auto h-dvh outline-none max-h-none w-72 max-w-[85vw] bg-sidebar p-0 backdrop:bg-black/40 lg:hidden"
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
          <SidebarNav allowed={allowed} committees={committees} portal={portal} onNavigate={() => setOpen(false)} />
        </div>
      </dialog>
    </>
  );
}
