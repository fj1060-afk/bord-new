"use client";

import { Collapse } from "@/components/ui/collapse";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Building2, ChevronLeft, ChevronRight, Ellipsis, FileText, FolderOpen, MonitorSmartphone, Plus, ScrollText, Search, Trash2, Video } from "lucide-react";
import { ConfirmButton } from "@/components/org/confirm-button";
import { TabBar } from "@/components/ui/tab-bar";
import { FlipList } from "@/components/ui/flip-list";
import { buttonClass, compactInputClass, iconInputClass } from "@/components/ui/styles";
import { durationText, MEETING_STATES, PAGE_SIZES, PERIODS, pageWindow, tableHref, type MeetingState, type Period, type TableQuery } from "@/lib/meeting-table";
import { MEETING_MODES } from "@/lib/meetings";
import { deleteMeeting, deleteMeetings } from "../_actions/meeting";

export type TableRow = {
  id: string;
  title: string;
  code: string | null;
  body: { name: string; tone: "board" | "audit" | "committee" };
  date: string;
  time: string;
  minutes: number | null;
  actual: boolean;
  mode: string;
  people: number;
  state: MeetingState;
  hasMinutes: boolean;
  packReady: boolean;
};

const STATE_TONE: Record<MeetingState, string> = {
  draft: "bg-brass-soft text-brass",
  scheduled: "border border-primary/40 text-primary",
  live: "bg-primary text-on-primary",
  ended: "bg-primary-soft text-primary",
  cancelled: "bg-paper text-ink-muted line-through",
};
const MODE_ICON = { in_person: Building2, virtual: Video, hybrid: MonitorSmartphone } as const;

const chip = "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs";
const iconButton = "motion-press grid size-8 place-items-center rounded-md border border-rule text-ink-muted hover:border-primary hover:text-primary";

function StateChip({ state }: { state: MeetingState }) {
  return (
    <span className={clsx(chip, STATE_TONE[state])}>
      <span aria-hidden className={clsx("size-1.5 rounded-full bg-current", state === "live" && "animate-pulse")} />
      {MEETING_STATES[state]}
    </span>
  );
}

function Mode({ mode }: { mode: string }) {
  const Icon = MODE_ICON[mode as keyof typeof MODE_ICON] ?? Building2;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink-muted">
      <Icon size={15} aria-hidden="true" />
      {MEETING_MODES[mode as keyof typeof MEETING_MODES] ?? mode}
    </span>
  );
}

function When({ row }: { row: TableRow }) {
  return (
    <span className="flex flex-col gap-0.5 whitespace-nowrap">
      <span className="font-medium">{row.date}</span>
      <span className="text-xs text-ink-muted">{row.time}</span>
    </span>
  );
}

/** The issued number, or a dashed placeholder until the invitation is issued. */
function Code({ code }: { code: string | null }) {
  return code ? (
    <span dir="ltr" className="whitespace-nowrap rounded-md bg-paper px-2 py-0.5 font-mono text-xs">
      {code}
    </span>
  ) : (
    <span className="whitespace-nowrap rounded-md border border-dashed border-rule px-2 py-0.5 text-xs text-ink-muted">لم يُرقَّم بعد</span>
  );
}

const menuItem = "motion-colors flex w-full items-center gap-2 rounded px-3 py-2 text-start text-sm hover:bg-paper";

function Actions({ row, canDelete }: { row: TableRow; canDelete: boolean }) {
  return (
    <span className="flex items-center justify-end gap-1.5">
      <Link href={`/meetings/${row.id}`} className={iconButton} title="فتح الاجتماع" aria-label={`فتح ${row.title}`}>
        <FolderOpen size={16} aria-hidden="true" />
      </Link>
      <details className="group/menu relative">
        <summary className={clsx(iconButton, "cursor-pointer list-none [&::-webkit-details-marker]:hidden")} aria-label={`إجراءات ${row.title}`} title="المزيد">
          <Ellipsis size={16} aria-hidden="true" />
        </summary>
        <div className="absolute end-0 top-full z-20 mt-1 w-48 rounded-lg border border-rule bg-surface p-1 shadow-lg">
          {row.hasMinutes ? (
            <Link href={`/meetings/${row.id}?tab=minutes`} className={menuItem}>
              <ScrollText size={15} aria-hidden="true" /> المحضر والقرارات
            </Link>
          ) : (
            <span className={clsx(menuItem, "cursor-not-allowed opacity-50 hover:bg-transparent")}>
              <ScrollText size={15} aria-hidden="true" /> لا محضر بعد
            </span>
          )}
          {row.packReady ? (
            <a href={`/print/meetings/${row.id}/agenda`} target="_blank" rel="noopener" className={menuItem}>
              <FileText size={15} aria-hidden="true" /> حزمة الاجتماع
            </a>
          ) : (
            <span className={clsx(menuItem, "cursor-not-allowed opacity-50 hover:bg-transparent")}>
              <FileText size={15} aria-hidden="true" /> لم تُنشر الحزمة بعد
            </span>
          )}
          {canDelete && (
            <span className="mt-1 block border-t border-rule pt-1">
              <ConfirmButton action={deleteMeeting.bind(null, row.id)} label={`حذف ${row.title}`} confirm={`حذف «${row.title}» نهائياً مع بنوده ومحضره وقراراته ومستنداته؟ لا يمكن التراجع.`} className="w-full justify-start border-0 px-3 py-2" icon={<><Trash2 size={15} aria-hidden="true" /> حذف الاجتماع</>} />
            </span>
          )}
        </div>
      </details>
    </span>
  );
}

