"use client";

import { useState, type ReactNode } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { activeLink, buildSidebar, type SideBranch, type SideLink, type SideSection } from "@/config/sidebar";

export type CommitteeLink = { id: string; name: string };

/** A thin bar under the clicked link while its page loads; always rendered, so nothing shifts. */
function Pending() {
  const { pending } = useLinkStatus();
  return <span aria-hidden className={clsx("absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-brass transition-opacity duration-300", pending ? "animate-pulse opacity-100" : "opacity-0")} />;
}

const linkClass = (active: boolean, nested?: boolean) =>
  clsx(
    "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
    nested && "ps-9 py-1.5",
    active ? "bg-sidebar-active text-white shadow-[inset_-3px_0_0_var(--brass)]" : "text-sidebar-ink hover:bg-white/5",
  );

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
    <div className={clsx("grid transition-[grid-template-rows] duration-200 ease-out", shown ? "grid-rows-[1fr]" : "grid-rows-[0fr]")} inert={!shown}>
      <ul className="flex min-h-0 flex-col gap-0.5 overflow-hidden">{children}</ul>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return <ChevronDown size={14} aria-hidden="true" className={clsx("transition-transform duration-200", open ? "" : "rotate-90")} />;
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
          className="absolute inset-y-0 end-1 my-auto grid size-7 place-items-center rounded text-sidebar-muted hover:bg-white/10 hover:text-white"
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
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={shown} className="mb-2 flex w-full items-center justify-between px-3 text-xs font-medium text-sidebar-muted hover:text-white">
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
  onNavigate,
}: {
  /** Page permissions the viewer holds; links needing others are hidden. */
  allowed: string[];
  committees: CommitteeLink[];
  onNavigate?: () => void;
}) {
  const sections = buildSidebar(allowed, committees);
  const pathname = usePathname();
  const search = useSearchParams().toString();
  // Highlight the clicked link at once, before its page arrives.
  const [clicked, setClicked] = useState<{ href: string; from: string } | null>(null);
  const current = clicked && clicked.from === pathname ? clicked.href : activeLink(sections, pathname, search);
  return (
    <nav aria-label="القائمة الرئيسية" className="flex flex-col gap-6">
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
