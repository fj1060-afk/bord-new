import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandSeal } from "@/components/shell/brand-seal";
import { formatDateTime, formatGregorianDate, formatHijriDate } from "@/lib/format";
import { meetingReference } from "@/lib/meetings";
import { MINUTES_STATUS, RESOLUTION_STATUS, resolutionReference, type MinutesStatus } from "@/lib/minutes";
import { REMARK_KINDS, type RemarkKind } from "@/lib/secretary";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "محضر الاجتماع" };

export default async function MinutesPrint({ params }: PageProps<"/print/meetings/[meetingId]/minutes">) {
  const { meetingId } = await params;
  const supabase = await createClient();
  const [{ data: meeting }, { data: minutes }] = await Promise.all([
    supabase.from("meetings").select("title, number, starts_at, board:boards(name), committee:committees(name)").eq("id", meetingId).maybeSingle(),
    supabase.from("minutes").select("id, status, intro, closing, version, approved_at").eq("meeting_id", meetingId).maybeSingle(),
  ]);
  if (!meeting || !minutes) notFound();

  const [{ data: items }, { data: rows }, { data: resolutions }, { data: signers }, { data: signatures }, { data: remarks }] = await Promise.all([
    supabase.from("agenda_items").select("id, position, title").eq("meeting_id", meetingId).order("position"),
    supabase.from("minutes_items").select("agenda_item_id, deliberation").eq("minutes_id", minutes.id),
    supabase.from("resolutions").select("agenda_item_id, number, year, text, status").eq("meeting_id", meetingId).order("number"),
    supabase.rpc("minutes_signers", { p_minutes: minutes.id }),
    supabase.from("minutes_signatures").select("person_id, signed_at, method").eq("minutes_id", minutes.id).eq("version", minutes.version),
    supabase.from("minutes_remarks").select("id, kind, note, person:people(full_name)").eq("minutes_id", minutes.id).neq("kind", "comment").order("created_at"),
  ]);
  const deliberation = Object.fromEntries((rows ?? []).map((r) => [r.agenda_item_id, r.deliberation]));
  const signedAt = Object.fromEntries((signatures ?? []).map((s) => [s.person_id, s.signed_at]));
  const body = (meeting.board ?? meeting.committee) as unknown as { name: string } | null;
  const date = new Date(meeting.starts_at);

  return (
    <main className="mx-auto max-w-3xl p-10 leading-8 print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <span className="text-sm">الحالة: {MINUTES_STATUS[minutes.status as MinutesStatus]}</span>
        <PrintButton />
      </div>
      <header className="mb-8 flex items-start justify-between gap-6 border-b-2 border-black pb-4">
        <div>
          <p className="font-display text-2xl font-bold">محضر اجتماع {body?.name}</p>
          <p>{meeting.title} · {meetingReference(meeting.number, meeting.starts_at)}</p>
          <p>{formatGregorianDate(date)} · {formatHijriDate(date)}</p>
        </div>
        <BrandSeal size={56} />
      </header>
      {minutes.status !== "approved" && <p className="mb-6 border border-black p-2 text-center font-bold">مسودة غير معتمدة</p>}
      <p className="mb-6 whitespace-pre-line">{minutes.intro}</p>
      {(items ?? []).map((item) => (
        <section key={item.id} className="mb-6">
          <h2 className="font-display text-lg font-bold">{item.position}. {item.title}</h2>
          <p className="whitespace-pre-line">{deliberation[item.id] || "—"}</p>
          {(resolutions ?? []).filter((r) => r.agenda_item_id === item.id).map((r) => (
            <p key={r.number} className="mt-2 border-s-4 border-black ps-3">
              <strong>القرار رقم {resolutionReference(r.number, r.year)} ({RESOLUTION_STATUS[r.status as keyof typeof RESOLUTION_STATUS]}):</strong> {r.text}
            </p>
          ))}
        </section>
      ))}
      {(remarks ?? []).length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-bold">التحفظات والآراء المخالفة وتعارض المصالح</h2>
          <ul className="list-disc ps-6">
            {((remarks ?? []) as unknown as { id: string; kind: RemarkKind; note: string; person: { full_name: string } | null }[]).map((r) => (
              <li key={r.id}>
                {REMARK_KINDS[r.kind]}: {r.person?.full_name} — {r.note}
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mb-10 whitespace-pre-line">{minutes.closing}</p>
      <section>
        <h2 className="mb-3 font-bold">التوقيعات{minutes.version > 0 && ` (النسخة ${minutes.version})`}</h2>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {((signers ?? []) as { person_id: string; full_name: string }[]).map((s) => (
              <tr key={s.person_id} className="border-b border-gray-300">
                <td className="py-3">{s.full_name}</td>
                <td className="py-3">{signedAt[s.person_id]
                    ? `${(signatures ?? []).find((g) => g.person_id === s.person_id)?.method === "manual" ? "وُقّع ورقياً" : "وُقّع إلكترونياً"} ${formatDateTime(new Date(signedAt[s.person_id]))}`
                    : "لم يوقّع"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
