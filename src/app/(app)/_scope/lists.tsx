import Link from "next/link";
import clsx from "clsx";
import { Panel } from "../_dashboard/widgets";
import { implementation } from "@/lib/dashboard";
import { formatGregorianDate } from "@/lib/format";
import { LIBRARY_CATEGORIES, type LibraryCategory } from "@/lib/library";
import { meetingReference } from "@/lib/meetings";
import { MINUTES_STATUS, RESOLUTION_STATUS, resolutionReference, riyadhToday } from "@/lib/minutes";
import { createClient } from "@/lib/supabase/server";

/** Whose pages these are: the board's or one committee's. */
export type Scope = { board: string } | { committee: string };
const column = (scope: Scope) => ("board" in scope ? "board_id" : "committee_id");
const idOf = (scope: Scope) => ("board" in scope ? scope.board : scope.committee);
const whose = (scope: Scope) => ("board" in scope ? "المجلس" : "اللجنة");

const empty = (text: string) => <li className="px-5 py-6 text-center text-sm text-ink-muted">{text}</li>;
const row = "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-3 text-sm hover:bg-paper";

type Resolution = { id: string; number: number | null; year: number | null; text: string; status: keyof typeof RESOLUTION_STATUS; meeting: { starts_at: string }; resolution_tasks: { status: string; due_date: string | null }[] };

