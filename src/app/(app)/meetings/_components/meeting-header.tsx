import clsx from "clsx";
import { Clock, Users } from "lucide-react";

const STATUS_TONE = { scheduled: "bg-primary-soft text-primary", draft: "bg-brass-soft text-brass" } as Record<string, string>;

/** The meeting's title block: body and number, title, when and how long, and its status. */
export function MeetingHeader({ section, title, when, time, minutes, type, status, statusLabel }: { section: string; title: string; when: string; time: string; minutes: number; type: string; status: string; statusLabel: string }) {
  return (
    <header className="mb-6 flex flex-col gap-2 border-b border-rule pb-5">
      <p className="text-sm text-brass">{section}</p>
      <h1 className="font-display text-2xl font-bold leading-snug text-ink sm:text-3xl">{title}</h1>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <Clock size={16} aria-hidden="true" /> {when} <span aria-hidden="true">·</span> {time}
        </span>
        <span aria-hidden="true" className="h-4 w-px bg-rule" />
        <span className="inline-flex items-center gap-1.5">
          <Users size={16} aria-hidden="true" /> {minutes} دقيقة <span aria-hidden="true">·</span> {type}
        </span>
      </p>
      <span className={clsx("mt-1 w-fit rounded-full px-3 py-0.5 text-sm", STATUS_TONE[status] ?? "border border-rule text-ink-muted")}>{statusLabel}</span>
    </header>
  );
}
