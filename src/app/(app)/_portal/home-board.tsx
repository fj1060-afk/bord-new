"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertTriangle, CalendarDays, ChevronDown, Clock, ExternalLink, FileText, ListChecks, MessageSquareWarning, Paperclip, Upload, UserRound, type LucideIcon } from "lucide-react";
import { Collapse } from "@/components/ui/collapse";
import { formatGregorianDate } from "@/lib/format";
import { needsAction, timingLabel, timingOf, type PortalRow, type Timing } from "@/lib/portal";
import { UploadDocument } from "../meetings/_components/upload-document";

type Filter = "all" | "late" | "today" | "soon" | "done" | "mine";

const TONE: Record<Timing, string> = {
  late: "bg-danger/15 text-danger",
  today: "bg-brass-soft text-brass",
  soon: "bg-info-soft text-info",
  later: "border border-rule text-ink-muted",
  answered: "border border-rule text-ink",
  done: "bg-primary-soft text-primary",
};

const dmy = (d: string) => d.split("-").reverse().join("/");
const year = (iso: string) => formatGregorianDate(new Date(iso)).replace(/^[^،]+،\s*/, "");

/**
 * The home page's working area: three summary cards that filter the list, the filter chips,
 * and the list itself (a table on wide screens, cards on a phone), each row opening in place.
 */
