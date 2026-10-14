import type { Metadata } from "next";
import { englishDate, englishTime, ITEM_KINDS_EN, MEETING_MODES_EN, MEETING_TYPES_EN } from "@/lib/doc-labels";
import { dateParts } from "@/lib/format";
import { ITEM_KINDS, MEETING_MODES, MEETING_TYPES } from "@/lib/meetings";
import { DocChrome, InfoCard, L, reference, Signatures } from "../../../doc";
import { loadMeeting } from "../_meeting";
import { H2, MeetingHead } from "../parts";

export const metadata: Metadata = { title: "جدول الأعمال" };

const NOTES: [string, string][] = [
  ["المستندات متاحة في المنصة، ويمكن طلب معلومات إضافية على أي بند من أمين السر قبل الاجتماع.", "Documents are on the platform; members may ask the secretary for further information on any item before the meeting."],
  ["على العضو الذي له مصلحة مباشرة أو غير مباشرة في أي بند الإفصاح عنها والامتناع عن التصويت عليه (نظام الشركات م71).", "A member with a direct or indirect interest in an item must disclose it and abstain from voting on it (Companies Law Art. 71)."],
  ["يصح الاجتماع بحضور نصف الأعضاء أصالةً أو نيابةً على ألا يقل الحاضرون عن ثلاثة، والإنابة لعضو في المجلس وبإنابة واحدة (م80، م81؛ لائحة الحوكمة م30).", "The meeting is valid with half of the members in their own right or by proxy and at least three present; a proxy may go only to another member, one each (Arts. 80, 81; CMA Art. 30)."],
];

export default async function AgendaPrint({ params }: PageProps<"/print/meetings/[meetingId]/agenda">) {
  const { meetingId } = await params;
  const m = await loadMeeting(meetingId);
  const { meeting, bi } = m;
  const [{ data: items }, { data: docs }] = await Promise.all([
    m.supabase.from("agenda_items").select("id, position, title, title_en, kind, duration_minutes, presenter").eq("meeting_id", meetingId).order("position"),
    m.supabase.from("meeting_documents").select("agenda_item_id").eq("meeting_id", meetingId),
  ]);
  const start = new Date(meeting.starts_at);
  const end = new Date(start.getTime() + meeting.duration_minutes * 60000);
  const sent = meeting.pack_published_at ? new Date(meeting.pack_published_at) : null;
  const notice = sent ? Math.floor((start.getTime() - sent.getTime()) / 86400000) : null;
  const ref = reference(m.isBoard, meeting.number, meeting.starts_at);
  const docCount = (id: string) => (docs ?? []).filter((d) => d.agenda_item_id === id).length;
  const mode = meeting.mode as keyof typeof MEETING_MODES;
  const type = meeting.meeting_type as keyof typeof MEETING_TYPES;
  const d = dateParts(start);
  const th = (ar: string, en: string, width?: string) => (
    <th style={width ? { width } : undefined}>
      <L as="div" ar={ar} en={en} bi={bi} />
    </th>
  );

  return (
    <main className="doc">
      <DocChrome bi={bi} footer={`${ref} · جدول الأعمال`} note={sent ? null : "لم تُرسل الدعوة بعد."} />
      <MeetingHead m={m} title="دعوة وجدول أعمال اجتماع" titleEn="Meeting Invitation and Agenda" badges={[{ ar: "سري", en: "Confidential", tone: "c" }]} />
      <InfoCard
        bi={bi}
        day={{ ...d, en: englishDate(start) }}
        cells={[
          { ar: "الوقت", en: "Time", value: `${d.time} – ${dateParts(end).time}`, valueEn: `${englishTime(start)} – ${englishTime(end)}` },
          { ar: "نوع الاجتماع", en: "Type", value: MEETING_TYPES[type], valueEn: MEETING_TYPES_EN[type] },
          { ar: "طريقة الانعقاد", en: "Format", value: MEETING_MODES[mode], valueEn: MEETING_MODES_EN[mode] },
          { ar: "المكان", en: "Venue", value: mode === "virtual" ? "اتصال مرئي" : meeting.location, valueEn: mode === "virtual" ? "Video conference" : meeting.location_en || "—" },
          { ar: "الدعوة من", en: "Called by", value: m.chair, valueEn: m.chairEn || "—" },
          { ar: "إرسال الدعوة", en: "Invitation sent", value: sent ? `${dateParts(sent).long} (قبل ${notice} أيام)` : "لم تُرسل", valueEn: sent ? `${englishDate(sent)} (${notice} days before)` : "Not sent" },
        ]}
      />
      {meeting.virtual_link && meeting.mode !== "in_person" && (
        <p className="ref">
          {bi ? "رابط الاتصال · Link" : "رابط الاتصال"}: <span className="num" dir="ltr">{meeting.virtual_link}</span>
        </p>
      )}

      <H2 ar="بنود جدول الأعمال" en="Agenda Items" bi={bi} />
      <table>
        <thead>
          <tr>
            <th style={{ width: "4%" }}>م</th>
            {th("البند", "Item")}
            {th("الغرض", "Purpose", "15%")}
            {th("العرض", "Presenter", "15%")}
            {th("المدة", "Min", "7%")}
            {th("مرفقات", "Docs", "7%")}
          </tr>
        </thead>
        <tbody>
          {(items ?? []).map((i) => {
            const kind = i.kind as keyof typeof ITEM_KINDS;
            return (
              <tr key={i.id}>
                <td className="num">{i.position}</td>
                <td>{bi ? <L as="div" className="top" ar={<b>{i.title}</b>} en={i.title_en?.trim() ? <b>{i.title_en}</b> : <span className="missing">—</span>} bi /> : <b>{i.title}</b>}</td>
                <td>
                  <span className={kind === "decision" ? "pill" : "pill m"}>{ITEM_KINDS[kind]}</span>
                  {bi && <span className="note-en">{ITEM_KINDS_EN[kind]}</span>}
                </td>
                <td>{i.presenter || "—"}</td>
                <td className="num">{i.duration_minutes ?? "—"}</td>
                <td className="num">{docCount(i.id) || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="doc-box">
        <L as="div" ar={<b>تنبيهات للأعضاء</b>} en={<b>Notes to members</b>} bi={bi} />
        {NOTES.map(([ar, en], i) => (
          <div key={i} className={bi ? "doc-bi" : undefined} style={{ marginTop: 3 }}>
            <p>
              <span className="num">{i + 1}.</span> {ar}
            </p>
            {bi && (
              <p className="en">
                <span className="num">{i + 1}.</span> {en}
              </p>
            )}
          </div>
        ))}
      </div>

      <Signatures
        bi={bi}
        signers={[
          { role: "أمين السر", roleEn: "Secretary", name: m.secretary, nameEn: m.secretaryEn },
          { role: m.isBoard ? "رئيس المجلس" : "رئيس اللجنة", roleEn: "Chair", name: m.chair, nameEn: m.chairEn },
        ]}
      />
    </main>
  );
}
