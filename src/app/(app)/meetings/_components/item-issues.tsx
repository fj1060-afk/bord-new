"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import { Collapse } from "@/components/ui/collapse";
import { FixLink } from "./fix-link";
import { OverrideForm } from "./override-form";
import { QuickFix, type QuickFixKind } from "./quick-fix";
import { useResolved } from "./use-resolved";

export type Issue = { id: string; level: "block" | "warn" | "info"; chip: string; explain: string; overridable: boolean; fix?: QuickFixKind };
export type IssueItem = { anchor: string; n?: number; label: string; issues: Issue[] };
type Entry = { item: IssueItem; issue: Issue };
const flatten = (items: IssueItem[]): Entry[] => items.flatMap((item) => item.issues.map((issue) => ({ item, issue })));

const CHIP = { block: "bg-danger/10 text-danger", warn: "bg-brass-soft text-brass", info: "bg-paper text-ink-muted" } as const;
const DONE = "inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary transition-opacity duration-(--motion-menu)";

/** One row per agenda item with short chips for what it lacks; a chip explains and fixes it, and a fixed one shows ✓ briefly. */
export function ItemIssues({ meetingId, href, items }: { meetingId: string; href: string; items: IssueItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [entries, setEntries] = useState(() => ({ items, list: flatten(items) }));
  if (entries.items !== items) setEntries({ items, list: flatten(items) });
  const { gone, fading } = useResolved(entries.list, (e) => `${e.item.anchor}:${e.issue.id}`);

  // Items still open, plus items whose last issue was just fixed.
  const finished = [...new Map(gone.filter((g) => !items.some((i) => i.anchor === g.item.anchor)).map((g) => [g.item.anchor, g.item])).values()];
  const rows = [...items, ...finished].sort((a, b) => (a.n ?? 0) - (b.n ?? 0));
  if (!rows.length) return null;

  return (
    <>
      <p className="flex justify-between border-t border-rule px-5 pb-1 pt-3 text-xs font-medium text-ink-muted">
        <span>على البنود</span>
        <span>{items.length ? `${items.length} ${items.length === 1 ? "بند" : "بنود"}` : "اكتملت"}</span>
      </p>
      <ul className="divide-y divide-rule border-t border-rule">
        {rows.map((item) => {
          const live = items.some((i) => i.anchor === item.anchor);
          const fixed = gone.filter((g) => g.item.anchor === item.anchor).map((g) => g.issue);
          const picked = live ? item.issues.find((i) => `${item.anchor}:${i.id}` === open) : undefined;
          return (
            <li key={item.anchor}>
              <Collapse show={live || !fading}>
                <div className="flex flex-col gap-1.5 px-5 py-2.5">
                  <div className="flex items-center gap-3">
                    {item.n !== undefined && <span className="font-mono text-sm text-brass">{item.n}</span>}
                    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                    {live ? (
                      <FixLink href={href} anchor={item.anchor} className="shrink-0 rounded-md bg-primary px-3 py-1 text-xs text-on-primary hover:opacity-90">
                        افتح البند
                      </FixLink>
                    ) : (
                      <span className="motion-pop inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                        <Check size={14} aria-hidden="true" /> اكتمل البند
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 ps-6">
                    {live &&
                      item.issues.map((issue) => {
                        const key = `${item.anchor}:${issue.id}`;
                        return (
                          <button
                            key={issue.id}
                            type="button"
                            aria-expanded={open === key}
                            onClick={() => setOpen(open === key ? null : key)}
                            className={clsx("motion-press rounded-full px-2.5 py-0.5 text-xs", CHIP[issue.level], open === key && "ring-1 ring-current")}
                          >
                            {issue.chip}
                          </button>
                        );
                      })}
                    {fixed.map((issue) => (
                      <span key={issue.id} role="status" className={clsx(DONE, "motion-pop", fading && "opacity-0")}>
                        <Check size={12} aria-hidden="true" /> {issue.chip}
                      </span>
                    ))}
                  </div>
                  <Collapse show={!!picked}>
                    {picked && (
                      <div className="ps-6 text-xs leading-6 text-ink-muted">
                        <p>{picked.explain}</p>
                        {picked.fix && <QuickFix key={picked.id} meetingId={meetingId} href={href} anchor={item.anchor} fix={picked.fix} />}
                        {picked.overridable && <OverrideForm meetingId={meetingId} rule={picked.id} />}
                      </div>
                    )}
                  </Collapse>
                </div>
              </Collapse>
            </li>
          );
        })}
      </ul>
    </>
  );
}
