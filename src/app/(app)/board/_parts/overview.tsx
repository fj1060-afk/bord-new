import Link from "next/link";
import { ChevronLeft, CircleAlert, TriangleAlert } from "lucide-react";
import clsx from "clsx";
import { Meter, Panel, StatTile } from "../../_dashboard/widgets";
import { listedSeats, type PositionRole } from "@/lib/affiliations";
import { blackouts, cmaNotices } from "@/lib/board-overview";
import { SOURCES } from "@/lib/compliance";
import { complianceFindings } from "@/lib/compliance-server";
import { attendanceRates, implementation } from "@/lib/dashboard";
import { formatDateTime, formatGregorianDate } from "@/lib/format";
import { companyProfile } from "@/lib/live-server";
import { meetingReference } from "@/lib/meetings";
import { riyadhToday } from "@/lib/minutes";
import { currentYear } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

type Board = { id: string; name: string; term_start: string; term_end: string };
const date = (d: string) => formatGregorianDate(new Date(`${d}T12:00:00Z`));

function Alert({ tone, title, detail, source, href }: { tone: "violation" | "warning"; title: string; detail: string; source?: string; href?: string }) {
  const Icon = tone === "violation" ? CircleAlert : TriangleAlert;
  const body = (
    <>
      <span className={clsx("grid size-8 shrink-0 place-items-center rounded-full", tone === "violation" ? "bg-danger/10 text-danger" : "bg-brass-soft text-brass")}>
        <Icon size={16} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">{title}</span>
          <span className={clsx("rounded-full px-2 py-0.5 text-[11px]", tone === "violation" ? "bg-danger/10 text-danger" : "bg-brass-soft text-brass")}>{tone === "violation" ? "مخالفة" : "تنبيه"}</span>
        </span>
        <span className="mt-1 block text-xs leading-6 text-ink-muted">{detail}</span>
        {source && <span className="mt-1 block text-[11px] text-ink-muted/80">{source}</span>}
      </span>
      {href && <ChevronLeft size={16} aria-hidden="true" className="mt-2 shrink-0 text-ink-muted transition-transform group-hover:-translate-x-0.5" />}
    </>
  );
  const cls = "flex items-start gap-3 px-5 py-4 text-sm";
  return <li>{href ? <Link href={href} className={clsx(cls, "group hover:bg-paper")}>{body}</Link> : <div className={cls}>{body}</div>}</li>;
}

