import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandSeal } from "@/components/shell/brand-seal";
import { formatDateTime, formatGregorianDate, formatHijriDate } from "@/lib/format";
import { ATTENDANCE, quorum, type AttendanceStatus } from "@/lib/live";
import { meetingReference } from "@/lib/meetings";
import { quorumRule } from "@/lib/company";
import { companyProfile } from "@/lib/live-server";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "كشف الحضور" };

type Invitee = { person_id: string; kind: string; person: { full_name: string } };

export default async function AttendanceSheet({ params }: PageProps<"/print/meetings/[meetingId]/attendance">) {
  const { meetingId } = await params;
  const supabase = await createClient();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("title, number, starts_at, started_at, ended_at, location, quorum_required, board_id, board:boards(name), committee:committees(name)")
    .eq("id", meetingId)
    .maybeSingle();
  if (!meeting) notFound();

  const [{ data: invitees }, { data: attendance }, { data: proxies }, profile] = await Promise.all([
    supabase.from("meeting_invitees").select("person_id, kind, person:people(full_name)").eq("meeting_id", meetingId),
    supabase.from("meeting_attendance").select("person_id, status").eq("meeting_id", meetingId),
    supabase.from("meeting_proxies").select("grantor_person_id, holder_person_id").eq("meeting_id", meetingId),
    companyProfile(supabase),
  ]);
  const rows = ((invitees ?? []) as unknown as Invitee[]).sort((a, b) => a.kind.localeCompare(b.kind) || a.person.full_name.localeCompare(b.person.full_name, "ar"));
  const status: Record<string, AttendanceStatus> = Object.fromEntries((attendance ?? []).map((a) => [a.person_id, a.status as AttendanceStatus]));
  const names = Object.fromEntries(rows.map((r) => [r.person_id, r.person.full_name]));
  const holderOf = Object.fromEntries((proxies ?? []).map((p) => [p.grantor_person_id, p.holder_person_id]));
  const q = quorum({
    members: rows.filter((r) => r.kind === "member").map((r) => r.person_id),
    attendance: status,
    proxies: (proxies ?? []).map((p) => ({ grantor: p.grantor_person_id, holder: p.holder_person_id })),
    required: meeting.quorum_required,
    rule: quorumRule(profile, !!meeting.board_id),
  });
  const body = (meeting.board ?? meeting.committee) as unknown as { name: string } | null;
  const date = new Date(meeting.starts_at);

  return (
    <main className="mx-auto max-w-3xl p-10 text-sm print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <PrintButton />
      </div>
      <header className="mb-8 flex items-start justify-between gap-6 border-b-2 border-black pb-4">
        <div>
          <p className="font-display text-2xl font-bold">كشف حضور اجتماع {body?.name}</p>
          <p className="mt-1">{meeting.title} · {meetingReference(meeting.number, meeting.starts_at)}</p>
          <p className="mt-1">
            {formatGregorianDate(date)} · {formatHijriDate(date)}
            {meeting.location && ` · ${meeting.location}`}
          </p>
        </div>
        <BrandSeal size={56} />
      </header>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-black">
            <th className="py-2 text-start">#</th>
            <th className="py-2 text-start">الاسم</th>
            <th className="py-2 text-start">الصفة</th>
            <th className="py-2 text-start">الحضور</th>
            <th className="w-40 py-2 text-start">التوقيع</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.person_id} className="border-b border-gray-300">
              <td className="py-3 font-mono">{i + 1}</td>
              <td className="py-3">{r.person.full_name}</td>
              <td className="py-3">{r.kind === "member" ? "عضو" : "ضيف"}</td>
              <td className="py-3">
                {status[r.person_id] ? ATTENDANCE[status[r.person_id]] : "—"}
                {status[r.person_id] === "proxy" && holderOf[r.person_id] && ` (ينوب عنه ${names[holderOf[r.person_id]]})`}
              </td>
              <td className="py-3" />
            </tr>
          ))}
        </tbody>
      </table>

      <section className="mt-8 grid grid-cols-2 gap-4">
        <p>
          النصاب: <strong className="font-mono">{q.counted}</strong> محتسبون من <strong className="font-mono">{q.required}</strong> مطلوبين ({q.met ? "مكتمل" : "غير مكتمل"})
        </p>
        <p>عدد الأعضاء: <span className="font-mono">{q.members}</span></p>
        <p>وقت البدء: {meeting.started_at ? formatDateTime(new Date(meeting.started_at)) : "—"}</p>
        <p>وقت الانتهاء: {meeting.ended_at ? formatDateTime(new Date(meeting.ended_at)) : "—"}</p>
      </section>

      <footer className="mt-16 grid grid-cols-2 gap-10">
        <p className="border-t border-black pt-2">أمين السر</p>
        <p className="border-t border-black pt-2">رئيس الاجتماع</p>
      </footer>
    </main>
  );
}
