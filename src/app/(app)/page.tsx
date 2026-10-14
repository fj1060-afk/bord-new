import Link from "next/link";
import clsx from "clsx";
import { PageHeader } from "@/components/ui/page-header";
import { PhaseStatusTag } from "@/components/ui/phase-tag";
import { phases } from "@/config/phases";
import { requirePage } from "@/lib/auth";
import { score } from "@/lib/compliance";
import { complianceFindings } from "@/lib/compliance-server";
import { attendanceRates, greeting, implementation, type AttendanceRow } from "@/lib/dashboard";
import { formatDateTime } from "@/lib/format";
import { MEETING_STATUS, meetingReference } from "@/lib/meetings";
import { currentYear } from "@/lib/org";
import { riyadhToday } from "@/lib/minutes";
import { can, LEVELS } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Meter, Panel, StatTile } from "./_dashboard/widgets";

type Upcoming = { id: string; title: string; number: number | null; starts_at: string; status: keyof typeof MEETING_STATUS; board: { name: string } | null; committee: { name: string } | null };

export default async function HomePage() {
  const viewer = await requirePage("/");
  const p = viewer.permissions;
  const organizer = can(p, "/meetings", LEVELS.edit);
  const boardEditor = can(p, "/board", LEVELS.edit);
  const seesResolutions = can(p, "/resolutions");
  const supabase = await createClient();
  const today = riyadhToday();
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const yearAgo = new Date(nowDate.getTime() - 365 * 86400000).toISOString();

  const { data: delegations } = await supabase.from("department_delegates").select("department_id").eq("user_id", viewer.id);
  const deptIds = (delegations ?? []).map((d) => d.department_id);
  let myTasksQuery = supabase.from("resolution_tasks").select("status, due_date").in("status", ["open", "in_progress"]);
  myTasksQuery = deptIds.length ? myTasksQuery.or(`assignee_user_id.eq.${viewer.id},department_id.in.(${deptIds.join(",")})`) : myTasksQuery.eq("assignee_user_id", viewer.id);

  const [{ data: upcoming }, { data: myTasks }, { data: allTasks }, { data: reviewMinutes }, followUps, disclosures, attendance] = await Promise.all([
    can(p, "/meetings")
      ? supabase.from("meetings").select("id, title, number, starts_at, status, board:boards(name), committee:committees(name)").gte("starts_at", now).neq("status", "cancelled").order("starts_at").limit(5)
      : Promise.resolve({ data: [] }),
    myTasksQuery,
    seesResolutions ? supabase.from("resolution_tasks").select("status, due_date") : Promise.resolve({ data: [] }),
    viewer.personId ? supabase.from("minutes").select("id, version").eq("status", "review") : Promise.resolve({ data: [] }),
    organizer
      ? Promise.all([
          supabase.from("agenda_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("document_requests").select("id", { count: "exact", head: true }).eq("status", "submitted"),
          supabase.from("minutes").select("id", { count: "exact", head: true }).eq("status", "draft"),
        ])
      : null,
    boardEditor
      ? Promise.all([
          supabase.from("board_members").select("person_id").eq("status", "active"),
          supabase.from("disclosures").select("person_id, status").eq("year", currentYear()),
        ])
      : null,
    organizer || boardEditor
      ? supabase
          .from("meeting_invitees")
          .select("meeting_id, person_id, person:people(full_name), meeting:meetings!inner(live_status, starts_at)")
          .eq("kind", "member")
          .eq("meeting.live_status", "ended")
          .gte("meeting.starts_at", yearAgo)
      : Promise.resolve({ data: null }),
  ]);

  // Minutes waiting for the viewer's own signature.
  let toSign = 0;
  for (const m of reviewMinutes ?? []) {
    const [{ data: signers }, { data: signed }] = await Promise.all([
      supabase.rpc("minutes_signers", { p_minutes: m.id }),
      supabase.from("minutes_signatures").select("person_id").eq("minutes_id", m.id).eq("version", m.version).eq("person_id", viewer.personId!),
    ]);
    if ((signers ?? []).some((s: { person_id: string }) => s.person_id === viewer.personId) && !(signed ?? []).length) toSign++;
  }

  const findings = can(p, "/governance-office") ? await complianceFindings(supabase) : null;
  const violations = findings?.filter((f) => f.status === "violation").length ?? 0;
  const compliance = findings && score(findings);
  const mine = implementation(myTasks ?? [], today);
  const overall = implementation(allTasks ?? [], today);

  let rates: ReturnType<typeof attendanceRates> = [];
  if (attendance.data?.length) {
    const meetingIds = [...new Set(attendance.data.map((r) => r.meeting_id))];
    const { data: marks } = await supabase.from("meeting_attendance").select("meeting_id, person_id, status").in("meeting_id", meetingIds);
    const status = new Map((marks ?? []).map((m) => [`${m.meeting_id}:${m.person_id}`, m.status]));
    rates = attendanceRates(
      attendance.data.map((r): AttendanceRow => ({
        person_id: r.person_id,
        name: (r.person as unknown as { full_name: string }).full_name,
        status: status.get(`${r.meeting_id}:${r.person_id}`) ?? null,
      })),
    );
  }

  const disclosureStats = disclosures && {
    members: new Set((disclosures[0].data ?? []).map((m) => m.person_id)),
    filed: (disclosures[1].data ?? []),
  };
  const filedCount = disclosureStats ? disclosureStats.filed.filter((d) => disclosureStats.members.has(d.person_id)).length : 0;
  const unreviewed = disclosureStats ? disclosureStats.filed.filter((d) => d.status !== "reviewed").length : 0;

  return (
    <>
      <PageHeader section="الرئيسية" title={`${greeting()}، ${viewer.fullName || "مرحباً"}`} description="ملخص ما يحتاج انتباهك اليوم." />

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {can(p, "/meetings") && <StatTile label="اجتماعات قادمة" value={(upcoming ?? []).length} href="/meetings" />}
        {viewer.personId && <StatTile label="محاضر بانتظار توقيعك" value={toSign} href="/minutes" tone={toSign ? "alert" : "default"} />}
        <StatTile label="مهامي المفتوحة" value={mine.total} note={mine.overdue ? `${mine.overdue} متأخرة` : "لا توجد مهام متأخرة"} tone={mine.overdue ? "alert" : "default"} href="/my-tasks" />
        {findings && <StatTile label="الامتثال" value={compliance === null ? "—" : `${compliance}%`} note={violations ? `${violations} مخالفات` : "لا توجد مخالفات"} tone={violations ? "alert" : "default"} href="/governance-office" />}
        {seesResolutions && <StatTile label="تنفيذ القرارات" value={overall.percent === null ? "—" : `${overall.percent}%`} note={overall.total ? `${overall.done} من ${overall.total} مهام منجزة${overall.overdue ? ` · ${overall.overdue} متأخرة` : ""}` : "لا توجد مهام بعد"} tone={overall.overdue ? "alert" : "default"} href="/resolutions" />}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          {can(p, "/meetings") && (
            <Panel title="الاجتماعات القادمة" action={<Link href="/meetings" className="text-sm text-primary hover:underline">كل الاجتماعات</Link>}>
              <ul className="divide-y divide-rule">
                {(upcoming ?? []).length === 0 && <li className="p-6 text-center text-sm text-ink-muted">لا توجد اجتماعات قادمة.</li>}
                {((upcoming ?? []) as unknown as Upcoming[]).map((m) => (
                  <li key={m.id}>
                    <Link href={`/meetings/${m.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-paper">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{m.title}</span>
                        <span className="block text-xs text-ink-muted">{(m.board ?? m.committee)?.name} · {meetingReference(m.number, m.starts_at)}</span>
                      </span>
                      <span className="text-sm">{formatDateTime(new Date(m.starts_at))}</span>
                      {m.status === "draft" && <span className="rounded-full bg-brass-soft px-2 py-0.5 text-xs text-brass">{MEETING_STATUS.draft}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {rates.length > 0 && (
            <Panel title="حضور الأعضاء (آخر 12 شهراً)">
              <table className="w-full text-sm">
                <thead className="text-ink-muted">
                  <tr>
                    <th className="px-5 py-2 text-start font-medium">العضو</th>
                    <th className="px-5 py-2 text-start font-medium">حضر</th>
                    <th className="w-1/2 px-5 py-2 text-start font-medium">نسبة الحضور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {rates.map((r) => (
                    <tr key={r.personId}>
                      <td className="px-5 py-2.5">{r.name}</td>
                      <td className="px-5 py-2.5 font-mono">
                        {r.attended}/{r.invited}
                      </td>
                      <td className="px-5 py-2.5">
                        <Meter percent={r.rate} label={`${r.name}: ${r.rate}%`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-5 pb-3 text-xs text-ink-muted">يُحتسب الحضور الشخصي وعن بُعد وبالإنابة.</p>
            </Panel>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          {followUps && (
            <Panel title="تحتاج متابعتك">
              <ul className="divide-y divide-rule text-sm">
                {[
                  ["طلبات بنود بانتظار المراجعة", followUps[0].count ?? 0, "/meetings"],
                  ["مستندات مُسلّمة بانتظار الاعتماد", followUps[1].count ?? 0, "/meetings"],
                  ["محاضر في المسودة", followUps[2].count ?? 0, "/minutes"],
                ].map(([label, count, href]) => (
                  <li key={String(label)}>
                    <Link href={String(href)} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-paper">
                      <span>{label}</span>
                      <span className={clsx("font-mono", Number(count) > 0 ? "text-brass" : "text-ink-muted")}>{count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {disclosureStats && (
            <Panel title={`إفصاحات ${currentYear()}`}>
              <div className="flex flex-col gap-3 px-5 py-4 text-sm">
                <p>
                  قدّم <span className="font-mono">{filedCount}</span> من <span className="font-mono">{disclosureStats.members.size}</span> أعضاء المجلس
                </p>
                {disclosureStats.members.size > 0 && <Meter percent={Math.round((filedCount / disclosureStats.members.size) * 100)} label="نسبة تقديم الإفصاحات" />}
                {unreviewed > 0 && <p className="text-brass">{unreviewed} بانتظار المراجعة</p>}
                <Link href="/board" className="text-primary hover:underline">
                  أعضاء المجلس
                </Link>
              </div>
            </Panel>
          )}
          {can(p, "/admin/settings", LEVELS.manage) && (
            <details className="rounded-lg border border-rule bg-surface">
              <summary className="cursor-pointer px-5 py-3 text-sm font-medium">خطة بناء المنصة</summary>
              <ol className="flex flex-col gap-2 border-t border-rule px-5 py-3 text-sm">
                {phases.map((phase) => (
                  <li key={phase.number} className="flex items-center justify-between gap-2">
                    <span>
                      <span className="font-mono text-brass">{phase.number}</span> {phase.title}
                    </span>
                    <PhaseStatusTag status={phase.status} />
                  </li>
                ))}
              </ol>
            </details>
          )}
        </aside>
      </div>
    </>
  );
}
