import Link from "next/link";
import clsx from "clsx";
import { Panel } from "../_dashboard/widgets";
import { formatGregorianDate } from "@/lib/format";
import { addDays, DEADLINE_BUCKETS, deadlineBucket, monthGrid, monthRange, type DeadlineBucket } from "@/lib/offices";
import { datedItems, type DatedItem, type Supabase } from "./_data";

const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTH = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { month: "long", year: "numeric", timeZone: "UTC" });
const kindClass = (kind: string) => (kind === "اجتماع" ? "bg-primary text-on-primary" : kind === "مهمة" ? "bg-brass-soft text-brass" : "bg-primary-soft text-primary");

function ItemRow({ item, today }: { item: DatedItem; today: string }) {
  return (
    <li>
      <Link href={item.href} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm hover:bg-paper">
        <span className={clsx("rounded-full px-2 py-0.5 text-xs", kindClass(item.kind))}>{item.kind}</span>
        <span className="min-w-0 flex-1 font-medium">{item.title}</span>
        {item.meta && <span className="text-xs text-ink-muted">{item.meta}</span>}
        <span className={clsx("text-xs", item.kind !== "اجتماع" && item.date < today ? "text-danger" : "text-ink-muted")}>
          {formatGregorianDate(new Date(`${item.date}T12:00:00Z`))}
          {item.time && <span className="ms-1 font-mono">{item.time}</span>}
        </span>
      </Link>
    </li>
  );
}

export async function CalendarTab({ supabase, today, month }: { supabase: Supabase; today: string; month?: string }) {
  const range = monthRange(month, today);
  const items = await datedItems(supabase, range.first, range.next, true);
  const byDay = Map.groupBy(items, (i) => i.date);
  const nav = (key: string, label: string) => (
    <Link href={`/governance-office?tab=calendar&m=${key}`} className="rounded-md border border-rule bg-surface px-3 py-1 text-sm hover:bg-primary-soft">
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        {nav(range.prevKey, "الشهر السابق")}
        <h2 className="font-display text-xl font-bold">{MONTH.format(new Date(`${range.first}T00:00:00Z`))}</h2>
        {nav(range.nextKey, "الشهر التالي")}
      </div>
      <div className="hidden overflow-hidden rounded-lg border border-rule bg-surface md:block">
        <div className="grid grid-cols-7 border-b border-rule text-center text-xs text-ink-muted">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        {monthGrid(range.year, range.month).map((week, w) => (
          <div key={w} className="grid grid-cols-7 border-b border-rule last:border-b-0">
            {week.map((day, i) => (
              <div key={i} className={clsx("min-h-24 border-e border-rule p-1.5 last:border-e-0", !day && "bg-paper", day === today && "bg-brass-soft/40")}>
                {day && <span className="font-mono text-xs text-ink-muted">{Number(day.slice(8))}</span>}
                {day &&
                  (byDay.get(day) ?? []).map((item, j) => (
                    <Link key={j} href={item.href} title={`${item.kind}: ${item.title}`} className={clsx("mt-1 block truncate rounded px-1.5 py-0.5 text-xs", kindClass(item.kind))}>
                      {item.time && <span className="font-mono">{item.time} </span>}
                      {item.title}
                    </Link>
                  ))}
              </div>
            ))}
          </div>
        ))}
      </div>
      <Panel title="أحداث الشهر">
        <ul className="divide-y divide-rule">
          {items.length === 0 && <li className="p-6 text-center text-sm text-ink-muted">لا توجد أحداث في هذا الشهر.</li>}
          {items.map((item, i) => (
            <ItemRow key={i} item={item} today={today} />
          ))}
        </ul>
      </Panel>
    </div>
  );
}

export async function DeadlinesTab({ supabase, today }: { supabase: Supabase; today: string }) {
  const items = await datedItems(supabase, null, addDays(today, 61));
  const groups = Map.groupBy(items, (i) => deadlineBucket(i.date, today));
  return (
    <div className="flex flex-col gap-6">
      {(Object.keys(DEADLINE_BUCKETS) as DeadlineBucket[]).map((bucket) => (
        <Panel key={bucket} title={`${DEADLINE_BUCKETS[bucket]} (${(groups.get(bucket) ?? []).length})`}>
          <ul className="divide-y divide-rule">
            {!(groups.get(bucket) ?? []).length && <li className="p-6 text-center text-sm text-ink-muted">لا شيء هنا.</li>}
            {(groups.get(bucket) ?? []).map((item, i) => (
              <ItemRow key={i} item={item} today={today} />
            ))}
          </ul>
        </Panel>
      ))}
      <p className="text-xs text-ink-muted">تشمل مهام القرارات المفتوحة والمستندات المطلوبة من الإدارات خلال الستين يوماً القادمة.</p>
    </div>
  );
}