/** Resolutions of the scope's meetings with how far their tasks have gone. */
export async function ScopeResolutions({ scope }: { scope: Scope }) {
  const supabase = await createClient();
  const today = riyadhToday();
  const { data } = await supabase
    .from("resolutions")
    .select("id, number, year, text, status, meeting:meetings!inner(starts_at, board_id, committee_id), resolution_tasks(status, due_date)")
    .eq(`meeting.${column(scope)}`, idOf(scope))
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <Panel title={`قرارات ${whose(scope)}`} action={<Link href="/resolutions/circular" className="text-sm text-primary hover:underline">القرارات بالتمرير</Link>}>
      <ul className="divide-y divide-rule">
        {(data ?? []).length === 0 && empty("لا قرارات بعد.")}
        {((data ?? []) as unknown as Resolution[]).map((r) => {
          const t = implementation(r.resolution_tasks, today);
          return (
            <li key={r.id}>
              <Link href={`/resolutions/${r.id}`} className={row}>
                <span className="font-mono text-xs text-ink-muted">{resolutionReference(r.number, r.year)}</span>
                <span className="min-w-0 flex-1 truncate">{r.text}</span>
                <span className="text-xs text-ink-muted">{RESOLUTION_STATUS[r.status]}</span>
                {t.total > 0 && <span className={clsx("text-xs", t.overdue ? "text-danger" : "text-primary")}>{t.overdue ? `${t.overdue} متأخرة` : `${t.percent}% منفّذ`}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/** The scope's documents: its library documents (the board also sees the company's charters and policies) and its meeting packs. */
export async function ScopeDocuments({ scope }: { scope: Scope }) {
  const supabase = await createClient();
  const own = `${column(scope)}.eq.${idOf(scope)}`;
  const [{ data: library }, { data: packs }] = await Promise.all([
    supabase.from("library_documents").select("id, title, category, created_at").eq("archived", false).or("board" in scope ? `${own},and(category.in.(charter,regulation,policy),committee_id.is.null)` : own).order("created_at", { ascending: false }).limit(100),
    supabase.from("meeting_documents").select("id, title, meeting:meetings!inner(id, title, number, code, starts_at, board_id, committee_id)").eq(`meeting.${column(scope)}`, idOf(scope)).order("created_at", { ascending: false }).limit(100),
  ]);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title={"board" in scope ? "الأنظمة واللوائح والسياسات" : "مستندات اللجنة"} action={<Link href="/documents" className="text-sm text-primary hover:underline">المكتبة</Link>}>
        <ul className="divide-y divide-rule">
          {(library ?? []).length === 0 && empty("لا مستندات.")}
          {(library ?? []).map((d) => (
            <li key={d.id}>
              <a href={`/documents/library/${d.id}`} className={row}>
                <span className="min-w-0 flex-1">{d.title}</span>
                <span className="text-xs text-ink-muted">{LIBRARY_CATEGORIES[d.category as LibraryCategory]} · {formatGregorianDate(new Date(d.created_at))}</span>
              </a>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="مستندات الاجتماعات">
        <ul className="divide-y divide-rule">
          {(packs ?? []).length === 0 && empty("لا مستندات اجتماعات.")}
          {((packs ?? []) as unknown as { id: string; title: string; meeting: { id: string; number: number | null; code: string | null; starts_at: string } }[]).map((d) => (
            <li key={d.id}>
              <a href={`/meetings/${d.meeting.id}/documents/${d.id}`} className={row}>
                <span className="min-w-0 flex-1">{d.title}</span>
                <span className="text-xs text-ink-muted">{meetingReference(d.meeting.code)}</span>
              </a>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

type MinutesRow = { id: string; status: keyof typeof MINUTES_STATUS; meeting: { id: string; title: string; number: number | null; code: string | null; starts_at: string } };

/** Minutes of the scope's meetings and where they stand. */
export async function ScopeMinutes({ scope }: { scope: Scope }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("minutes")
    .select("id, status, meeting:meetings!inner(id, title, number, code, starts_at, board_id, committee_id)")
    .eq(`meeting.${column(scope)}`, idOf(scope))
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <Panel title={`محاضر ${whose(scope)}`}>
      <ul className="divide-y divide-rule">
        {(data ?? []).length === 0 && empty("لا محاضر بعد.")}
        {((data ?? []) as unknown as MinutesRow[]).map((m) => (
          <li key={m.id}>
            <Link href={`/meetings/${m.meeting.id}?tab=minutes`} className={row}>
              <span className="min-w-0 flex-1 font-medium">{m.meeting.title}</span>
              <span className="text-ink-muted">{meetingReference(m.meeting.code)} · {formatGregorianDate(new Date(m.meeting.starts_at))}</span>
              <span className={clsx("rounded-full px-2 py-0.5 text-xs", m.status === "approved" ? "bg-primary-soft text-primary" : m.status === "review" ? "bg-brass-soft text-brass" : "border border-rule text-ink-muted")}>{MINUTES_STATUS[m.status]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

type Committee = { id: string; name: string; committee_members: { status: string; position: string; person: { full_name: string } | null }[]; meetings: { starts_at: string; live_status: string; status: string }[] };

/** Active committees (of one board when given): chair, members, last and next meeting. */
export async function CommitteeCards({ boardId }: { boardId?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("committees")
    .select("id, name, committee_members(status, position, person:people(full_name)), meetings(starts_at, live_status, status)")
    .eq("status", "active")
    .order("name");
  if (boardId) query = query.eq("board_id", boardId);
  const { data } = await query;
  const now = new Date().toISOString();
  return (
    <div className="motion-stagger grid gap-4 md:grid-cols-2">
      {(data ?? []).length === 0 && <p className="text-sm text-ink-muted">لا لجان بعد.</p>}
      {((data ?? []) as unknown as Committee[]).map((c) => {
        const active = c.committee_members.filter((m) => m.status === "active");
        const chair = active.find((m) => m.position === "chair")?.person?.full_name;
        const live = c.meetings.filter((m) => m.status !== "cancelled");
        const last = live.filter((m) => m.live_status === "ended").sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0];
        const next = live.filter((m) => m.live_status !== "ended" && m.starts_at >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
        return (
          <Link key={c.id} href={`/committees/${c.id}`} className="motion-lift flex flex-col gap-1 rounded-lg border border-rule bg-surface p-5 text-sm hover:border-primary">
            <strong className="font-display text-lg">{c.name}</strong>
            <span className="text-ink-muted">{chair ? `الرئيس: ${chair}` : "لم يُحدد الرئيس"} · {active.length} أعضاء</span>
            <span className="text-ink-muted">
              آخر اجتماع: {last ? formatGregorianDate(new Date(last.starts_at)) : "—"} · القادم: {next ? formatGregorianDate(new Date(next.starts_at)) : "—"}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
