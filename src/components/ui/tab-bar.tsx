"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import clsx from "clsx";
import { reducedMotion } from "@/lib/motion";

// Where each bar's indicator last stood, so a bar re-mounted by navigation
// slides from the old tab to the new one instead of appearing there.
const last = new Map<string, { x: number; w: number }>();

/**
 * A row of tab links (the current one marked aria-current) with one indicator
 * that slides to the current tab: an underline, or a filled pill.
 */
export function TabBar({ id, label, variant = "underline", tone = "brass", className, children }: { id: string; label: string; variant?: "underline" | "pill"; /** The underline colour; the meeting page uses the primary colour. */ tone?: "brass" | "primary"; className?: string; children: ReactNode }) {
  const nav = useRef<HTMLElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = nav.current;
    const ind = bar.current;
    if (!el || !ind) return;
    const place = (animate: boolean) => {
      const tab = el.querySelector<HTMLElement>('[aria-current="page"], [aria-current="step"], [aria-current="true"]');
      if (!tab) {
        ind.style.opacity = "0";
        return;
      }
      const x = tab.offsetLeft;
      const w = tab.offsetWidth;
      ind.style.transition = animate && !reducedMotion() ? "" : "none";
      ind.style.opacity = "1";
      ind.style.transform = `translateX(${x}px)`;
      ind.style.width = `${w}px`;
      last.set(id, { x, w });
      // Bring a scrolled-away tab into view sideways only; the page itself never scrolls.
      if (x < el.scrollLeft || x + w > el.scrollLeft + el.clientWidth) el.scrollLeft = x - (el.clientWidth - w) / 2;
    };
    const prev = last.get(id);
    if (prev) {
      // Start where the indicator was, then slide on the next frame.
      ind.style.transition = "none";
      ind.style.transform = `translateX(${prev.x}px)`;
      ind.style.width = `${prev.w}px`;
      ind.style.opacity = "1";
      requestAnimationFrame(() => requestAnimationFrame(() => place(true)));
    } else place(false);
    const observer = new MutationObserver(() => place(true));
    observer.observe(el, { attributes: true, subtree: true, attributeFilter: ["aria-current"] });
    const resize = new ResizeObserver(() => place(false));
    resize.observe(el);
    return () => {
      observer.disconnect();
      resize.disconnect();
    };
  }, [id]);

  return (
    <nav ref={nav} aria-label={label} className={clsx("relative", className)}>
      {children}
      {/* Physical left: offsetLeft is measured from the left edge in both directions. */}
      <span
        ref={bar}
        aria-hidden="true"
        style={{ opacity: 0 }}
        className={clsx(
          "pointer-events-none absolute left-0 transition-[transform,width,opacity] duration-(--motion-menu) ease-(--ease-out)",
          variant === "underline" ? clsx("bottom-0 h-0.5 rounded-full", tone === "primary" ? "bg-primary" : "bg-brass") : "inset-y-0.5 z-0 rounded bg-primary",
        )}
      />
    </nav>
  );
}
