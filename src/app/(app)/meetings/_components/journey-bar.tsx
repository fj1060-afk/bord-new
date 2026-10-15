import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, Check as CheckIcon, ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import { blocking, stageDone, STAGES, type Check } from "@/lib/journey";
import { OverrideForm } from "./override-form";

/** The four-stage stepper, the viewed stage's checklist, and previous / next. */
export function JourneyBar({ meetingId, checks, current, view }: { meetingId: string; checks: Check[]; current: number; view: number }) {
  const href = (n: number, tab?: string) => `/meetings/${meetingId}?stage=${n}${tab ? `&tab=${tab}` : ""}`;
  const list = checks.filter((c) => c.stage === view);
  const done = stageDone(checks, view);
  const missing = list.filter(blocking).length;

  return (
    <section className="mb-6 rounded-lg border border-rule bg-surface">
      <ol className="flex border-b border-rule" aria-label="مراحل الاجتماع">
        {STAGES.map((s) => {
          const complete = stageDone(checks, s.n) && s.n < current + (stageDone(checks, current) ? 1 : 0);
          const reachable = s.n <= current;
          const body = (
            <>
              <span className={clsx("grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold", complete ? "border-primary bg-primary text-on-primary" : s.n === view ? "border-brass text-brass" : "border-rule text-ink-muted")}>
                {complete ? <CheckIcon size={14} aria-hidden="true" /> : s.n}
              </span>
              <span className={clsx("text-sm", s.n === view ? "font-bold" : "text-ink-muted")}>{s.title}</span>
            </>
          );
          return (
            <li key={s.n} className={clsx("flex-1 border-b-2", s.n === view ? "border-brass" : "border-transparent")}>
              {reachable ? (
                <Link href={href(s.n)} aria-current={s.n === view ? "step" : undefined} className="flex items-center justify-center gap-2 px-2 py-3 hover:bg-paper">
                  {body}
                </Link>
              ) : (
                <span className="flex items-center justify-center gap-2 px-2 py-3 opacity-60" aria-disabled="true">
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <ul className="divide-y divide-rule text-sm">
        {list.map((c) => {
          const Icon = c.ok ? CheckIcon : c.overridden || c.level === "info" ? Info : c.level === "warn" ? AlertTriangle : X;
          return (
            <li key={c.id} className="flex items-start gap-3 px-5 py-2.5">
              <Icon size={16} aria-hidden="true" className={clsx("mt-0.5 shrink-0", c.ok ? "text-primary" : c.overridden || c.level === "info" ? "text-ink-muted" : c.level === "warn" ? "text-brass" : "text-danger")} />
              <div className="min-w-0 flex-1">
                <p className={clsx(!c.ok && c.level === "block" && "font-medium")}>
                  {c.label}
                  {c.ref && <span className="ms-2 text-xs text-ink-muted">({c.ref})</span>}
                </p>
                {c.detail && !c.ok && <p className="text-xs text-ink-muted">{c.detail}</p>}
                {c.overridden && <p className="text-xs text-brass">تجاوز بسبب: {c.overridden}</p>}
                {!c.ok && c.level === "warn" && !c.overridden && <OverrideForm meetingId={meetingId} rule={c.id} />}
              </div>
              {!c.ok && (
                <Link href={href(view, c.tab)} className="shrink-0 text-xs text-primary hover:underline">
                  أكمِل
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-5 py-3">
        {view > 1 ? (
          <Link href={href(view - 1)} className={buttonClass("secondary")}>
            <ChevronRight size={16} aria-hidden="true" /> السابق
          </Link>
        ) : (
          <span />
        )}
        <span className="text-xs text-ink-muted">{done ? (view === 4 ? "اكتملت رحلة الاجتماع." : "المرحلة مكتملة.") : `باقي ${missing} ${missing === 1 ? "شرط" : "شروط"} قبل الانتقال.`}</span>
        {view < 4 &&
          (done ? (
            <Link href={href(view + 1)} className={buttonClass()}>
              التالي <ChevronLeft size={16} aria-hidden="true" />
            </Link>
          ) : (
            <span className={buttonClass("primary", "pointer-events-none opacity-40")} aria-disabled="true">
              التالي <ChevronLeft size={16} aria-hidden="true" />
            </span>
          ))}
      </div>
    </section>
  );
}
