"use client";

import { useState } from "react";
import clsx from "clsx";
import { FixLink } from "./fix-link";
import { OverrideForm } from "./override-form";

export type Issue = { id: string; level: "block" | "warn" | "info"; chip: string; explain: string; overridable: boolean };
export type IssueItem = { anchor: string; n?: number; label: string; issues: Issue[] };

const CHIP = { block: "bg-danger/10 text-danger", warn: "bg-brass-soft text-brass", info: "bg-paper text-ink-muted" } as const;

/** One row per agenda item with short chips for what it lacks; a chip opens its explanation. */
export function ItemIssues({ meetingId, href, items }: { meetingId: string; href: string; items: IssueItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ul className="divide-y divide-rule border-t border-rule">
      {items.map((item) => {
        const picked = item.issues.find((i) => `${item.anchor}:${i.id}` === open);
        return (
          <li key={item.anchor} className="flex flex-col gap-1.5 px-5 py-2.5">
            <div className="flex items-center gap-3">
              {item.n !== undefined && <span className="font-mono text-sm text-brass">{item.n}</span>}
              <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
              <FixLink href={href} anchor={item.anchor} className="shrink-0 rounded-md bg-primary px-3 py-1 text-xs text-on-primary hover:opacity-90">
                افتح البند
              </FixLink>
            </div>
            <div className="flex flex-wrap gap-1.5 ps-6">
              {item.issues.map((issue) => {
                const key = `${item.anchor}:${issue.id}`;
                return (
                  <button
                    key={issue.id}
                    type="button"
                    aria-expanded={open === key}
                    onClick={() => setOpen(open === key ? null : key)}
                    className={clsx("rounded-full px-2.5 py-0.5 text-xs transition-shadow", CHIP[issue.level], open === key && "ring-1 ring-current")}
                  >
                    {issue.chip}
                  </button>
                );
              })}
            </div>
            {picked && (
              <div className="ps-6 text-xs leading-6 text-ink-muted">
                <p>{picked.explain}</p>
                {picked.overridable && <OverrideForm meetingId={meetingId} rule={picked.id} />}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
