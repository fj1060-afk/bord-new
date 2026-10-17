"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { activeLink, buildSidebar, type SideBranch, type SideLink, type SideSection } from "@/config/sidebar";

export type CommitteeLink = { id: string; name: string };

/** A thin bar under the clicked link while its page loads; always rendered, so nothing shifts. */
function Pending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={clsx("absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-brass transition-opacity duration-(--motion-page)", pending ? "animate-pulse opacity-100" : "opacity-0")} />;
}

const linkClass = (active: boolean, nested?: boolean) =>
  clsx(
    "motion-colors relative flex items-center gap-3 rounded-md px-3 py-2 text-sm",
    nested && "ps-9 py-1.5",
    active ? "bg-sidebar-active text-white" : "text-sidebar-ink hover:bg-white/5",
  );

/** The brass bar beside the current link; it slides between links and follows folds as they open and close. */
function ActiveBar({ navRef, current }: { navRef: React.RefObject<HTMLElement | null>; current?: string }) {
  const bar = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const nav = navRef.current;
    const el = bar.current;
    if (!nav || !el) return;
    let frame = 0;
    const place = () => {
      const link = nav.querySelector<HTMLElement>('a[aria-current="page"]');
      const rect = link?.getBoundingClientRect();
      if (!link || !rect || rect.height < 4 || link.closest("[inert]")) {
        el.style.opacity = "0";
        return;
      }
      const top = rect.top - nav.getBoundingClientRect().top;
      el.style.opacity = "1";
      el.style.transform = `translateY(${top + 6}px)`;
      el.style.height = `${rect.height - 12}px`;
    };
    // Follow the layout for a moment while folds open or close around the link.
    const follow = (ms: number) => {
      const end = performance.now() + ms;
      cancelAnimationFrame(frame);
      const tick = () => {
        place();
        if (performance.now() < end) frame = requestAnimationFrame(tick);
      };
      tick();
    };
    follow(400);
    const resize = new ResizeObserver(() => follow(300));
    resize.observe(nav);
    nav.addEventListener("transitionend", place);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      nav.removeEventListener("transitionend", place);
    };
  }, [navRef, current]);
  return (
    <span
      ref={bar}
      aria-hidden="true"
      style={{ opacity: 0 }}
      className="pointer-events-none absolute start-0 top-0 w-[3px] rounded-full bg-brass transition-[transform,height,opacity] duration-(--motion-menu) ease-(--ease-out)"
    />
  );
}

/** Opens when you navigate into it, and the chevron can still close it. */
function useOpen(inside: boolean) {
  const [open, setOpen] = useState(inside);
  const [was, setWas] = useState(inside);
  if (inside !== was) {
    setWas(inside);
    if (inside) setOpen(true);
  }
  return [open, setOpen] as const;
}

/** Rows animate between 0fr and 1fr, so the list slides open and shut. */
function Slide({ shown, children }: { shown: boolean; children: ReactNode }) {
  return (
    <div className={clsx("grid transition-[grid-template-rows] duration-(--motion-menu) ease-(--ease-out)", shown ? "grid-rows-[1fr]" : "grid-rows-[0fr]")} inert={!shown}>
      <ul className="flex min-h-0 flex-col gap-0.5 overflow-hidden">{children}</ul>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return <ChevronDown size={14} aria-hidden="true" className={clsx("transition-transform duration-(--motion-menu) ease-(--ease-out)", open ? "" : "rotate-90")} />;
}

function Item({ link, active, onNavigate, nested }: { link: SideLink; active: boolean; onNavigate?: (href: string) => void; nested?: boolean }) {
  const Icon = link.icon;
  return (
    <li>
      <Link href={link.href} onClick={() => onNavigate?.(link.href)} aria-current={active ? "page" : undefined} className={linkClass(active, nested)}>
        <Icon size={nested ? 15 : 18} strokeWidth={1.75} aria-hidden="true" />
        <span className="truncate">{link.label}</span>
        <Pending />
      </Link>
    </li>
  );
}

/** A committee: its name links to it, the chevron shows or hides its pages. */
function Branch({ branch, inside, current, onNavigate }: { branch: SideBranch; inside: boolean; current?: string; onNavigate?: (href: string) => void }) {
  const [open, setOpen] = useOpen(inside);
  const Icon = branch.icon;
  return (
    <li>
      <div className="relative">
        <Link
          href={branch.href}
          onClick={() => {
            setOpen(true);
            onNavigate?.(branch.href);
          }}
          className={clsx(linkClass(false), "pe-9")}
        >
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
          <span className="truncate">{branch.label}</span>
          <Pending />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`${open ? "إخفاء" : "إظهار"} صفحات ${branch.label}`}
          className="motion-colors absolute inset-y-0 end-1 my-auto grid size-7 place-items-center rounded text-sidebar-muted hover:bg-white/10 hover:text-white"
        >
          <Chevron open={open} />
        </button>
      </div>
      <Slide shown={open}>
        {branch.children.map((c) => (
          <Item key={c.href} link={c} active={c.href === current} onNavigate={onNavigate} nested />
        ))}
      </Slide>
    </li>
  );
}

function Section({ section, current, onNavigate }: { section: SideSection; current?: string; onNavigate?: (href: string) => void }) {
  const inside = (item: SideSection["items"][number]) =>
    current === item.href || (current?.startsWith(`${item.href}/`) ?? false) || ("children" in item && item.children.some((c) => c.href === current));
  const holds = section.items.some(inside);
  const [open, setOpen] = useOpen(holds);
  const shown = !section.collapsible || open;
  return (
    <div>
      {section.collapsible ? (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={shown} className="motion-colors mb-2 flex w-full items-center justify-between px-3 text-xs font-medium text-sidebar-muted hover:text-white">
          {section.label}
          <Chevron open={shown} />
        </button>
      ) : (
        <p className="mb-2 px-3 text-xs font-medium text-sidebar-muted">{section.label}</p>
      )}
      <Slide shown={shown}>
        {section.items.map((item) =>
          "children" in item ? (
            <Branch key={item.href} branch={item} inside={inside(item)} current={current} onNavigate={onNavigate} />
          ) : (
            <Item key={item.href} link={item} active={item.href === current} onNavigate={onNavigate} />
          ),
        )}
      </Slide>
    </div>
  );
}

export function SidebarNav({
  allowed,
  committees,
  portal,
  onNavigate,
}: {
  /** Page permissions the viewer holds; links needing others are hidden. */
  allowed: string[];
  committees: CommitteeLink[];
  /** Department users get the portal's links, with their account page. */
  portal?: { account: string };
  onNavigate?: () => void;
}) {
  const sections = buildSidebar(allowed, committees, portal);
  const pathname = usePathname();
  const search = useSearchParams().toString();
  // Highlight the clicked link at once, before its page arrives.
  const [clicked, setClicked] = useState<{ href: string; from: string } | null>(null);
  const current = clicked && clicked.from === pathname ? clicked.href : activeLink(sections, pathname, search);
  const navRef = useRef<HTMLElement>(null);
  return (
    <nav ref={navRef} aria-label="القائمة الرئيسية" className="relative flex flex-col gap-6">
      <ActiveBar navRef={navRef} current={current} />
      {sections.map((s) => (
        <Section
          key={s.label}
          section={s}
          current={current}
          onNavigate={(href) => {
            setClicked({ href, from: pathname });
            onNavigate?.();
          }}
        />
      ))}
    </nav>
  );
}
