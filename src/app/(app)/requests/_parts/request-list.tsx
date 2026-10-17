import Link from "next/link";
import clsx from "clsx";
import { CalendarClock, ChevronLeft, FileText, ListChecks } from "lucide-react";
import { formatGregorianDate } from "@/lib/format";
import { STAGES, type PortalRow, type Stage } from "@/lib/portal";

const TONE: Record<Stage, string> = {
  new: "border-primary/50 text-primary",
  in_progress: "border-brass/60 text-brass",
  answered: "border-rule text-ink",
  returned: "border-brass/60 bg-brass-soft text-brass",
  done: "border-primary/40 bg-primary-soft text-primary",
};

export function StagePill({ stage }: { stage: Stage }) {
  return <span className={clsx("whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs", TONE[stage])}>{STAGES[stage]}</span>;
}

/** Overdue shows on its own, beside the status. */
export function LateBadge() {
  return <span className="whitespace-nowrap rounded-full bg-danger/15 px-2.5 py-0.5 text-xs font-medium text-danger">متأخر</span>;
}

const day = (d: string) => formatGregorianDate(new Date(`${d}T12:00:00+03:00`)).replace(/^[^،]+،\s*/, "");

/** The requests as a table on wide screens and as cards on a phone; each opens its details. */
export function RequestList({ rows, empty }: { rows: PortalRow[]; empty: string }) {
  if (!rows.length) return <p className="rounded-lg border border-dashed border-rule bg-surface p-8 text-center text-sm text-ink-muted">{empty}</p>;
  return (
    <>
      <table className="hidden w-full overflow-hidden rounded-lg border border-rule bg-surface text-sm md:table">
        <thead className="bg-paper text-xs text-ink-muted">
          <tr>
            <th className="px-4 py-2.5 text-start font-medium">الطلب</th>
            <th className="px-4 py-2.5 text-start font-medium">الاجتماع</th>
            <th className="px-4 py-2.5 text-start font-medium">الموعد النهائي</th>
            <th className="px-4 py-2.5 text-start font-medium">المسؤول</th>
            <th className="px-4 py-2.5 text-start font-medium">الحالة</th>
            <th className="px-4 py-2.5">
              <span className="sr-only">فتح</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {rows.map((r) => (
            <tr key={`${r.kind}-${r.id}`} className="motion-colors hover:bg-paper">
              <td className="px-4 py-3">
                <Link href={r.href} className="flex items-start gap-3">
                  <Kind kind={r.kind} />
                  <span className="min-w-0">
                    <span className="block font-medium hover:text-primary">{r.title}</span>
                    <span className="block text-xs text-ink-muted">{r.context}</span>
                  </span>
                </Link>
              </td>
              <td className="px-4 py-3 text-xs text-ink-muted">{r.meetingTitle ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs">{r.due ? <span className={r.late ? "text-danger" : ""}>{day(r.due)}</span> : "—"}</td>
              <td className="px-4 py-3 text-xs">{r.party}</td>
              <td className="px-4 py-3">
                <span className="flex flex-wrap gap-1.5">
                  <StagePill stage={r.stage} />
                  {r.late && <LateBadge />}
                </span>
              </td>
              <td className="px-4 py-3">
                <Link href={r.href} aria-label={`فتح ${r.title}`} className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-primary-soft hover:text-primary">
                  <ChevronLeft size={16} aria-hidden="true" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((r) => (
          <li key={`${r.kind}-${r.id}`}>
            <Link href={r.href} className={clsx("motion-colors flex flex-col gap-2 rounded-lg border bg-surface p-4 hover:border-primary", r.late ? "border-danger/50" : "border-rule")}>
              <span className="flex items-start gap-3">
                <Kind kind={r.kind} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{r.title}</span>
                  <span className="block text-xs text-ink-muted">{r.context}</span>
                </span>
                <ChevronLeft size={16} aria-hidden="true" className="mt-1 shrink-0 text-ink-muted" />
              </span>
              <span className="flex flex-wrap items-center gap-2 text-xs">
                <StagePill stage={r.stage} />
                {r.late && <LateBadge />}
                {r.due && (
                  <span className={clsx("inline-flex items-center gap-1", r.late ? "text-danger" : "text-ink-muted")}>
                    <CalendarClock size={13} aria-hidden="true" /> {day(r.due)}
                  </span>
                )}
                <span className="ms-auto text-ink-muted">{r.party}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function Kind({ kind }: { kind: PortalRow["kind"] }) {
  const Icon = kind === "document" ? FileText : ListChecks;
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary-soft text-primary" title={kind === "document" ? "مستند مطلوب لبند" : "مهمة من قرار"}>
      <Icon size={17} aria-hidden="true" />
    </span>
  );
}