/** The board at a glance: composition, term, meetings, resolutions, disclosures, attendance and what needs attention. */
export async function BoardOverview({ board, canEdit }: { board: Board; canEdit: boolean }) {
  const supabase = await createClient();
  const today = riyadhToday();
  const year = currentYear();
  const [profile, findings, { data: members }, { data: meetings }, { data: resolutions }, { data: committees }] = await Promise.all([
    companyProfile(supabase),
    complianceFindings(supabase),
    supabase.from("board_members").select("person_id, category, start_date, person:people(full_name, disclosures(year), person_positions(role, listed, end_year))").eq("board_id", board.id).eq("status", "active"),
    supabase.from("meetings").select("id, title, number, code, starts_at, status, live_status").eq("board_id", board.id).neq("status", "cancelled").gte("starts_at", `${year}-01-01T00:00:00+03:00`).order("starts_at"),
    supabase.from("resolutions").select("id, status, resolution_tasks(status, due_date), meeting:meetings!inner(board_id)").eq("meeting.board_id", board.id),
    supabase.from("committees").select("id, name, committee_members(status)").eq("board_id", board.id).eq("status", "active"),
  ]);
  const listed = profile?.company_type === "listed_jsc";
  const rows = (members ?? []) as unknown as { person_id: string; category: string; start_date: string; person: { full_name: string; disclosures: { year: number }[]; person_positions: { role: PositionRole; listed: boolean; end_year: number | null }[] } }[];
  const independent = rows.filter((m) => m.category === "independent").length;
  const filed = rows.filter((m) => m.person.disclosures.some((d) => d.year === year)).length;
  const held = (meetings ?? []).filter((m) => m.live_status === "ended");
  const upcoming = (meetings ?? []).filter((m) => m.live_status !== "ended" && m.starts_at >= new Date().toISOString()).slice(0, 3);
  const tasks = implementation(((resolutions ?? []) as unknown as { resolution_tasks: { status: string; due_date: string | null }[] }[]).flatMap((r) => r.resolution_tasks), today);
  const daysLeft = Math.round((Date.parse(board.term_end) - Date.parse(today)) / 86400000);
  const termPct = Math.min(100, Math.max(0, Math.round(((Date.parse(today) - Date.parse(board.term_start)) / (Date.parse(board.term_end) - Date.parse(board.term_start))) * 100)));

  // Attendance at this year's held board meetings.
  const heldIds = held.map((m) => m.id);
  const [{ data: invitees }, { data: marks }] = heldIds.length
    ? await Promise.all([
        supabase.from("meeting_invitees").select("meeting_id, person_id, person:people(full_name)").in("meeting_id", heldIds).eq("kind", "member"),
        supabase.from("meeting_attendance").select("meeting_id, person_id, status").in("meeting_id", heldIds),
      ])
    : [{ data: [] }, { data: [] }];
  const markOf = new Map((marks ?? []).map((m) => [`${m.meeting_id}:${m.person_id}`, m.status]));
  const rates = attendanceRates(((invitees ?? []) as unknown as { meeting_id: string; person_id: string; person: { full_name: string } }[]).map((r) => ({ person_id: r.person_id, name: r.person.full_name, status: markOf.get(`${r.meeting_id}:${r.person_id}`) ?? null })));

  // What needs attention: the compliance rules for the board, plus dates and limits.
  const rules = (findings ?? []).filter((f) => (f.id.startsWith("board.") || f.id.startsWith("disclosures.")) && f.status !== "ok");
  const notices = listed ? cmaNotices(rows.map((m) => ({ name: m.person.full_name, start_date: m.start_date })), today) : [];
  const overSeats = listed ? rows.filter((m) => listedSeats(m.person.person_positions.map((p) => ({ ...p, current: p.end_year === null })), true) > 5) : [];
  const trading = listed ? blackouts(profile?.fiscal_year_end_month ?? 12, today) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="motion-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="الأعضاء" value={rows.length} note={`${independent} مستقل`} href="/board/members" />
        <StatTile label={`اجتماعات ${year}`} value={`${held.length} / ${profile?.min_board_meetings ?? 4}`} note="المنعقدة من الحد الأدنى" tone={held.length < (profile?.min_board_meetings ?? 4) && new Date().getMonth() >= 9 ? "alert" : "default"} href="/board/meetings" />
        <StatTile label="تنفيذ القرارات" value={tasks.percent === null ? "—" : `${tasks.percent}%`} note={tasks.overdue ? `${tasks.overdue} مهمة متأخرة` : `${tasks.total} مهمة`} tone={tasks.overdue ? "alert" : "default"} href="/board/resolutions" />
        {canEdit ? (
          <StatTile label={`إفصاحات ${year}`} value={`${filed} / ${rows.length}`} tone={filed < rows.length ? "alert" : "default"} href="/board/members" />
        ) : (
          <StatTile label="اللجان التابعة" value={(committees ?? []).length} href="/committees" />
        )}
      </div>

      <Panel title="الدورة">
        <div className="flex flex-col gap-2 px-5 py-4 text-sm">
          <p>
            من {date(board.term_start)} إلى {date(board.term_end)} ·{" "}
            <span className={daysLeft <= 180 ? "text-danger" : "text-ink-muted"}>{daysLeft > 0 ? `بقي ${daysLeft} يوماً` : "انتهت الدورة"}</span>
          </p>
          <Meter percent={termPct} label={`مضى ${termPct}% من الدورة`} />
          {daysLeft > 0 && daysLeft <= 180 && <p className="text-xs text-danger">اقتربت نهاية الدورة: ابدأ إجراءات الترشيح ودعوة الجمعية لانتخاب المجلس الجديد.</p>}
        </div>
      </Panel>

      <Panel title="يحتاج انتباهك">
        <ul className="divide-y divide-rule">
          {rules.map((f) => (
            <Alert key={f.id} tone={f.status === "violation" ? "violation" : "warning"} title={f.title} detail={f.detail} source={`${SOURCES[f.source]} · ${f.article}`} href={f.href} />
          ))}
          {notices.map((n) => (
            <Alert key={n.name} tone={n.overdue ? "violation" : "warning"} title={`إشعار الهيئة بعضوية ${n.name}`} detail={`بدأت العضوية في ${date(n.start_date)}؛ يُبلغ الهيئة خلال خمسة أيام عمل، أي حتى ${date(n.due)}.`} source="لائحة الحوكمة · م17/د" />
          ))}
          {overSeats.map((m) => (
            <Alert key={m.person_id} tone="violation" title={`عضويات ${m.person.full_name} في الشركات المدرجة`} detail="تجاوز خمس عضويات في مجالس شركات مدرجة في الوقت نفسه، بحسب سيرته الذاتية." source="لائحة الحوكمة · م17/ج" href={`/people/${m.person_id}`} />
          ))}
          {trading?.now && <Alert tone="warning" title="فترة حظر تداول سارية" detail={`منذ ${date(trading.now.start)}، وتستمر حتى الإعلان عن القوائم المالية ${trading.now.annual ? "السنوية" : "الأولية"} للفترة المنتهية في ${date(trading.now.end)}. لا يتداول الأعضاء وكبار التنفيذيين وأعضاء لجنة المراجعة وأقرباؤهم في أسهم الشركة.`} source="قواعد طرح الأوراق المالية · م86" />}
          {rules.length + notices.length + overSeats.length === 0 && !trading?.now && <li className="px-5 py-4 text-sm text-ink-muted">لا ملاحظات على المجلس الآن.</li>}
        </ul>
        {trading && !trading.now && (
          <p className="border-t border-rule px-5 py-3 text-xs text-ink-muted">
            {trading.pending && `إن لم تُعلن قوائم الفترة المنتهية في ${date(trading.pending.end)} بعد، فالحظر ما زال سارياً. `}
            {trading.next && `تبدأ فترة الحظر القادمة في ${date(trading.next.start)} (${trading.next.annual ? "30 يوماً قبل نهاية السنة المالية" : "15 يوماً قبل نهاية الربع"}).`}
          </p>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="الاجتماعات القادمة" action={<Link href={`/meetings/new?body=board:${board.id}`} className="text-sm text-primary hover:underline">اجتماع جديد</Link>}>
          <ul className="divide-y divide-rule text-sm">
            {upcoming.length === 0 && <li className="px-5 py-4 text-ink-muted">لا اجتماعات قادمة.</li>}
            {upcoming.map((m) => (
              <li key={m.id}>
                <Link href={`/meetings/${m.id}`} className="flex justify-between gap-3 px-5 py-3 hover:bg-paper">
                  <span>{m.title}</span>
                  <span className="text-ink-muted">{meetingReference(m.code)} · {formatDateTime(new Date(m.starts_at))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={`حضور الأعضاء ${year}`}>
          <ul className="divide-y divide-rule text-sm">
            {rates.length === 0 && <li className="px-5 py-4 text-ink-muted">لم ينعقد اجتماع هذه السنة بعد.</li>}
            {rates.map((r) => (
              <li key={r.personId} className="flex items-center gap-3 px-5 py-2.5">
                <span className="w-40 shrink-0 truncate">{r.name}</span>
                <span className="flex-1">
                  <Meter percent={r.rate} label={`${r.attended} من ${r.invited}`} />
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="اللجان التابعة" action={<Link href="/committees" className="text-sm text-primary hover:underline">التفاصيل</Link>}>
        <ul className="divide-y divide-rule text-sm">
          {(committees ?? []).length === 0 && <li className="px-5 py-4 text-ink-muted">لا لجان مرتبطة بالمجلس.</li>}
          {((committees ?? []) as unknown as { id: string; name: string; committee_members: { status: string }[] }[]).map((c) => (
            <li key={c.id}>
              <Link href={`/committees/${c.id}`} className="flex justify-between gap-3 px-5 py-3 hover:bg-paper">
                <span>{c.name}</span>
                <span className="text-ink-muted">{c.committee_members.filter((m) => m.status === "active").length} أعضاء</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
