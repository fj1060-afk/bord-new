import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, ArrowLeft, Check as CheckIcon, ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import { blocking, stageDone, STAGES, type Check } from "@/lib/journey";
import { FixLink } from "./fix-link";
import { OverrideForm } from "./override-form";

const tone = (c: Check) => (c.ok ? "ok" : c.overridden || c.level === "info" ? "info" : c.level);
const BADGE = { ok: "bg-primary-soft text-primary", info: "bg-paper text-ink-muted", warn: "bg-brass-soft text-brass", block: "bg-danger/10 text-danger" } as const;
const ICON = { ok: CheckIcon, info: Info, warn: AlertTriangle, block: X } as const;
const WORD = { info: "للعلم", warn: "تنبيه", block: "مانع" } as const;

function Badge({ c }: { c: Check }) {
  const t = tone(c);
  const Icon = ICON[t];
  return (
    <span className={clsx("grid size-7 shrink-0 place-items-center rounded-full", BADGE[t])}>
      <Icon size={15} aria-hidden="true" />
    </span>
  );
}

/** One open condition: what is missing, the items it concerns, and a clear way to fix it. */
function OpenCheck({ c, meetingId, href }: { c: Check; meetingId: string; href: (tab?: string) => string }) {
  const t = tone(c) as keyof typeof WORD;
  const fix = c.fix;
  const first = fix?.targets?.[0]?.anchor ?? fix?.anchor;
  const button = buttonClass(t === "block" ? "primary" : "secondary", "shrink-0 px-3 py-1.5 text-xs");
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 gap-3">
        <Badge c={c} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {c.label}
            <span className={clsx("ms-2 rounded-full px-2 py-0.5 align-middle text-[11px] font-normal", BADGE[t])}>{WORD[t]}</span>
          </p>
          {c.ref && <p className="mt-0.5 text-xs text-ink-muted">{c.ref}</p>}
          {(fix?.targets?.length ? fix.note ?? c.detail : c.detail) && <p className="mt-1 text-xs text-ink-muted">{fix?.targets?.length ? fix.note ?? c.detail : c.detail}</p>}
          {!!fix?.targets?.length && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {fix.targets.map((target) => (
                <li key={target.anchor}>
                  <FixLink href={href(c.tab)} anchor={target.anchor} title="اذهب إلى البند" className="group flex items-center gap-2 rounded-md border border-rule bg-paper px-3 py-1.5 text-xs transition-colors hover:border-primary">
                    <span className="min-w-0 flex-1 truncate">{target.label}</span>
                    <ArrowLeft size={14} aria-hidden="true" className="shrink-0 text-primary transition-transform group-hover:-translate-x-0.5" />
                  </FixLink>
                </li>
              ))}
            </ul>
          )}
          {c.overridden && <p className="mt-1 text-xs text-brass">تجاوز بسبب: {c.overridden}</p>}
          {t === "warn" && <OverrideForm meetingId={meetingId} rule={c.id} />}
        </div>
      </div>
      {fix?.href ? (
        <Link href={fix.href} className={button}>
          {fix.label} <ArrowLeft size={14} aria-hidden="true" />
        </Link>
      ) : (
        <FixLink href={href(c.tab)} anchor={first} className={button}>
          {fix?.label ?? "أكمِل"} <ArrowLeft size={14} aria-hidden="true" />
        </FixLink>
      )}
    </li>
  );
}

/** The four-stage stepper, the viewed stage's checklist, and previous / next. */
export function JourneyBar({ meetingId, checks, current, view }: { meetingId: string; checks: Check[]; current: number; view: number }) {
  const stageHref = (n: number, tab?: string) => `/meetings/${meetingId}?stage=${n}${tab ? `&tab=${tab}` : ""}`;
  const list = checks.filter((c) => c.stage === view);
  const done = stageDone(checks, view);
  const missing = list.filter(blocking).length;
  const open = list.filter((c) => !c.ok && !c.overridden);
  const settled = list.filter((c) => c.ok || c.overridden);
  const percent = list.length ? Math.round((settled.length / list.length) * 100) : 100;

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
                <Link href={stageHref(s.n)} aria-current={s.n === view ? "step" : undefined} className="flex items-center justify-center gap-2 px-2 py-3 hover:bg-paper">
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

      <div className="flex items-center gap-3 border-b border-rule px-5 py-3 text-sm">
        <span className="shrink-0">
          <span className="font-mono">{settled.length}</span> من <span className="font-mono">{list.length}</span> مكتملة
        </span>
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="تقدّم المرحلة">
          <span className={clsx("block h-full rounded-full transition-[width] duration-500", done ? "bg-primary" : "bg-brass")} style={{ width: `${percent}%` }} />
        </span>
        <span className="shrink-0 font-mono text-xs text-ink-muted">{percent}%</span>
      </div>

      {open.length > 0 && (
        <ul className="divide-y divide-rule text-sm">
          {open.map((c) => (
            <OpenCheck key={c.id} c={c} meetingId={meetingId} href={(tab) => stageHref(view, tab)} />
          ))}
        </ul>
      )}

      {settled.length > 0 && (
        <details className="border-t border-rule text-sm" open={open.length === 0}>
          <summary className="cursor-pointer px-5 py-3 text-ink-muted hover:bg-paper">مكتملة ({settled.length})</summary>
          <ul className="divide-y divide-rule border-t border-rule">
            {settled.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-2.5">
                <Badge c={c} />
                <span className="min-w-0 flex-1">
                  {c.label}
                  {c.ref && <span className="ms-2 text-xs text-ink-muted">({c.ref})</span>}
                  {c.overridden && <span className="block text-xs text-brass">تجاوز بسبب: {c.overridden}</span>}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-5 py-3">
        {view > 1 ? (
          <Link href={stageHref(view - 1)} className={buttonClass("secondary")}>
            <ChevronRight size={16} aria-hidden="true" /> السابق
          </Link>
        ) : (
          <span />
        )}
        <span className="text-xs text-ink-muted">{done ? (view === 4 ? "اكتملت رحلة الاجتماع." : "المرحلة مكتملة.") : `باقي ${missing} ${missing === 1 ? "شرط" : "شروط"} قبل الانتقال.`}</span>
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
