import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, CalendarClock, Check as CheckIcon, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Info, Landmark, ListChecks, PenLine, Send, TriangleAlert, UserCog, UserPlus, type LucideIcon } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import { blocking, stageDone, STAGES, type Check } from "@/lib/journey";
import { fixMeetingTitleSpelling } from "../_actions/quick-fixes";
import { AutoFix } from "./auto-fix";
import { FixLink } from "./fix-link";
import { itemIssues, needsAction, tone } from "./item-issue-data";
import { OverrideForm } from "./override-form";
import { ResolvedChecks } from "./resolved-checks";

const DOT = { block: "bg-danger", warn: "bg-brass", info: "bg-ink-muted" } as const;

/** The icon on a meeting-wide check's fix button. */
const FIX_ICON: Record<string, LucideIcon> = { details: CalendarClock, "notice-time": CalendarClock, term: Landmark, secretary: UserCog, items: ListChecks, "quorum-possible": UserPlus, "title-year": PenLine };

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

  const card = "overflow-hidden rounded-lg border border-rule";
  const action = "motion-press inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/60 px-3 py-1.5 text-xs text-primary hover:bg-primary-soft";

  return (
    <section className="mb-6 rounded-xl border border-rule bg-surface">
      <ol className="flex items-start gap-1 border-b border-rule px-3 sm:px-5" aria-label="مراحل الاجتماع">
        {STAGES.map((s, i) => {
          const complete = stageDone(checks, s.n) && s.n < current + (stageDone(checks, current) ? 1 : 0);
          const reachable = s.n <= current;
          const body = (
            <>
              <span className={clsx("motion-colors grid size-8 shrink-0 place-items-center rounded-full border-2 text-sm font-bold", complete ? "border-primary bg-primary text-on-primary" : s.n === view ? "border-brass bg-brass-soft text-brass" : "border-rule text-ink-muted")}>
                {complete ? <CheckIcon size={15} aria-hidden="true" /> : s.n}
              </span>
              <span className={clsx("text-sm leading-tight", s.n === view ? "font-bold" : "text-ink-muted")}>{s.title}</span>
            </>
          );
          return (
            <li key={s.n} className="contents">
              {i > 0 && <span aria-hidden="true" className={clsx("mt-[1.6rem] h-px min-w-3 flex-1", complete || s.n <= current ? "bg-primary/50" : "bg-rule")} />}
              <span className={clsx("motion-colors shrink-0 border-b-2", s.n === view ? "border-brass" : "border-transparent")}>
                {reachable ? (
                  <Link href={stageHref(s.n)} aria-current={s.n === view ? "step" : undefined} className="motion-colors flex items-center gap-2 px-1 py-3 hover:opacity-80">
                    {body}
                  </Link>
                ) : (
                  <span className="flex items-center gap-2 px-1 py-3 opacity-60" aria-disabled="true">
                    {body}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      {/* The viewed stage's checks enter afresh when the stage changes. */}
      <div key={view} className="page-in flex flex-col gap-3 p-3 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className={clsx("grid size-9 shrink-0 place-items-center rounded-full", done ? "bg-primary text-on-primary" : "bg-brass text-white")}>
            {done ? <CheckIcon size={18} aria-hidden="true" /> : <span className="text-lg font-bold" aria-hidden="true">!</span>}
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block">{done ? (view === 4 ? "اكتملت رحلة الاجتماع" : "المرحلة مكتملة") : "استكمل المتطلبات للانتقال"}</strong>
            <span className="text-xs text-ink-muted">{done ? (view === 4 ? "لا شيء متبقٍّ." : "جاهز للانتقال إلى المرحلة التالية.") : `لا يمكن الانتقال بعد: ${blockersText(blockers)}`}</span>
          </span>
          <span className="flex gap-2">
            {blockers > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-danger/50 bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger">
                <CircleAlert size={14} aria-hidden="true" /> {blockers} {blockers === 1 ? "مانع" : "موانع"}
              </span>
            )}
            {warnings > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-brass/50 bg-brass-soft px-3 py-1.5 text-xs font-medium text-brass">
                <TriangleAlert size={14} aria-hidden="true" /> {warnings} {warnings === 1 ? "تنبيه" : "تنبيهات"}
              </span>
            )}
          </span>
        </div>

        {onMeeting.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink-muted">على الاجتماع</p>
            <ul className={clsx(card, "divide-y divide-rule text-sm")}>
              {onMeeting.map((c) => {
                const Icon = FIX_ICON[c.id] ?? ArrowLeft;
                return (
                  <li key={c.id}>
                    <details className="group/row">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-paper [&::-webkit-details-marker]:hidden">
                        <span className={clsx("size-2 shrink-0 rounded-full", DOT[tone(c)])} aria-hidden="true" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{c.label}</span>
                          {c.ref && <span className="text-xs text-ink-muted">{c.ref}</span>}
                        </span>
                        {c.id === "title-spelling" ? (
                          <AutoFix action={fixMeetingTitleSpelling.bind(null, meetingId)} />
                        ) : c.fix?.href ? (
                          <Link href={c.fix.href} className={action}>
                            <Icon size={14} aria-hidden="true" /> {c.fix.label}
                          </Link>
                        ) : (
                          <FixLink href={stageHref(view, c.tab)} anchor={c.fix?.anchor} className={action}>
                            <Icon size={14} aria-hidden="true" /> {c.fix?.label ?? "أكمِل"}
                          </FixLink>
                        )}
                      </summary>
                      <div className="flex flex-col gap-1 pb-3 pe-4 ps-9 text-xs leading-6 text-ink-muted">
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
                );
              })}
            </ul>
          </div>
        )}

        <ResolvedChecks open={onMeeting.map((c) => ({ id: c.id, label: c.label }))} />

        {items.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink-muted">على البنود</p>
            <div className={clsx(card, "flex flex-wrap items-center gap-3 px-4 py-3 text-sm")}>
              <ChevronLeft size={16} aria-hidden="true" className="shrink-0 text-ink-muted" />
              <span className="min-w-0 flex-1">
                <strong>{notesText(notes)}</strong> في {items.length === 1 ? "بند واحد" : items.length === 2 ? "بندين" : `${items.length} بنود`}
              </span>
              <FixLink href={agendaHref} anchor={items[0].anchor} className="motion-press inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-on-primary hover:opacity-90">
                <ListChecks size={14} aria-hidden="true" /> انتقل للبند {items[0].n ?? "الأول"}
              </FixLink>
            </div>
          </div>
        )}

        {unsent && (
          <FixLink href={agendaHref} anchor="send-requirements" className={buttonClass("primary", "min-h-11 w-full")}>
            <Send size={16} aria-hidden="true" /> راجع وأرسل طلبات المتطلبات{unsent.detail ? ` (${unsent.detail.match(/\d+/)?.[0] ?? ""})` : ""}
          </FixLink>
        )}

        {settled.length > 0 && (
          <details className={clsx(card, "group/done text-sm")} open={open.length === 0}>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 hover:bg-paper [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1 text-ink-muted">مكتملة ({settled.length})</span>
              <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-ink-muted transition-transform duration-(--motion-menu) group-open/done:rotate-180" />
            </summary>
            <ul className="flex flex-col gap-1 border-t border-rule px-4 py-3 text-xs text-ink-muted">
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
    </section>
  );
}

/** Previous / next stage, at the foot of the page; next waits until the viewed stage is complete. */
export function StageNav({ meetingId, checks, view }: { meetingId: string; checks: Check[]; view: number }) {
  const href = (n: number) => `/meetings/${meetingId}?stage=${n}`;
  const done = stageDone(checks, view);
  return (
    <nav aria-label="التنقل بين المراحل" className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4">
      {view > 1 ? (
        <Link href={href(view - 1)} className={buttonClass("secondary")}>
          <ChevronRight size={16} aria-hidden="true" /> السابق
        </Link>
      ) : (
        <span />
      )}
      {view < 4 &&
        (done ? (
          <Link href={href(view + 1)} className={buttonClass()}>
            التالي <ChevronLeft size={16} aria-hidden="true" />
          </Link>
        ) : (
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
              <Info size={14} aria-hidden="true" /> متاح بعد استكمال المتطلبات
            </span>
            <span className={buttonClass("primary", "pointer-events-none opacity-40")} aria-disabled="true">
              التالي <ChevronLeft size={16} aria-hidden="true" />
            </span>
          </span>
        ))}
    </nav>
  );
}