export function HomeBoard({ rows, today }: { rows: PortalRow[]; today: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const timed = rows.map((r) => ({ ...r, timing: timingOf(r.stage, r.due, today) }));
  const active = timed.filter((r) => r.timing !== "done");
  const mine = timed.filter((r) => needsAction(r.stage));
  const of = (t: Timing) => timed.filter((r) => r.timing === t);
  const counts: Record<Filter, number> = { all: active.length, late: of("late").length, today: of("today").length, soon: of("soon").length, done: of("done").length, mine: mine.length };
  const shown = filter === "all" ? active : filter === "mine" ? mine : of(filter);
  const docs = mine.filter((r) => r.kind === "document").length;
  const pick = (f: Filter) => {
    setFilter(f);
    setOpen(null);
  };

  const cards: [Filter, string, LucideIcon, string, string, string][] = [
    ["mine", "بانتظارك أنت", UserRound, "text-primary", "border-primary/40", docs ? `${docs === 1 ? "مستند" : "مستندات"} للرفع${mine.length > docs ? ` · ${mine.length - docs} مهام` : ""}` : "لا شيء عليك الآن"],
    ["today", "مهام اليوم", Clock, "text-brass", "border-brass/40", counts.today ? "مطلوب إنجازها اليوم" : "لا شيء مستحق اليوم"],
    ["late", "إجراءات عاجلة", AlertTriangle, "text-danger", "border-danger/40", counts.late ? "متأخرة عن موعدها" : "لا شيء متأخر"],
  ];
  const chips: [Filter, string][] = [
    ["all", "الكل"],
    ["late", "متأخرة"],
    ["today", "اليوم"],
    ["soon", "قريبة"],
    ["done", "منجزة"],
  ];

  return (
    <>
      <ul className="mb-6 grid gap-3 sm:grid-cols-3">
        {cards.map(([key, label, Icon, tone, border, note]) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => pick(key)}
              aria-pressed={filter === key}
              className={clsx("motion-lift flex h-full w-full items-center gap-4 rounded-xl border bg-surface p-4 text-start", filter === key || counts[key] ? border : "border-rule")}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon size={17} aria-hidden="true" className={tone} /> {label}
                </span>
                <span className={clsx("block font-mono text-3xl font-bold", counts[key] ? "text-ink" : "text-ink-muted")}>{counts[key]}</span>
                <span className={clsx("block text-xs", key === "late" && counts.late ? "text-danger" : "text-ink-muted")}>{note}</span>
              </span>
              <span className={clsx("grid size-12 shrink-0 place-items-center rounded-xl bg-paper", tone)}>
                <Icon size={22} aria-hidden="true" />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <section className="overflow-hidden rounded-xl border border-rule bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-rule p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-paper text-ink-muted">
            <FileText size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 basis-48">
            <h2 className="font-display text-lg font-bold">يحتاج انتباهك</h2>
            <p className="text-xs text-ink-muted">المهام والمستندات التي تتطلب إجراءً منك</p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="تصفية">
            {chips.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => pick(key)}
                aria-pressed={filter === key}
                className={clsx("motion-colors inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-sm", filter === key ? "border-primary bg-primary-soft text-primary" : "border-rule text-ink-muted hover:text-ink")}
              >
                {label} <span className="font-mono">{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-muted">{filter === "done" ? "لا مهام منجزة بعد." : "لا شيء هنا الآن."}</p>
        ) : (
          <>
            {/* On a tablet the table scrolls sideways inside its card rather than widening the page. */}
            <div className="relative hidden overflow-x-auto md:block">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="whitespace-nowrap bg-paper text-xs text-ink-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">المستند المطلوب</th>
                  <th className="px-4 py-3 text-start font-medium">الاجتماع</th>
                  <th className="hidden px-4 py-3 text-start font-medium lg:table-cell">الجهة المسؤولة</th>
                  <th className="px-4 py-3 text-start font-medium">الموعد</th>
                  <th className="px-4 py-3 text-start font-medium">الحالة</th>
                  <th className="px-4 py-3 text-start font-medium">الإجراء</th>
                  <th className="w-12 px-2 py-3">
                    <span className="sr-only">التفاصيل</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const key = `${r.kind}-${r.id}`;
                  const isOpen = open === key;
                  return [
                    <tr key={key} onClick={() => setOpen(isOpen ? null : key)} className={clsx("motion-colors cursor-pointer border-t border-rule hover:bg-paper", isOpen && "bg-paper")}>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-3">
                          <KindIcon row={r} />
                          <span className="min-w-0 truncate font-medium" title={r.title}>
                            {r.title}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs">
                        <span className="line-clamp-1 block" title={r.meetingTitle ?? r.context}>
                          {r.meetingTitle ?? r.context}
                        </span>
                        {r.detail.meetingDate && <span className="text-ink-muted">{year(r.detail.meetingDate)}</span>}
                      </td>
                      <td className="hidden px-4 py-4 text-xs lg:table-cell">{r.party}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs">
                        {r.due ? (
                          <span className="inline-flex items-center gap-1.5 font-mono">
                            <CalendarDays size={14} aria-hidden="true" className="text-ink-muted" /> {dmy(r.due)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <TimingPill row={r} today={today} />
                      </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <Action row={r} onUpload={() => setOpen(key)} />
                      </td>
                      <td className="px-2 py-4">
                        <ChevronDown size={18} aria-hidden="true" className={clsx("mx-auto text-ink-muted transition-transform duration-(--motion-menu)", isOpen && "rotate-180")} />
                        <span className="sr-only">{isOpen ? "إخفاء التفاصيل" : "عرض التفاصيل"}</span>
                      </td>
                    </tr>,
                    <tr key={`${key}-detail`}>
                      <td colSpan={7} className="p-0">
                        <Collapse show={isOpen}>
                          <Details row={r} />
                        </Collapse>
                      </td>
                    </tr>,
                  ];
                })}
              </tbody>
            </table>
            </div>

            <ul className="divide-y divide-rule md:hidden">
              {shown.map((r) => {
                const key = `${r.kind}-${r.id}`;
                const isOpen = open === key;
                return (
                  <li key={key}>
                    <button type="button" onClick={() => setOpen(isOpen ? null : key)} aria-expanded={isOpen} className="flex w-full items-start gap-3 p-4 text-start">
                      <KindIcon row={r} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{r.title}</span>
                        <span className="line-clamp-1 block text-xs text-ink-muted">{r.meetingTitle ?? r.context}</span>
                        <span className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <TimingPill row={r} today={today} />
                          {r.due && <span className="font-mono text-ink-muted">{dmy(r.due)}</span>}
                        </span>
                      </span>
                      <ChevronDown size={18} aria-hidden="true" className={clsx("mt-1 shrink-0 text-ink-muted transition-transform duration-(--motion-menu)", isOpen && "rotate-180")} />
                    </button>
                    <div className="px-4 pb-4 empty:hidden">
                      <Action row={r} onUpload={() => setOpen(key)} block />
                    </div>
                    <Collapse show={isOpen}>
                      <Details row={r} />
                    </Collapse>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <p className="flex items-center gap-2 border-t border-rule px-4 py-3 text-xs text-ink-muted">
          <ListChecks size={15} aria-hidden="true" /> إظهار {shown.length} من {timed.length} {timed.length === 1 ? "مهمة" : "مهام"}
        </p>
      </section>
    </>
  );
}

function KindIcon({ row }: { row: PortalRow & { timing: Timing } }) {
  const Icon = row.kind === "document" ? FileText : ListChecks;
  const tone = row.timing === "late" ? "bg-danger/15 text-danger" : row.timing === "today" ? "bg-brass-soft text-brass" : "bg-primary-soft text-primary";
  return (
    <span className={clsx("grid size-9 shrink-0 place-items-center rounded-lg", tone)} title={row.kind === "document" ? "مستند لبند" : "مهمة من قرار"}>
      <Icon size={17} aria-hidden="true" />
    </span>
  );
}

function TimingPill({ row, today }: { row: PortalRow & { timing: Timing }; today: string }) {
  return <span className={clsx("inline-block whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium", TONE[row.timing])}>{timingLabel(row.timing, row.due, today)}</span>;
}

/** «رفع المستند» opens the row on its upload; tasks open their resolution; finished requests just open. */
function Action({ row, onUpload, block }: { row: PortalRow; onUpload: () => void; block?: boolean }) {
  const cls = clsx("motion-press inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm", block && "w-full");
  if (row.kind === "document" && needsAction(row.stage))
    return (
      <button type="button" onClick={onUpload} className={clsx(cls, "border-primary/50 text-primary hover:bg-primary-soft")}>
        <Upload size={15} aria-hidden="true" /> رفع المستند
      </button>
    );
  if (block) return null;
  return (
    <Link href={row.href} className={clsx(cls, "border-rule text-ink-muted hover:text-ink")}>
      <ExternalLink size={15} aria-hidden="true" /> {row.kind === "task" ? "فتح المهمة" : "عرض"}
    </Link>
  );
}

/** What the row opens to: the item or resolution, the secretariat's note, the files sent, and uploading. */
function Details({ row }: { row: PortalRow }) {
  const d = row.detail;
  return (
    <div className="grid gap-4 border-t border-rule bg-paper p-4 text-sm md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        {d.item && (
          <p>
            <span className="block text-xs text-ink-muted">{row.kind === "document" ? "البند" : "نص القرار"}</span>
            {d.item}
          </p>
        )}
        {d.description && <p className="text-ink-muted">{d.description}</p>}
        {row.meetingTitle && (
          <p>
            <span className="block text-xs text-ink-muted">الاجتماع</span>
            {row.meetingTitle}
            {d.meetingDate && ` · ${year(d.meetingDate)}`}
          </p>
        )}
        {d.note && (
          <p className="flex items-start gap-2 rounded-md border border-brass/50 bg-brass-soft px-3 py-2 text-brass">
            <MessageSquareWarning size={15} aria-hidden="true" className="mt-0.5 shrink-0" /> ملاحظة الأمانة: {d.note}
          </p>
        )}
        <Link href={row.href} className="inline-flex w-fit items-center gap-1 text-primary hover:underline">
          <ExternalLink size={14} aria-hidden="true" /> فتح صفحة {row.kind === "document" ? "الطلب" : "المهمة"}
        </Link>
      </div>
      {row.kind === "document" && (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-ink-muted">المرفقات ({d.files.length})</span>
          {d.files.map((f) => (
            <a key={f.id} href={`/meetings/${row.meetingId}/documents/${f.id}`} className="inline-flex items-center gap-2 text-primary hover:underline">
              <Paperclip size={14} aria-hidden="true" className="shrink-0" /> <span className="[overflow-wrap:anywhere]">{f.title}</span>
            </a>
          ))}
          {needsAction(row.stage) && row.meetingId && <UploadDocument meetingId={row.meetingId} agendaItemId={d.agendaItemId ?? null} documentRequestId={row.id} label="رفع المستند" />}
        </div>
      )}
    </div>
  );
}
