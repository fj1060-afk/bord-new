"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { revealWhenReady } from "@/components/ui/smooth-details";

/** Goes to the tab and spot that needs fixing, opens it and flashes it. */
export function FixLink({ href, anchor, className, title, children }: { href: string; anchor?: string; className?: string; title?: string; children: ReactNode }) {
  const router = useRouter();
  if (!anchor) {
    return (
      <Link href={href} className={className} title={title}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={`${href}#${anchor}`}
      title={title}
      className={className}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        const here = location.pathname + location.search;
        if (here !== href) router.push(href, { scroll: false });
        revealWhenReady(anchor, 6000);
      }}
    >
      {children}
    </a>
  );
}
