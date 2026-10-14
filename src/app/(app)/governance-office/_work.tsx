import Link from "next/link";
import clsx from "clsx";
import { Meter, Panel, StatTile } from "../_dashboard/widgets";
import { formatGregorianDate } from "@/lib/format";
import { MINUTES_STATUS, type MinutesStatus } from "@/lib/minutes";
import { bodyReport } from "@/lib/offices";
import { bodyName, type Supabase } from "./_data";

type Row = { key: string; title: string; meta: string; href: string; alert?: boolean };

function List({ title, rows, empty }: { title: string; rows: Row[]; empty: string }) {
  return (
    <Panel title={`${title} (${rows.length})`}>
      <ul className="divide-y divide-rule text-sm">
        {rows.length === 0 && <li className="p-5 text-center text-ink-muted">{empty}</li>}
        {rows.map((r) => (
          <li key={r.key}>
            <Link href={r.href} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 hover:bg-paper">
              <span className="min-w-0 flex-1 font-medium">{r.title}</span>
              <span className={clsx("text-xs", r.alert ? "text-danger" : "text-ink-muted")}>{r.meta}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

const day = (d: string) => formatGregorianDate(new Date(`${d.slice(0, 10)}T12:00:00Z`));

export async function WorkTab({ supabase, today }: { supabase: Supabase; today: string }) {
  const [{ data: agenda }, { data: docs }, { data: minutes }, { data: tasks }, { data: ended }] = await Promise.all([
    supabase.from("agenda_requests").select("id, title, created_at, department:departments(name)").eq("status", "pending").order("created_at"),
    supabase.from("document_requests").select("id, title, status, due_date, department:departments(name), item:agenda_items(meeting_id)").in("status", ["requested", "submitted", "returned"]).order("due_date"),
    supabase.from("minutes").select("id, status, meeting:meetings(id, title)").in("status", ["draft", "review"]),
    supabase.from("resolution_tasks").select("id, title, due_date, resolution_id, department:departments(name)").in("status", ["open", "in_progress"]).lt("due_date", today).order("due_date"),
    supabase.from("meetings").select("id, title, minutes(id)").eq("live_status", "ended"),
  ]);
  type Doc = { id: string; title: string; status: string; due_date: string | null; department: { name: string } | null; item: { meeting_id: string } | null };
  const docRows = ((docs ?? []) as unknown as Doc[]).filter((d) => d.item);
  const toReview = docRows.filter((d) => d.status === "submitted");
  const lateDocs = docRows.filter((d) => d.status !== "submitted" && d.due_date && d.due_date < today);
  const noMinutes = ((ended ?? []) as unknown as { id: string; title: string; minutes: unknown[] | { id: string } | null }[]).filter((m) => !m.minutes || (Array.isArray(m.minutes) && !m.minutes.length));

  const rows = {
    agenda: ((agenda ?? []) as unknown as { id: string; title: string; created_at: string; department: { name: string } | null }[]).map((r) => ({ key: r.id, title: r.title, meta: `${r.department?.name ?? ""} · ${day(r.created_at)}`, href: "/meetings" })),
    review: toReview.map((d) => ({ key: d.id, title: d.title, meta: d.department?.name ?? "", href: `/meetings/${d.item!.meeting_id}?tab=agenda` })),
    lateDocs: lateDocs.map((d) => ({ key: d.id, title: d.title, meta: `${d.department?.name ?? ""} · ${day(d.due_date!)}`, href: `/meetings/${d.item!.meeting_id}?tab=agenda`, alert: true })),
    minutes: [
      ...((minutes ?? []) as unknown as { id: string; status: MinutesStatus; meeting: { id: string; title: string } | null }[]).map((m) => ({ key: m.id, title: m.meeting?.title ?? "", meta: MINUTES_STATUS[m.status], href: `/meetings/${m.meeting?.id}?tab=minutes` })),
      ...noMinutes.map((m) => ({ key: m.id, title: m.title, meta: "لم يبدأ المحضر", href: `/meetings/${m.id}?tab=minutes`, alert: true })),
    ],
    tasks: ((tasks ?? []) as unknown as { id: string; title: string; due_date: string; resolution_id: string; department: { name: string } | null }[]).map((t) => ({ key: t.id, title: t.title, meta: `${t.department?.name ?? ""} · ${day(t.due_date)}`, href: `/resolutions/${t.resolution_id}`, alert: true })),
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="طلبات بنود معلّقة" value={rows.agenda.length} />
        <StatTile label="مستندات بانتظار الاعتماد" value={rows.review.length} />
        <StatTile label="محاضر غير معتمدة" value={rows.minutes.length} />
        <StatTile label="مهام متأخرة" value={rows.tasks.length + rows.lateDocs.length} tone={rows.tasks.length + rows.lateDocs.length ? "alert" : "default"} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <List title="طلبات بنود بانتظار المراجعة" rows={rows.agenda} empty="لا توجد طلبات معلّقة." />
        <List title="مستندات مُسلّمة بانتظار الاعتماد" rows={rows.review} empty="لا توجد مستندات بانتظار الاعتماد." />
        <List title="المحاضر" rows={rows.minutes} empty="كل المحاضر معتمدة." />
        <List title="متأخرات" rows={[...rows.tasks, ...rows.lateDocs]} empty="لا توجد متأخرات." />
      </div>
    </div>
  );
}

export async function ReportsTab({ supabase, today, year }: { supabase: Supabase; today: string; year: number }) {
  const [{ data: meetings }, { data: resolutions }, { data: tasks }] = await Promise.all([
    supabase.from("meetings").select("starts_at, live_status, board:boards(name), committee:committees(name)").neq("status", "cancelled").gte("starts_at", `${year}-01-01T00:00:00+03:00`).lt("starts_at", `${year + 1}-01-01T00:00:00+03:00`),
    supabase.from("resolutions").select("meeting:meetings!inner(board:boards(name), committee:committees(name))").eq("year", year),
    supabase.from("resolution_tasks").select("status, due_date, resolution:resolutions!inner(year, meeting:meetings!inner(board:boards(name), committee:committees(name)))").eq("resolution.year", year),
  ]);
  type B = Parameters<typeof bodyName>[0];
  const now = new Date().toISOString();
  const report = bodyReport(
    ((meetings ?? []) as unknown as ({ starts_at: string; live_status: string } & NonNullable<B>)[]).map((m) => ({ body: bodyName(m), ended: m.live_status === "ended", upcoming: m.starts_at >= now })),
    ((resolutions ?? []) as unknown as { meeting: B }[]).map((r) => ({ body: bodyName(r.meeting) })),
    ((tasks ?? []) as unknown as { status: string; due_date: string | null; resolution: { meeting: B } }[]).map((t) => ({ body: bodyName(t.resolution.meeting), status: t.status, due_date: t.due_date })),
    today,
  );
  const years = [year - 1, year, year + 1];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 text-sm">
        {years.map((y) => (
          <Link key={y} href={`/governance-office?tab=reports&year=${y}`} className={clsx("rounded-full px-3 py-1 font-mono", y === year ? "bg-primary text-on-primary" : "border border-rule bg-surface hover:bg-primary-soft")}>
            {y}
          </Link>
        ))}
      </div>
      <Panel title={`أداء المجلس واللجان ${year}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-ink-muted">
              <tr>
                {["الجهة", "اجتماعات منعقدة", "قادمة", "قرارات", "مهام", "متأخرة", "نسبة التنفيذ"].map((h) => (
                  <th key={h} className="px-4 py-2 text-start font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {report.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-ink-muted">
                    لا توجد بيانات لهذه السنة.
                  </td>
                </tr>
              )}
              {report.map((r) => (
                <tr key={r.body}>
                  <td className="px-4 py-2.5 font-medium">{r.body}</td>
                  <td className="px-4 py-2.5 font-mono">{r.held}</td>
                  <td className="px-4 py-2.5 font-mono">{r.upcoming}</td>
                  <td className="px-4 py-2.5 font-mono">{r.resolutions}</td>
                  <td className="px-4 py-2.5 font-mono">{r.tasks}</td>
                  <td className={clsx("px-4 py-2.5 font-mono", r.overdue > 0 && "text-danger")}>{r.overdue}</td>
                  <td className="w-48 px-4 py-2.5">{r.percent === null ? "—" : <Meter percent={r.percent} label={`${r.body}: ${r.percent}%`} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