function Duration({ row }: { row: TableRow }) {
  if (row.minutes === null) return <span className="text-ink-muted">—</span>;
  return (
    <span className="flex flex-col gap-0.5 whitespace-nowrap">
      <span>{durationText(row.minutes)}</span>
      <span className="text-xs text-ink-muted">{row.actual ? "فعلية" : "مخططة"}</span>
    </span>
  );
}

export function MeetingsTableView({
  base,
  query,
  rows,
  total,
  bodies,
  canDelete,
  showBody,
  newHref,
}: {
  base: string;
  query: TableQuery;
  rows: TableRow[];
  total: number;
  bodies: { value: string; label: string }[];
  canDelete: boolean;
  showBody: boolean;
  newHref: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q);
  const [selected, setSelected] = useState<string[]>([]);
  const go = (change: Partial<TableQuery>) => startTransition(() => router.replace(tableHref(base, query, change), { scroll: false }));

  // Search as you type, a moment after the last key.
  useEffect(() => {
    if (search.trim() === query.q) return;
    const timer = setTimeout(() => startTransition(() => router.replace(tableHref(base, query, { q: search.trim() }), { scroll: false })), 350);
    return () => clearTimeout(timer);
  }, [search, query, base, router]);

  const pages = Math.max(1, Math.ceil(total / query.size));
  const from = total ? (query.page - 1) * query.size + 1 : 0;
  const to = Math.min(total, query.page * query.size);
  const shownIds = rows.map((r) => r.id);
  const allPicked = shownIds.length > 0 && shownIds.every((id) => selected.includes(id));
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const subtitle = (r: TableRow) => (r.code ? r.body.name : "يُرقَّم تلقائيًا عند إصدار الدعوة");

  return (
    <section className="rounded-xl border border-rule bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-rule p-4">
        <TabBar id="meetings-period" label="الفترة" variant="pill" className="flex rounded-lg border border-rule p-0.5 text-sm">
          {(Object.entries(PERIODS) as [Period, string][]).map(([value, label]) => (
            <Link key={value} href={tableHref(base, query, { period: value })} scroll={false} aria-current={query.period === value ? "page" : undefined} className={clsx("motion-colors relative z-[1] rounded-md px-4 py-1.5", query.period === value ? "font-medium text-on-primary" : "hover:bg-primary-soft")}>
              {label}
            </Link>
          ))}
        </TabBar>
        <select aria-label="الحالة" value={query.state} onChange={(e) => go({ state: e.target.value as MeetingState | "" })} className={compactInputClass}>
          <option value="">كل الحالات</option>
          {Object.entries(MEETING_STATES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {showBody && (
          <select aria-label="الجهة" value={query.body} onChange={(e) => go({ body: e.target.value })} className={compactInputClass}>
            <option value="">كل الجهات</option>
            {bodies.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        )}
        <label className="relative min-w-56 flex-1 sm:ms-auto sm:max-w-80">
          <span className="sr-only">بحث</span>
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3 my-auto text-ink-muted" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالعنوان أو رقم الاجتماع" className={iconInputClass} />
        </label>
        {newHref && (
          <Link href={newHref} className={buttonClass()}>
            <Plus size={16} aria-hidden="true" /> اجتماع جديد
          </Link>
        )}
      </div>

      <Collapse show={canDelete && selected.length > 0}>
        {canDelete && selected.length > 0 && (
          <div className="flex items-center gap-3 border-b border-rule bg-brass-soft px-4 py-2 text-sm">
            <span>
              تم تحديد <span className="font-mono">{selected.length}</span>
            </span>
            <button type="button" onClick={() => setSelected([])} className="text-primary hover:underline">
              إلغاء التحديد
            </button>
            <span className="ms-auto">
              <ConfirmButton
                action={async () => {
                  await deleteMeetings(selected);
                  setSelected([]);
                }}
                label={`حذف ${selected.length} اجتماع`}
                confirm={`حذف ${selected.length} اجتماع نهائياً مع كل بنودها ومحاضرها وقراراتها؟ لا يمكن التراجع.`}
              />
            </span>
          </div>
        )}
      </Collapse>

      <div className={clsx("transition-opacity", pending && "opacity-60")}>
        {rows.length === 0 && <p className="p-10 text-center text-sm text-ink-muted">لا توجد اجتماعات تطابق التصفية.</p>}

        {rows.length > 0 && (
          <table className="hidden w-full text-sm md:table">
            <thead className="border-b border-rule text-xs text-ink-muted">
              <tr>
                {canDelete && (
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" aria-label="تحديد الكل" checked={allPicked} onChange={() => setSelected(allPicked ? selected.filter((id) => !shownIds.includes(id)) : [...new Set([...selected, ...shownIds])])} className="size-4 accent-primary" />
                  </th>
                )}
                <th className="px-4 py-3 text-start font-medium">رقم الاجتماع</th>
                <th className="px-4 py-3 text-start font-medium">العنوان</th>
                <th className="px-4 py-3 text-start font-medium">التاريخ والوقت</th>
                <th className="px-4 py-3 text-start font-medium">المدة</th>
                <th className="px-4 py-3 text-start font-medium">الطريقة</th>
                <th className="px-4 py-3 text-start font-medium">الحالة</th>
                <th className="px-4 py-3">
                  <span className="sr-only">الإجراءات</span>
                </th>
              </tr>
            </thead>
            <FlipList as="tbody" className="divide-y divide-rule">
              {rows.map((r) => (
                <tr key={r.id} data-flip-key={r.id} data-flip-state={r.state} className={clsx("motion-colors hover:bg-paper", selected.includes(r.id) && "bg-primary-soft/50")}>
                  {canDelete && (
                    <td className="px-4 py-4">
                      <input type="checkbox" aria-label={`تحديد ${r.title}`} checked={selected.includes(r.id)} onChange={() => toggle(r.id)} className="size-4 accent-primary" />
                    </td>
                  )}
                  <td className="px-4 py-4">
                    <Code code={r.code} />
                  </td>
                  <td className="max-w-80 px-4 py-4">
                    <Link href={`/meetings/${r.id}`} className="block font-bold hover:text-primary hover:underline">
                      {r.title}
                    </Link>
                    <span className="text-xs text-ink-muted">{subtitle(r)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <When row={r} />
                  </td>
                  <td className="px-4 py-4">
                    <Duration row={r} />
                  </td>
                  <td className="px-4 py-4">
                    <Mode mode={r.mode} />
                  </td>
                  <td className="px-4 py-4">
                    <StateChip state={r.state} />
                  </td>
                  <td className="px-4 py-4">
                    <Actions row={r} canDelete={canDelete} />
                  </td>
                </tr>
              ))}
            </FlipList>
          </table>
        )}

        {/* On a phone each meeting is a card. */}
        <ul className="divide-y divide-rule md:hidden">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 p-4 text-sm">
              <div className="flex items-start gap-3">
                {canDelete && <input type="checkbox" aria-label={`تحديد ${r.title}`} checked={selected.includes(r.id)} onChange={() => toggle(r.id)} className="mt-1 size-4 accent-primary" />}
                <Link href={`/meetings/${r.id}`} className="min-w-0 flex-1">
                  <span className="block font-bold">{r.title}</span>
                  <span className="text-xs text-ink-muted">{subtitle(r)}</span>
                </Link>
                <StateChip state={r.state} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <Code code={r.code} />
                <span className="text-ink-muted">
                  {r.date} · {r.time}
                </span>
                {r.minutes !== null && <span className="text-ink-muted">{durationText(r.minutes)}</span>}
                <Mode mode={r.mode} />
              </div>
              <Actions row={r} canDelete={canDelete} />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-rule px-4 py-3 text-sm">
        <span className="text-xs text-ink-muted">
          عرض <span className="font-mono">{from}</span>–<span className="font-mono">{to}</span> من <span className="font-mono">{total}</span>
        </span>
        <select aria-label="عدد الصفوف" value={query.size} onChange={(e) => go({ size: Number(e.target.value) })} className={compactInputClass}>
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s} لكل صفحة
            </option>
          ))}
        </select>
        <nav aria-label="الصفحات" className="ms-auto flex items-center gap-1">
          <PageLink href={query.page > 1 ? tableHref(base, query, { page: query.page - 1 }) : null} label="السابقة">
            <ChevronRight size={16} aria-hidden="true" />
          </PageLink>
          {pageWindow(query.page, pages).map((p, i) =>
            p === null ? (
              <span key={`gap${i}`} className="px-1 text-ink-muted">
                …
              </span>
            ) : (
              <Link key={p} href={tableHref(base, query, { page: p })} scroll={false} aria-current={p === query.page ? "page" : undefined} className={clsx("grid size-8 place-items-center rounded-md font-mono", p === query.page ? "bg-primary text-on-primary" : "hover:bg-primary-soft")}>
                {p}
              </Link>
            ),
          )}
          <PageLink href={query.page < pages ? tableHref(base, query, { page: query.page + 1 }) : null} label="التالية">
            <ChevronLeft size={16} aria-hidden="true" />
          </PageLink>
        </nav>
      </div>
    </section>
  );
}

function PageLink({ href, label, children }: { href: string | null; label: string; children: ReactNode }) {
  const cls = "grid size-8 place-items-center rounded-md border border-rule";
  return href ? (
    <Link href={href} scroll={false} aria-label={label} className={clsx(cls, "hover:bg-primary-soft")}>
      {children}
    </Link>
  ) : (
    <span aria-hidden="true" className={clsx(cls, "opacity-40")}>
      {children}
    </span>
  );
}
