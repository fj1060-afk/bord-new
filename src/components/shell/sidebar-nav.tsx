"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { activeNavItem, navigation } from "@/config/navigation";

export function SidebarNav({
  allowed,
  onNavigate,
}: {
  /** Links the viewer may open; others are hidden. */
  allowed: string[];
  onNavigate?: () => void;
}) {
  const active = activeNavItem(usePathname());
  const groups = navigation
    .map((group) => ({ ...group, items: group.items.filter((item) => allowed.includes(item.href)) }))
    .filter((group) => group.items.length > 0);

  return (
    <nav aria-label="القائمة الرئيسية" className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-xs font-medium text-sidebar-muted">{group.label}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const isActive = item.href === active?.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={clsx(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-active text-white shadow-[inset_-3px_0_0_var(--brass)]"
                        : "text-sidebar-ink hover:bg-white/5",
                    )}
                  >
                    <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
