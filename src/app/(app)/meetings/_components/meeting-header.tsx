import Link from "next/link";
import clsx from "clsx";
import { CalendarDays, ChevronLeft, Clock, Eye, Hash, Timer, Users } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import { menuItem, RowMenu } from "@/components/ui/row-menu";

const STATUS_TONE = { scheduled: "border-primary/50 bg-primary-soft text-primary", draft: "border-brass/50 bg-brass-soft text-brass", cancelled: "border-danger/50 bg-danger/10 text-danger" } as Record<string, string>;

type Crumb = { label: string; href: string };

/**
 * The meeting's title block: where it belongs (breadcrumb), the title with its status beside it,
 * one row of facts (date, time, format, duration, number) and the secondary actions,
 * which fold into a «⋮» menu on a phone.
 */
export function MeetingHeader({
  crumbs,
  title,
  date,
  time,
  mode,
  minutes,
  code,
  status,
  statusLabel,
  extraordinary,
  previewHref,
}: {
  crumbs: Crumb[];
  title: string;
  date: string;
  time: string;
  mode: string;
  minutes: number;
  code: string | null;
  status: string;
  statusLabel: string;
  extraordinary?: boolean;
  previewHref: string;
}) {
  const fact = "inline-flex items-center gap-1.5 whitespace-nowrap";
  const sep = <span aria-hidden="true" className="hidden h-4 w-px bg-rule sm:block" />;
  return (
    <header className="mb-5 flex flex-col gap-2 border-b border-rule pb-4">
      {crumbs.length > 0 && (
        <nav aria-label="المسار" className="flex flex-wrap items-center gap-1 text-xs text-brass">
          {crumbs.map((c, i) => (
            <span key={c.href} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronLeft size={13} aria-hidden="true" className="text-ink-muted" />}
              <Link href={c.href} className="hover:underline">
                {c.label}
              </Link>
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="font-display text-xl font-bold leading-snug text-ink sm:text-2xl">{title}</h1>
          <span className={clsx("whitespace-nowrap rounded-full border px-3 py-0.5 text-xs font-medium", STATUS_TONE[status] ?? "border-rule text-ink-muted")}>{statusLabel}</span>
          {extraordinary && <span className="whitespace-nowrap rounded-full border border-rule px-3 py-0.5 text-xs text-ink-muted">استثنائي</span>}
        </div>
        <span className="hidden shrink-0 sm:block">
          <a href={previewHref} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
            <Eye size={16} aria-hidden="true" /> معاينة الدعوة
          </a>
        </span>
        <RowMenu label="خيارات الاجتماع" className="shrink-0 sm:hidden">
          <a href={previewHref} target="_blank" rel="noreferrer" className={menuItem}>
            <Eye size={15} aria-hidden="true" /> معاينة الدعوة
          </a>
        </RowMenu>
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-muted">
        <span className={fact}>
          <CalendarDays size={15} aria-hidden="true" /> {date}
        </span>
        {sep}
        <span className={fact}>
          <Clock size={15} aria-hidden="true" /> {time}
        </span>
        {sep}
        <span className={fact}>
          <Users size={15} aria-hidden="true" /> {mode}
        </span>
        {sep}
        <span className={fact}>
          <Timer size={15} aria-hidden="true" /> {minutes} دقيقة (مخططة)
        </span>
        {code && (
          <>
            {sep}
            <span className={fact}>
              <Hash size={15} aria-hidden="true" />
              <span dir="ltr" className="font-mono">
                {code}
              </span>
            </span>
          </>
        )}
      </p>
    </header>
  );
}
