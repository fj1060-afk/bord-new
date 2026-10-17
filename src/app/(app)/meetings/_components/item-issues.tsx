"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import { Collapse } from "@/components/ui/collapse";
import type { Issue } from "./item-issue-data";
import { OverrideForm } from "./override-form";
import { QuickFix } from "./quick-fix";
import { useResolved } from "./use-resolved";

const DOT = { block: "bg-danger", warn: "bg-brass", info: "bg-ink-muted" } as const;

/** "يحتاج تدخلك" at the top of an item: each issue with its fix; a fixed one shows ✓ and folds away. */
export function ItemNeeds({ meetingId, itemId, issues }: { meetingId: string; itemId: string; issues: Issue[] }) {
  const { gone, fading } = useResolved(issues, (i) => i.id);
  const rows = [...issues.map((issue) => ({ issue, solved: false })), ...gone.map((issue) => ({ issue, solved: true }))];
  if (!rows.length) return null;
  const finished = !issues.length;

  return (
    <Collapse show={!(finished && fading)}>
      <div className={clsx("mb-3 overflow-hidden rounded-md border", finished ? "border-primary/40" : "border-rule")}>
        <p className="flex justify-between bg-paper px-3 py-2 text-xs font-medium text-ink-muted">
          {finished ? (
            <span className="motion-pop inline-flex items-center gap-1.5 text-primary">
              <Check size={14} aria-hidden="true" /> اكتمل البند، لا شيء يحتاج تدخلك
            </span>
          ) : (
            <>
              <span>يحتاج تدخلك</span>
              <span className="font-mono">{issues.length}</span>
            </>
          )}
        </p>
        <ul>
          {rows.map(({ issue, solved }) => (
            <li key={issue.id}>
              <Collapse show={!(solved && fading)}>
                <div className="flex items-start gap-2.5 border-t border-rule px-3 py-2.5 text-sm">
                  {solved ? (
                    <Check size={16} aria-hidden="true" className="motion-pop mt-0.5 shrink-0 text-primary" />
                  ) : (
                    <span className={clsx("mt-2 size-2 shrink-0 rounded-full", DOT[issue.level])} aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1" role={solved ? "status" : undefined}>
                    <p className={clsx("font-medium", solved && "text-primary")}>{solved ? `تم: ${issue.chip}` : issue.chip}</p>
                    {!solved && (
                      <>
                        <p className="text-xs leading-6 text-ink-muted">{issue.explain}</p>
                        {issue.fix && <QuickFix meetingId={meetingId} itemId={itemId} fix={issue.fix} />}
                        {issue.overridable && <OverrideForm meetingId={meetingId} rule={issue.id} />}
                      </>
                    )}
                  </div>
                </div>
              </Collapse>
            </li>
          ))}
        </ul>
      </div>
    </Collapse>
  );
}
