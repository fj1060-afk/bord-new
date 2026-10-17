import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, CalendarClock, Check as CheckIcon, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, Info, Landmark, ListChecks, PenLine, Send, UserCog, UserPlus, type LucideIcon } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import { blocking, stageDone, STAGES, type Check } from "@/lib/journey";
import { fixMeetingTitleSpelling } from "../_actions/quick-fixes";
import { AutoFix } from "./auto-fix";
import { FixLink } from "./fix-link";
import { itemIssues, needsAction, tone } from "./item-issue-data";
import { OverrideForm } from "./override-form";
import { PROBLEM, STAGE_NOTES, summaryOf, TILE, tileCount } from "./journey-text";
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
  // A warning holds the stage until it is fixed or passed with a reason, but it is not a hard stop: count each kind once.
  const hard = open.filter((c) => c.level === "block");
  const warns = open.filter((c) => c.level === "warn");
  const pending = [...hard, ...warns];
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
      <ol className="grid grid-cols-4 border-b border-rule px-1 pb-3 pt-4 sm:px-4" aria-label="مراحل الاجتماع">
        {STAGES.map((s, i) => {
          const complete = stageDone(checks, s.n) && s.n < current + (stageDone(checks, current) ? 1 : 0);
          const isCurrent = s.n === current && !complete;
          const reachable = s.n <= current;
          const body = (
            <>
              <span
                className={clsx(
                  "motion-colors relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 text-sm font-bold",
                  isCurrent ? "border-primary bg-primary text-on-primary" : complete ? "border-primary bg-surface text-primary" : "border-rule bg-surface text-ink-muted",
                )}
              >
                {complete ? <CheckIcon size={15} aria-hidden="true" /> : s.n}
              </span>
              <span className={clsx("mt-1.5 text-xs leading-tight sm:text-sm", s.n === view ? "font-bold" : "font-medium", isCurrent ? "text-primary" : reachable ? "text-ink" : "text-ink-muted")}>{s.title}</span>
              <span className={clsx("mt-0.5 text-[10px] leading-snug max-[359px]:hidden sm:text-xs", isCurrent ? "text-primary" : "text-ink-muted")}>{STAGE_NOTES[s.n]}</span>
              <span aria-hidden="true" className={clsx("mt-2 h-0.5 w-10 rounded-full", s.n === view ? "bg-primary" : "bg-transparent")} />
            </>
          );
          return (
            <li key={s.n} className="relative flex min-w-0 flex-col items-center px-0.5 text-center">
              {/* The line to the next stage, from this circle's centre to the next one's. */}
              {i < STAGES.length - 1 && <span aria-hidden="true" className={clsx("absolute start-1/2 top-4 h-0.5 w-full", s.n < current || complete ? "bg-primary/70" : "bg-rule")} />}
              {reachable ? (
                <Link href={stageHref(s.n)} aria-current={s.n === view ? "step" : undefined} className="motion-colors flex flex-col items-center hover:opacity-80">
                  {body}
                </Link>
              ) : (
                <span className="flex flex-col items-center opacity-70" aria-disabled="true">
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* The viewed stage's checks enter afresh when the stage changes. */}
      <div key={view} className="page-in flex flex-col gap-3 p-3 sm:p-5">
        <div className={clsx("flex flex-col gap-3 rounded-lg border p-3 sm:p-4", done ? "border-rule" : hard.length ? "border-danger/60" : "border-brass/60")}>
          <div className="flex items-start gap-3">
            <span className={clsx("grid size-9 shrink-0 place-items-center rounded-full", done ? "bg-primary text-on-primary" : hard.length ? "bg-danger text-white" : "bg-brass text-white")}>
              {done ? <CheckIcon size={18} aria-hidden="true" /> : <span className="text-lg font-bold" aria-hidden="true">!</span>}
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block">{done ? (view === 4 ? "اكتملت رحلة الاجتماع" : "المرحلة مكتملة") : "ما يلزم قبل الانتقال"}</strong>
              <span className="text-xs text-ink-muted">
                {done ? (view === 4 ? "لا شيء متبقٍّ." : "جاهز للانتقال إلى المرحلة التالية.") : hard.length ? `لا يمكن الانتقال بعد: ${blockersText(blockers)}` : "لا موانع؛ عالج التنبيهات أو تجاوزها بذكر السبب للانتقال"}
              </span>
            </span>
          </div>
          {pending.length > 0 && (
            <ul className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]" aria-label="ملخص ما يلزم">
              {pending.map((c) => {
                const [name, Icon] = TILE[c.id] ?? [c.label, CircleAlert];
                return (
                  <li key={c.id}>
                    <FixLink href={stageHref(view, c.tab)} anchor={c.fix?.targets?.[0]?.anchor ?? c.fix?.anchor} title={PROBLEM[c.id] ? `${PROBLEM[c.id][0]}. الحل: ${PROBLEM[c.id][1]}` : c.label} className="motion-colors flex h-full items-center gap-3 rounded-lg border border-rule bg-paper px-3 py-2.5 hover:border-primary">
                      <span className={clsx("font-mono text-xl font-bold", c.level === "block" ? "text-danger" : "text-brass")}>{tileCount(c)}</span>
                      <span className="min-w-0 flex-1 text-xs leading-5">
                        <span className="block font-medium text-ink">{name}</span>
                        {summaryOf(c) && <span className="block text-ink-muted">{summaryOf(c)}</span>}
                      </span>
                      <Icon size={20} aria-hidden="true" className={clsx("shrink-0", c.level === "block" ? "text-danger" : "text-brass")} />
                    </FixLink>
                  </li>
                );
              })}
            </ul>
          )}

          {pending.length > 0 && (
            <details id="requirements" className="group/req" open={hard.length > 0}>
              <summary className="motion-press inline-flex min-h-11 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-brass/60 px-4 text-sm font-medium text-brass hover:bg-brass-soft sm:w-fit [&::-webkit-details-marker]:hidden">
                <span className="group-open/req:hidden">عرض المتطلبات</span>
                <span className="hidden group-open/req:inline">إخفاء المتطلبات</span>
                <ChevronDown size={16} aria-hidden="true" className="transition-transform duration-(--motion-menu) group-open/req:rotate-180" />
              </summary>
              <div className="mt-3 flex flex-col gap-3">
          {onMeeting.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-ink-muted">على الاجتماع</p>
              <ul className={clsx(card, "divide-y divide-rule text-sm")}>
                {onMeeting.map((c) => {
                  const Icon = FIX_ICON[c.id] ?? ArrowLeft;
                  return (
                    <li key={c.id}>
                      <details className="group/row">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 hover:bg-paper [&::-webkit-details-marker]:hidden">
                          <span className={clsx("size-2 shrink-0 rounded-full", DOT[tone(c)])} aria-hidden="true" />
                          <span className="min-w-0 flex-1 basis-44">
                            <span className="block font-medium">{PROBLEM[c.id]?.[0] ?? c.label}</span>
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
                          {PROBLEM[c.id] && <p>الحل: {PROBLEM[c.id][1]}</p>}
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
              {/* The notes live inside each item; this lists the items that have them, each one a link to it. */}
              <details className={clsx(card, "group/items text-sm")}>
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3 hover:bg-paper [&::-webkit-details-marker]:hidden">
                  <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-ink-muted transition-transform duration-(--motion-menu) group-open/items:rotate-180" />
                  <span className="min-w-0 flex-1 basis-48">
                    <strong>{notesText(notes)}</strong> في {items.length === 1 ? "بند واحد" : items.length === 2 ? "بندين" : `${items.length} بنود`}
                    <span className="block text-xs text-ink-muted">اضغط لعرض البنود</span>
                  </span>
                  <FixLink href={agendaHref} anchor={items[0].anchor} className="motion-press inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-on-primary hover:opacity-90">
                    <ListChecks size={14} aria-hidden="true" /> انتقل للبند {items[0].n ?? "الأول"}
                  </FixLink>
                </summary>
                <ul className="divide-y divide-rule border-t border-rule">
                  {items.map((i) => {
                    const need = needsAction(i.issues);
                    return (
                      <li key={i.anchor}>
                        <FixLink href={agendaHref} anchor={i.anchor} className="flex items-start gap-3 px-4 py-2.5 hover:bg-paper">
                          <span className={clsx("mt-1.5 size-2 shrink-0 rounded-full", need.level === "block" ? "bg-danger" : "bg-brass")} aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">
                              {i.n ? `البند ${i.n}: ` : ""}
                              {i.label}
                            </span>
                            <span className="text-xs text-ink-muted">{i.issues.filter((x) => x.level !== "info").map((x) => x.chip).join(" · ")}</span>
                          </span>
                          <span className="shrink-0 text-xs text-primary">{notesText(need.count)}</span>
                        </FixLink>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </div>
          )}

          {unsent && (
            <FixLink href={agendaHref} anchor="send-requirements" className={buttonClass("primary", "min-h-11 w-full")}>
              <Send size={16} aria-hidden="true" /> راجع وأرسل طلبات المتطلبات{unsent.detail ? ` (${unsent.detail.match(/\d+/)?.[0] ?? ""})` : ""}
            </FixLink>
          )}

              </div>
            </details>
          )}
        </div>

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
  const pending = checks.filter((c) => c.stage === view && !c.ok && !c.overridden && c.level !== "info").length;
  // Previous on the start side, the stage's open count in the middle, next on the end side; touch-sized on a phone.
  return (
    <nav aria-label="التنقل بين المراحل" className="mt-8 flex items-center justify-between gap-3 border-t border-rule pt-4">
      {view > 1 ? (
        <Link href={href(view - 1)} className={buttonClass("secondary", "min-h-11")}>
          <ChevronRight size={16} aria-hidden="true" /> السابق
        </Link>
      ) : (
        <span />
      )}
      {!done && pending > 0 && (
        <FixLink href={href(view)} anchor="requirements" className="inline-flex min-w-0 items-center gap-1.5 text-center text-xs text-brass hover:underline">
          <Info size={14} aria-hidden="true" className="shrink-0" /> متطلبات معلقة: {pending}
        </FixLink>
      )}
      {view < 4 &&
        (done ? (
          <Link href={href(view + 1)} className={buttonClass("primary", "min-h-11")}>
            التالي <ChevronLeft size={16} aria-hidden="true" />
          </Link>
        ) : (
          <span className={buttonClass("primary", "min-h-11 pointer-events-none opacity-40")} aria-disabled="true" title="متاح بعد استكمال المتطلبات">
            التالي <ChevronLeft size={16} aria-hidden="true" />
          </span>
        ))}
    </nav>
  );
}
