import Link from "next/link";
import clsx from "clsx";
import { Panel } from "../../_dashboard/widgets";
import { implementation } from "@/lib/dashboard";
import { formatDateTime, formatGregorianDate } from "@/lib/format";
import { LIBRARY_CATEGORIES, type LibraryCategory } from "@/lib/library";
import { MEETING_STATUS, meetingReference } from "@/lib/meetings";
import { RESOLUTION_STATUS, resolutionReference, riyadhToday } from "@/lib/minutes";
import { createClient } from "@/lib/supabase/server";

const empty = (text: string) => <li className="px-5 py-6 text-center text-sm text-ink-muted">{text}</li>;
const row = "flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-3 text-sm hover:bg-paper";

/** The board's meetings, newest first. */
export async function BoardMeetings({ boardId, canEdit }: { boardId: string; canEdit: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase.from("meetings").select("id, title, number, starts_at, status, live_status").eq("board_id", boardId).order("starts_at", { ascending: false }).limit(100);
  return (
    <Panel title="اجتماعات المجلس" action={canEdit && <Link href="/meetings/new" className="text-sm text-primary hover:underline">اجتماع جديد</Link>}>
      <ul className="divide-y divide-rule">
        {(data ?? []).length === 0 && empty("لا اجتماعات بعد.")}
        {(data ?? []).map((m) => (
          <li key={m.id}>
            <Link href={`/meetings/${m.id}`} className={row}>
              <span className="min-w-0 flex-1 font-medium">{m.title}</span>
              <span className="text-ink-muted">{meetingReference(m.number, m.starts_at)} · {formatDateTime(new Date(m.starts_at))}</span>
              <span className={clsx("rounded-full px-2 py-0.5 text-xs", m.status === "cancelled" ? "bg-paper text-ink-muted" : m.live_status === "ended" ? "bg-primary-soft text-primary" : "bg-brass-soft text-brass")}>
                {m.status === "cancelled" ? MEETING_STATUS.cancelled : m.live_status === "ended" ? "انعقد" : MEETING_STATUS[m.status as keyof typeof MEETING_STATUS]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

type Resolution = { id: string; number: number | null; year: number | null; text: string; status: keyof typeof RESOLUTION_STATUS; meeting: { starts_at: string }; resolution_tasks: { status: string; due_date: string | null }[] };

/** Resolutions of the board's meetings with how far their tasks have gone. */
export async function BoardResolutions({ boardId }: { boardId: string }) {
  const supabase = await createClient();
  const today = riyadhToday();
  const { data } = await supabase
    .from("resolutions")
    .select("id, number, year, text, status, meeting:meetings!inner(starts_at, board_id), resolution_tasks(status, due_date)")
    .eq("meeting.board_id", boardId)
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <Panel title="قرارات المجلس" action={<Link href="/resolutions/circular" className="text-sm text-primary hover:underline">القرارات بالتمرير</Link>}>
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

/** Board documents: its charters and policies in the library, and the packs of its meetings. */
export async function BoardDocuments({ boardId }: { boardId: string }) {
  const supabase = await createClient();
  const [{ data: library }, { data: packs }] = await Promise.all([
    supabase.from("library_documents").select("id, title, category, created_at").eq("archived", false).or(`board_id.eq.${boardId},category.in.(charter,regulation,policy)`).order("created_at", { ascending: false }).limit(100),
    supabase.from("meeting_documents").select("id, title, meeting:meetings!inner(id, title, number, starts_at, board_id)").eq("meeting.board_id", boardId).order("created_at", { ascending: false }).limit(100),
  ]);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="الأنظمة واللوائح والسياسات" action={<Link href="/documents" className="text-sm text-primary hover:underline">المكتبة</Link>}>
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
          {((packs ?? []) as unknown as { id: string; title: string; meeting: { id: string; number: number | null; starts_at: string } }[]).map((d) => (
            <li key={d.id}>
              <a href={`/meetings/${d.meeting.id}/documents/${d.id}`} className={row}>
                <span className="min-w-0 flex-1">{d.title}</span>
                <span className="text-xs text-ink-muted">{meetingReference(d.meeting.number, d.meeting.starts_at)}</span>
              </a>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

type Committee = { id: string; name: string; committee_members: { status: string; position: string; person: { full_name: string } | null }[]; meetings: { starts_at: string; live_status: string; status: string }[] };

/** Committees reporting to the board: chair, members, last and next meeting. */
export async function BoardCommittees({ boardId }: { boardId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("committees")
    .select("id, name, committee_members(status, position, person:people(full_name)), meetings(starts_at, live_status, status)")
    .eq("board_id", boardId)
    .eq("status", "active")
    .order("name");
  const now = new Date().toISOString();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(data ?? []).length === 0 && <p className="text-sm text-ink-muted">لا لجان مرتبطة بالمجلس. اربط اللجنة بالمجلس من صفحة اللجان.</p>}
      {((data ?? []) as unknown as Committee[]).map((c) => {
        const active = c.committee_members.filter((m) => m.status === "active");
        const chair = active.find((m) => m.position === "chair")?.person?.full_name;
        const live = c.meetings.filter((m) => m.status !== "cancelled");
        const last = live.filter((m) => m.live_status === "ended").sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0];
        const next = live.filter((m) => m.live_status !== "ended" && m.starts_at >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
        return (
          <Link key={c.id} href={`/committees/${c.id}`} className="flex flex-col gap-1 rounded-lg border border-rule bg-surface p-5 text-sm hover:border-primary">
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
