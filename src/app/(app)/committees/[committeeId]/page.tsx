import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { requirePage } from "@/lib/auth";
import { implementation } from "@/lib/dashboard";
import { formatDateTime } from "@/lib/format";
import { meetingReference } from "@/lib/meetings";
import { riyadhToday } from "@/lib/minutes";
import { COMMITTEE_POSITIONS, currentYear, sortByPosition } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { Panel, StatTile } from "../../_dashboard/widgets";
import { committeeOf, compositionMembers } from "../_committee";
import { committeeRules, compositionChecks } from "@/lib/committee-powers";

export const metadata: Metadata = { title: "لوحة اللجنة" };

/** One committee at a glance: mandate, members, meetings this year, resolution follow-up. */
export default async function CommitteePage({ params }: PageProps<"/committees/[committeeId]">) {
  await requirePage("/committees");
  const { committeeId } = await params;
  const committee = await committeeOf(committeeId);
  const supabase = await createClient();
  const year = currentYear();
  const today = riyadhToday();
  const [{ data: members }, { data: meetings }, { data: resolutions }] = await Promise.all([
    supabase.from("committee_members").select("id, position, person:people(id, full_name)").eq("committee_id", committeeId).eq("status", "active"),
    supabase.from("meetings").select("id, title, number, starts_at, live_status, status").eq("committee_id", committeeId).neq("status", "cancelled").gte("starts_at", `${year}-01-01T00:00:00+03:00`).order("starts_at"),
    supabase.from("resolutions").select("resolution_tasks(status, due_date), meeting:meetings!inner(committee_id)").eq("meeting.committee_id", committeeId),
  ]);
  const rows = sortByPosition(((members ?? []) as unknown as { id: string; position: keyof typeof COMMITTEE_POSITIONS; person: { id: string; full_name: string } }[]).map((m) => ({ ...m, name: m.person.full_name })));
  const held = (meetings ?? []).filter((m) => m.live_status === "ended").length;
  const upcoming = (meetings ?? []).filter((m) => m.live_status !== "ended" && m.starts_at >= new Date().toISOString()).slice(0, 3);
  const tasks = implementation(((resolutions ?? []) as unknown as { resolution_tasks: { status: string; due_date: string | null }[] }[]).flatMap((r) => r.resolution_tasks), today);
  const base = `/committees/${committeeId}`;
  // Statutory checks for the four regulated committee kinds.
  const rules = committeeRules(committee.kind);
  const gaps = rules ? compositionChecks(committee.kind, await compositionMembers(committeeId)).filter((c) => !c.ok) : [];
  const fewMeetings = rules?.minMeetings && held < rules.minMeetings.perYear ? rules.minMeetings : null;

  return (
    <>
      <PageHeader section="اللجان" title={committee.name} description={committee.status === "archived" ? "لجنة مؤرشفة" : undefined} />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatTile label="الأعضاء" value={rows.length} href={`${base}/members`} />
          <StatTile label={`اجتماعات ${year}`} value={held} note={`${upcoming.length ? "وقادم " + upcoming.length : "لا اجتماعات قادمة"}`} href={`${base}/meetings`} />
          <StatTile label="تنفيذ القرارات" value={tasks.percent === null ? "—" : `${tasks.percent}%`} note={tasks.overdue ? `${tasks.overdue} مهمة متأخرة` : `${tasks.total} مهمة`} tone={tasks.overdue ? "alert" : "default"} href={`${base}/resolutions`} />
        </div>
        {rules && (
          <Panel title="الأحكام النظامية" action={<Link href={`${base}/charter`} className="text-sm text-primary hover:underline">اللائحة والصلاحيات</Link>}>
            <ul className="divide-y divide-rule text-sm">
              {gaps.map((g) => (
                <li key={g.ref + g.ar} className="flex justify-between gap-3 px-5 py-3">
                  <span>{g.ar}</span>
                  <span className="text-xs text-ink-muted">لائحة الحوكمة {g.ref}</span>
                </li>
              ))}
              {fewMeetings && (
                <li className="flex justify-between gap-3 px-5 py-3">
                  <span>
                    انعقد {held} من {fewMeetings.perYear} اجتماعات على الأقل هذه السنة
                  </span>
                  <span className="text-xs text-ink-muted">لائحة الحوكمة {fewMeetings.ref}</span>
                </li>
              )}
              {gaps.length === 0 && !fewMeetings && <li className="px-5 py-4 text-ink-muted">التشكيل والاجتماعات مستوفاة لما يعرفه النظام.</li>}
            </ul>
          </Panel>
        )}
        <Panel title="المهام والاختصاصات">
          <p className="whitespace-pre-line px-5 py-4 text-sm leading-7">{committee.mandate || "لم تُحدد بعد."}</p>
        </Panel>
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="الاجتماعات القادمة" action={<Link href={`/meetings/new?body=committee:${committeeId}`} className="text-sm text-primary hover:underline">اجتماع جديد</Link>}>
            <ul className="divide-y divide-rule text-sm">
              {upcoming.length === 0 && <li className="px-5 py-4 text-ink-muted">لا اجتماعات قادمة.</li>}
              {upcoming.map((m) => (
                <li key={m.id}>
                  <Link href={`/meetings/${m.id}`} className="flex justify-between gap-3 px-5 py-3 hover:bg-paper">
                    <span>{m.title}</span>
                    <span className="text-ink-muted">{meetingReference(m.number, m.starts_at)} · {formatDateTime(new Date(m.starts_at))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="الأعضاء" action={<Link href={`${base}/members`} className="text-sm text-primary hover:underline">إدارة الأعضاء</Link>}>
            <ul className="divide-y divide-rule text-sm">
              {rows.length === 0 && <li className="px-5 py-4 text-ink-muted">لا أعضاء بعد.</li>}
              {rows.map((m) => (
                <li key={m.id} className="flex justify-between gap-3 px-5 py-2.5">
                  <Link href={`/people/${m.person.id}`} className="text-primary hover:underline">{m.person.full_name}</Link>
                  <span className="text-ink-muted">{COMMITTEE_POSITIONS[m.position]}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
