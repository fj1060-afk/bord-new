"use client";

import { useEffect } from "react";
import { EASE_IN_OUT, EASE_OUT, motion, reducedMotion } from "@/lib/motion";

const running = new WeakMap<HTMLDetailsElement, Animation>();

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
  if (reducedMotion()) {
    details.open = open;
    return;
  }
  const from = details.getBoundingClientRect().height;
  running.get(details)?.cancel();
  const to = heightWhen(details, open);
  details.open = true; // keep the content visible while it moves
  details.style.overflow = "hidden";
  // Longer folds take a little longer, between the menu and page tokens.
  const ms = Math.min(motion("page") + 60, Math.max(motion("menu"), Math.abs(to - from) * 0.6));
  const animation = details.animate({ height: [`${from}px`, `${to}px`] }, { duration: ms, easing: open ? EASE_OUT : EASE_IN_OUT });
  // The content settles in just after the fold starts opening, as one block (not each child).
  if (open && from < to)
    for (const child of details.children)
      if (child.tagName !== "SUMMARY")
        child.animate({ opacity: [0, 1], transform: [`translateY(${-motion("shift") * 0.6}px)`, "none"] }, { duration: ms, delay: Math.min(80, ms / 4), easing: EASE_OUT, fill: "backwards" });
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

/** Opens the folds around and inside an element, scrolls to it and flashes it, e.g. after "أكمِل". */
export function reveal(el: HTMLElement) {
  for (let d = el.parentElement?.closest("details"); d; d = d.parentElement?.closest("details")) if (!d.open) d.open = true;
  const own = el instanceof HTMLDetailsElement ? el : el.querySelector<HTMLDetailsElement>(":scope > details, :scope > div > details");
  if (own && !own.open) slide(own, true);
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.animate({ boxShadow: ["0 0 0 0 transparent", "0 0 0 3px var(--brass)", "0 0 0 3px var(--brass)", "0 0 0 0 transparent"] }, { duration: 1200, easing: EASE_OUT });
}

/** Waits for an element to appear (the page may still be loading) and reveals it. */
export function revealWhenReady(id: string, timeout = 4000) {
  const start = performance.now();
  const tick = () => {
    const el = document.getElementById(id);
    if (el) reveal(el);
    else if (performance.now() - start < timeout) requestAnimationFrame(tick);
  };
  tick();
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
    if (location.hash.length > 1) revealWhenReady(decodeURIComponent(location.hash.slice(1)));
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
