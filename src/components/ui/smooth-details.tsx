"use client";

import { useEffect } from "react";

const running = new WeakMap<HTMLDetailsElement, Animation>();
const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/** Height of the element if it were open or closed, measured without a visible flash. */
function heightWhen(details: HTMLDetailsElement, open: boolean) {
  const was = details.open;
  details.open = open;
  const h = details.getBoundingClientRect().height;
  details.open = was;
  return h;
}

/** Slides a <details> to open or closed; a click mid-way reverses from where it is. */
export function slide(details: HTMLDetailsElement, open: boolean) {
  details.dataset.opening = open ? "1" : "0";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    details.open = open;
    return;
  }
  const from = details.getBoundingClientRect().height;
  running.get(details)?.cancel();
  const to = heightWhen(details, open);
  details.open = true; // keep the content visible while it moves
  details.style.overflow = "hidden";
  const ms = Math.min(380, Math.max(240, Math.abs(to - from) * 0.7));
  const animation = details.animate({ height: [`${from}px`, `${to}px`] }, { duration: ms, easing: EASE });
  running.set(details, animation);
  const done = () => {
    running.delete(details);
    details.style.overflow = "";
  };
  animation.onfinish = () => {
    details.open = open;
    done();
  };
  animation.oncancel = done;
}

/**
 * Makes every <details> on the site open and close smoothly, in every browser
 * (Safari cannot animate to height auto in CSS). Mounted once in the root layout.
 */
export function SmoothDetails() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onClick = (event: MouseEvent) => {
      if (reduce.matches || event.defaultPrevented) return;
      const target = event.target as Element | null;
      const summary = target?.closest("summary");
      const details = summary?.parentElement;
      if (!summary || !(details instanceof HTMLDetailsElement) || details.firstElementChild !== summary) return;
      // Links and controls inside a summary keep their own behaviour.
      const control = target?.closest("a, button, input, select, textarea, label");
      if (control && control !== summary && summary.contains(control)) return;
      event.preventDefault();
      const opening = running.has(details) ? !(details.dataset.opening === "1") : !details.open;
      slide(details, opening);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
