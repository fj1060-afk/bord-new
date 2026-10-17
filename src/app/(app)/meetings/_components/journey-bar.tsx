import Link from "next/link";
import clsx from "clsx";
import { Check as CheckIcon, ChevronDown, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import { blocking, stageDone, STAGES, type Check } from "@/lib/journey";
import { fixMeetingTitleSpelling } from "../_actions/quick-fixes";
import { AutoFix } from "./auto-fix";
import { FixLink } from "./fix-link";
import { itemIssues, needsAction, tone } from "./item-issue-data";
import { OverrideForm } from "./override-form";
import { ResolvedChecks } from "./resolved-checks";

const DOT = { block: "bg-danger", warn: "bg-brass", info: "bg-ink-muted" } as const;

const notesText = (n: number) => (n === 1 ? "ملاحظة واحدة" : n === 2 ? "ملاحظتان" : n <= 10 ? `${n} ملاحظات` : `${n} ملاحظة`);
const blockersText = (n: number) => (n === 1 ? "يمنعك شرط واحد" : n === 2 ? "يمنعك شرطان" : `يمنعك ${n} شروط`);

/** The four-stage stepper, the viewed stage's checks (meeting-wide, then per item), and previous / next. */
export function JourneyBar({ meetingId, checks, current, view }: { meetingId: string; checks: Check[]; current: number; view: number }) {
  const stageHref = (n: number, tab?: string) => `/meetings/${meetingId}?stage=${n}${tab ? `&tab=${tab}` : ""}`;
  const list = checks.filter((c) => c.stage === view);
  const done = stageDone(checks, view);
  const blockers = list.filter(blocking).length;
  const open = list.filter((c) => !c.ok && !c.overridden);
  const settled = list.filter((c) => c.ok || c.overridden);
  const warnings = open.filter((c) => c.level === "warn").length;
  const onItems = open.filter((c) => c.fix?.targets?.length);
  const titleYear = open.find((c) => c.id === "title-year");
  const spelling = open.find((c) => c.id === "title-spelling");
  const onMeeting = open.filter((c) => !c.fix?.targets?.length && !(titleYear && c.id === "title-spelling"));
  const items = itemIssues(onItems).filter((i) => needsAction(i.issues).count);
  const notes = items.reduce((n, i) => n + needsAction(i.issues).count, 0);
  const unsent = open.find((c) => c.id === "requirements-sent");
  const agendaHref = stageHref(view, "agenda");

  return (
    <section className="mb-6 rounded-lg border border-rule bg-surface">
      <ol className="flex border-b border-rule" aria-label="مراحل الاجتماع">
        {STAGES.map((s) => {
          const complete = stageDone(checks, s.n) && s.n < current + (stageDone(checks, current) ? 1 : 0);
          const reachable = s.n <= current;
          const body = (
            <>
              <span className={clsx("motion-colors grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold", complete ? "border-primary bg-primary text-on-primary" : s.n === view ? "border-brass text-brass" : "border-rule text-ink-muted")}>
                {complete ? <CheckIcon size={14} aria-hidden="true" /> : s.n}
              </span>
              <span className={clsx("text-sm", s.n === view ? "font-bold" : "text-ink-muted")}>{s.title}</span>
            </>
          );
          return (
            <li key={s.n} className={clsx("motion-colors flex-1 border-b-2", s.n === view ? "border-brass" : "border-transparent")}>
              {reachable ? (
                <Link href={stageHref(s.n)} aria-current={s.n === view ? "step" : undefined} className="motion-colors flex items-center justify-center gap-2 px-2 py-3 hover:bg-paper">
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

      {/* The viewed stage's checks enter afresh when the stage changes. */}
      <div key={view} className="page-in">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm">
        <strong className="min-w-0 flex-1">{done ? (view === 4 ? "اكتملت رحلة الاجتماع." : "المرحلة مكتملة، جاهز للانتقال.") : `لا يمكن الانتقال بعد: ${blockersText(blockers)}`}</strong>
        <span className="flex gap-1.5">
          {blockers > 0 && <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-xs text-danger">{blockers} مانع</span>}
          {warnings > 0 && <span className="rounded-full bg-brass-soft px-2.5 py-0.5 text-xs text-brass">{warnings} تنبيه</span>}
        </span>
      </div>

      {onMeeting.length > 0 && (
        <>
          <p className="border-t border-rule px-5 pb-1 pt-3 text-xs font-medium text-ink-muted">على الاجتماع</p>
          <ul className="text-sm">
            {onMeeting.map((c) => (
              <li key={c.id} className="border-t border-rule first:border-t-0">
                <details className="group/row">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-2.5 hover:bg-paper [&::-webkit-details-marker]:hidden">
                    <span className={clsx("size-2 shrink-0 rounded-full", DOT[tone(c)])} aria-hidden="true" />
                    <span className="min-w-0 flex-1 font-medium">
                      {c.label}
                      {c.ref && <span className="ms-2 text-xs font-normal text-ink-muted">{c.ref}</span>}
                    </span>
                    {c.id === "title-spelling" ? (
                      <AutoFix action={fixMeetingTitleSpelling.bind(null, meetingId)} />
                    ) : c.fix?.href ? (
                      <Link href={c.fix.href} className="motion-press shrink-0 rounded-md border border-rule px-3 py-1 text-xs hover:border-primary">
                        {c.fix.label}
                      </Link>
                    ) : (
                      <FixLink href={stageHref(view, c.tab)} anchor={c.fix?.anchor} className="motion-press shrink-0 rounded-md border border-rule px-3 py-1 text-xs hover:border-primary">
                        {c.fix?.label ?? "أكمِل"}
                      </FixLink>
                    )}
                    <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-ink-muted transition-transform duration-(--motion-menu) group-open/row:rotate-180" />
                  </summary>
                  <div className="flex flex-col gap-1 pb-3 pe-5 ps-10 text-xs leading-6 text-ink-muted">
                    {c.detail && <p>{c.detail}</p>}
                    {c === titleYear && spelling?.detail && (
                      <p className="flex flex-wrap items-center gap-2">
                        {spelling.detail}
                        <AutoFix action={fixMeetingTitleSpelling.bind(null, meetingId)} label="صحّح الإملاء تلقائياً" />
                      </p>
                    )}
                    {c.level === "warn" && <OverrideForm meetingId={meetingId} rule={c.id} />}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </>
      )}

      <ResolvedChecks open={onMeeting.map((c) => ({ id: c.id, label: c.label }))} />

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-rule px-5 py-3 text-sm">
          <span className="min-w-0 flex-1">
            على البنود: <strong>{notesText(notes)}</strong> في {items.length === 1 ? "بند واحد" : items.length === 2 ? "بندين" : `${items.length} بنود`}
          </span>
          <FixLink href={agendaHref} anchor={items[0].anchor} className="motion-press shrink-0 rounded-md bg-primary px-3 py-1 text-xs text-on-primary hover:opacity-90">
            انتقل للبند {items[0].n ?? "الأول"}
          </FixLink>
        </div>
      )}

      {unsent && (
        <div className="border-t border-rule px-5 py-3">
          <FixLink href={agendaHref} anchor="send-requirements" className={buttonClass("primary", "text-sm")}>
            <Send size={15} aria-hidden="true" /> راجع وأرسل طلبات المتطلبات{unsent.detail ? ` (${unsent.detail.match(/\d+/)?.[0] ?? ""})` : ""}
          </FixLink>
        </div>
      )}

      {settled.length > 0 && (
        <details className="border-t border-rule text-sm" open={open.length === 0}>
          <summary className="cursor-pointer px-5 py-2.5 text-ink-muted hover:bg-paper">مكتملة ({settled.length})</summary>
          <ul className="flex flex-col gap-1 px-5 pb-3 text-xs text-ink-muted">
            {settled.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <CheckIcon size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
                <span>
                  {c.label}
                  {c.overridden && <span className="text-brass"> · تجاوز بسبب: {c.overridden}</span>}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-5 py-3">
        {view > 1 ? (
          <Link href={stageHref(view - 1)} className={buttonClass("secondary")}>
            <ChevronRight size={16} aria-hidden="true" /> السابق
          </Link>
        ) : (
          <span />
        )}
        {view < 4 &&
          (done ? (
            <Link href={stageHref(view + 1)} className={buttonClass()}>
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
