import type { Metadata } from "next";
import { englishDate, ITEM_KINDS_EN, MEETING_MODES_EN, MEETING_TYPES_EN } from "@/lib/doc-labels";
import { dateParts } from "@/lib/format";
import { ITEM_KINDS, MEETING_MODES, MEETING_TYPES } from "@/lib/meetings";
import { DocChrome, InfoCard, L, reference } from "../../../doc";
import { loadMeeting } from "../_meeting";
import { H2, MeetingHead } from "../parts";

export const metadata: Metadata = { title: "جدول الأعمال" };

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

  return (
    <main className="doc">
      <DocChrome bi={bi} footer={`جدول أعمال الاجتماع ${ref}`} note={sent ? null : "لم تُرسل الدعوة بعد."} />
      <MeetingHead m={m} reference={ref} title="دعوة وجدول أعمال اجتماع" titleEn="Meeting Invitation and Agenda" date={sent ?? start} badges={[{ label: "سري · Confidential", tone: "c" }]} />
      <InfoCard
        bi={bi}
        date={start}
        dateEn={bi ? englishDate(start) : undefined}
        cells={[
          ["المكان", mode === "virtual" ? "اتصال مرئي" : meeting.location, "Venue", mode === "virtual" ? "Video conference" : meeting.location_en],
          ["الوقت", `${dateParts(start).time} – ${dateParts(end).time}`, "Time"],
          ["نوع الاجتماع", MEETING_TYPES[type], "Type", MEETING_TYPES_EN[type]],
          ["طريقة الانعقاد", MEETING_MODES[mode], "Format", MEETING_MODES_EN[mode]],
          ["الدعوة من", m.chair, "Called by", m.chairEn],
          ["إرسال الدعوة", sent ? `${dateParts(sent).long} (قبل ${notice} أيام)` : "لم تُرسل", "Invitation sent", sent ? `${englishDate(sent)} (${notice} days before)` : "Not sent"],
        ]}
      />
      {meeting.virtual_link && meeting.mode !== "in_person" && (
        <p className="ref">
          رابط الاتصال · Link: <span className="num" dir="ltr">{meeting.virtual_link}</span>
        </p>
      )}

      <H2 ar="بنود جدول الأعمال" en="Agenda Items" bi={bi} />
      <table>
        <thead>
          <tr>
            <th style={{ width: "5%" }}>م</th>
            <th>البند</th>
            {bi && <th className="en">Item</th>}
            <th style={{ width: "13%" }}>
              <L as="div" ar="الغرض" en="Purpose" bi={bi} />
            </th>
            <th style={{ width: "16%" }}>
              <L as="div" ar="العرض" en="Presenter" bi={bi} />
            </th>
            <th style={{ width: "8%" }}>
              <L as="div" ar="المدة" en="Min" bi={bi} />
            </th>
            <th style={{ width: "8%" }}>
              <L as="div" ar="مرفقات" en="Docs" bi={bi} />
            </th>
          </tr>
        </thead>
        <tbody>
          {(items ?? []).map((i) => {
            const kind = i.kind as keyof typeof ITEM_KINDS;
            return (
              <tr key={i.id}>
                <td className="num">{i.position}</td>
                <td>
                  <b>{i.title}</b>
                </td>
                {bi && (
                  <td className="en">
                    <b>{i.title_en}</b>
                  </td>
                )}
                <td>
                  <span className={kind === "decision" ? "pill" : "pill m"}>{bi ? `${ITEM_KINDS[kind]} · ${ITEM_KINDS_EN[kind]}` : ITEM_KINDS[kind]}</span>
                </td>
                <td>{i.presenter || "—"}</td>
                <td className="num">{i.duration_minutes ?? "—"}</td>
                <td className="num">{docCount(i.id) || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className={bi ? "doc-box doc-bi" : "doc-box"}>
        <div>
          <b>تنبيهات للأعضاء</b>
          <ol>
            <li>المستندات متاحة في المنصة، ويمكن طلب معلومات إضافية على أي بند من أمين السر قبل الاجتماع.</li>
            <li>على العضو الذي له مصلحة مباشرة أو غير مباشرة في أي بند الإفصاح عنها والامتناع عن التصويت عليه (نظام الشركات م71).</li>
            <li>يصح الاجتماع بحضور نصف الأعضاء أصالة أو نيابة على ألا يقل الحاضرون عن ثلاثة، والإنابة لعضو في المجلس وبإنابة واحدة (نظام الشركات م80، م81؛ لائحة حوكمة الشركات م30).</li>
          </ol>
        </div>
        {bi && (
          <div className="en">
            <b>Notes to members</b>
            <ol style={{ paddingLeft: 18, paddingRight: 0 }}>
              <li>Documents are available on the platform; members may request further information on any item from the secretary before the meeting.</li>
              <li>A member with a direct or indirect interest in any item must disclose it and abstain from voting on it (Companies Law Art. 71).</li>
              <li>The meeting is valid with half of the members present in person or by proxy and no fewer than three; a proxy may only be given to another member, one proxy each (Companies Law Arts. 80, 81; CMA Art. 30).</li>
            </ol>
          </div>
        )}
      </div>

      <div className="doc-lead">
        <div>
          <L ar="أمين السر" en="Secretary" bi={bi} />
          <b>{m.secretary || "—"}</b>
          <div className="line" />
          <small>{bi ? "التوقيع · Signature" : "التوقيع"}</small>
        </div>
        <div>
          <L ar={m.isBoard ? "اعتماد رئيس المجلس" : "اعتماد رئيس اللجنة"} en="Approved by the Chair" bi={bi} />
          <b>{m.chair || "—"}</b>
          <div className="line" />
          <small>{bi ? "التوقيع · Signature" : "التوقيع"}</small>
        </div>
      </div>
    </main>
  );
}
