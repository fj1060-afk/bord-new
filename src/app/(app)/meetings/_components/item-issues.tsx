"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";
import { Collapse } from "@/components/ui/collapse";
import type { Issue } from "./item-issue-data";
import { OverrideForm } from "./override-form";
import { QuickFix } from "./quick-fix";
import { useResolved } from "./use-resolved";

const NUM = { block: "bg-danger text-white", warn: "bg-brass text-white", info: "bg-paper text-ink-muted" } as const;

/**
 * One box at the top of an item: «مطلوب منك» lists numbered issues with their fixes
 * (a fixed one shows ✓ and folds away), and the item's regulatory notes fold below it.
 */
export function ItemNeeds({ meetingId, itemId, issues, notes, notesCount = 0, sendPreview }: { meetingId: string; itemId: string; issues: Issue[]; notes?: ReactNode; notesCount?: number; sendPreview?: string }) {
  const { gone, fading } = useResolved(issues, (i) => i.id);
  const rows = [...issues.map((issue) => ({ issue, solved: false })), ...gone.map((issue) => ({ issue, solved: true }))];
  if (!rows.length && !notesCount) return null;
  const finished = !issues.length;

  return (
    <div className="mb-3 overflow-hidden rounded-md border border-rule">
      {rows.length > 0 && (
        <Collapse show={!(finished && fading)}>
          <p className={clsx("flex justify-between bg-paper px-3 py-2 text-xs font-medium", finished ? "text-primary" : "text-ink-muted")}>
            {finished ? (
              <span className="motion-pop inline-flex items-center gap-1.5">
                <Check size={14} aria-hidden="true" /> تم كل المطلوب منك في هذا البند
              </span>
            ) : (
              <>
                <span>مطلوب منك</span>
                <span className="font-mono">{issues.length}</span>
              </>
            )}
          </p>
          <ol>
            {rows.map(({ issue, solved }, index) => (
              <li key={issue.id}>
                <Collapse show={!(solved && fading)}>
                  <div className="flex items-start gap-2.5 border-t border-rule px-3 py-2.5 text-sm">
                    {solved ? (
                      <Check size={18} aria-hidden="true" className="motion-pop mt-0.5 shrink-0 text-primary" />
                    ) : (
                      <span className={clsx("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold", NUM[issue.level])} aria-hidden="true">
                        {index + 1}
                      </span>
                    )}
                    <div className="min-w-0 flex-1" role={solved ? "status" : undefined}>
                      <p className={clsx("font-medium", solved && "text-primary")}>{solved ? `تم: ${issue.chip}` : issue.chip}</p>
                      {!solved && (
                        <>
                          <p className="text-xs leading-6 text-ink-muted">{issue.explain}</p>
                          {issue.fix && <QuickFix meetingId={meetingId} itemId={itemId} fix={issue.fix} sendPreview={sendPreview} />}
                          {issue.overridable && <OverrideForm meetingId={meetingId} rule={issue.id} />}
                        </>
                      )}
                    </div>
                  </div>
                </Collapse>
              </li>
            ))}
          </ol>
        </Collapse>
      )}
      {notesCount > 0 && (
        <details className={clsx("group/notes text-sm", rows.length > 0 && "border-t border-rule")}>
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium text-ink-muted hover:bg-paper [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1">
              ملاحظات نظامية <span className="font-mono">({notesCount})</span>
            </span>
            <span>للاطلاع</span>
            <ChevronDown size={14} aria-hidden="true" className="shrink-0 transition-transform duration-(--motion-menu) group-open/notes:rotate-180" />
          </summary>
          <div className="border-t border-rule px-3 py-2.5">{notes}</div>
        </details>
      )}
    </div>
  );
}
