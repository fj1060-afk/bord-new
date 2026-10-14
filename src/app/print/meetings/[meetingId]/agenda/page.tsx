import type { Metadata } from "next";
import { dateParts } from "@/lib/format";
import { ITEM_KINDS, MEETING_MODES, MEETING_TYPES } from "@/lib/meetings";
import { DocChrome, DocHead, DocTitle, InfoCard, reference } from "../../../doc";
import { loadMeeting } from "../_meeting";

export const metadata: Metadata = { title: "جدول الأعمال" };

export default async function AgendaPrint({ params }: PageProps<"/print/meetings/[meetingId]/agenda">) {
  const { meetingId } = await params;
  const m = await loadMeeting(meetingId);
  const { meeting } = m;
  const [{ data: items }, { data: docs }] = await Promise.all([
    m.supabase.from("agenda_items").select("id, position, title, kind, duration_minutes, presenter").eq("meeting_id", meetingId).order("position"),
    m.supabase.from("meeting_documents").select("agenda_item_id").eq("meeting_id", meetingId),
  ]);
  const start = new Date(meeting.starts_at);
  const end = new Date(start.getTime() + meeting.duration_minutes * 60000);
  const sent = meeting.pack_published_at ? new Date(meeting.pack_published_at) : null;
  const notice = sent ? Math.floor((start.getTime() - sent.getTime()) / 86400000) : null;
  const ref = reference(m.isBoard, meeting.number, meeting.starts_at);
  const docCount = (id: string) => (docs ?? []).filter((d) => d.agenda_item_id === id).length;

  return (
    <main className="doc">
      <DocChrome footer={`جدول أعمال الاجتماع ${ref}`} note={sent ? null : "لم تُرسل الدعوة بعد."} />
      <DocHead company={m.company} issuer={m.isBoard ? "أمانة سر مجلس الإدارة" : `أمانة سر ${m.body}`} reference={ref} date={sent ?? start} badges={[{ label: "سري", tone: "c" }]} />
      <DocTitle title="دعوة وجدول أعمال اجتماع" subtitle={<>{m.body} - الاجتماع رقم (<span className="num">{meeting.number}</span>) لعام <span className="num">{meeting.starts_at.slice(0, 4)}</span></>} />
      <InfoCard
        date={start}
        cells={[
          ["المكان", meeting.mode === "virtual" ? "اتصال مرئي" : meeting.location],
          ["الوقت", `${dateParts(start).time} – ${dateParts(end).time}`],
          ["نوع الاجتماع", MEETING_TYPES[meeting.meeting_type as keyof typeof MEETING_TYPES]],
          ["طريقة الانعقاد", MEETING_MODES[meeting.mode as keyof typeof MEETING_MODES]],
          ["الدعوة من", m.chair ? `${m.isBoard ? "رئيس المجلس" : "رئيس اللجنة"}: ${m.chair}` : null],
          ["إرسال الدعوة", sent ? `${dateParts(sent).long} (قبل ${notice} أيام)` : "لم تُرسل"],
        ]}
      />
      {meeting.virtual_link && meeting.mode !== "in_person" && (
        <p className="ref">
          رابط الاتصال: <span className="num" dir="ltr">{meeting.virtual_link}</span>
        </p>
      )}

      <h2>بنود جدول الأعمال</h2>
      <table>
        <thead>
          <tr>
            <th style={{ width: "5%" }}>م</th>
            <th>البند</th>
            <th style={{ width: "12%" }}>الغرض</th>
            <th style={{ width: "20%" }}>العرض</th>
            <th style={{ width: "9%" }}>المدة</th>
            <th style={{ width: "10%" }}>المرفقات</th>
          </tr>
        </thead>
        <tbody>
          {(items ?? []).map((i) => (
            <tr key={i.id}>
              <td className="num">{i.position}</td>
              <td>
                <b>{i.title}</b>
              </td>
              <td>
                <span className={i.kind === "decision" ? "pill" : "pill m"}>{ITEM_KINDS[i.kind as keyof typeof ITEM_KINDS]}</span>
              </td>
              <td>{i.presenter || "—"}</td>
              <td className="num">{i.duration_minutes ?? "—"}</td>
              <td className="num">{docCount(i.id) || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="doc-box">
        <b>تنبيهات للأعضاء</b>
        <ol>
          <li>المستندات متاحة في المنصة، ويمكن طلب معلومات إضافية على أي بند من أمين السر قبل الاجتماع.</li>
          <li>على العضو الذي له مصلحة مباشرة أو غير مباشرة في أي بند الإفصاح عنها والامتناع عن التصويت عليه (نظام الشركات م71).</li>
          <li>يصح الاجتماع بحضور نصف الأعضاء أصالة أو نيابة على ألا يقل الحاضرون عن ثلاثة، والإنابة لعضو في المجلس وبإنابة واحدة (نظام الشركات م80، م81؛ لائحة حوكمة الشركات م30).</li>
        </ol>
      </div>

      <div className="doc-lead">
        <div>
          <span>أمين السر</span>
          <b>{m.secretary || "—"}</b>
          <div className="line" />
          <small>التوقيع</small>
        </div>
        <div>
          <span>{m.isBoard ? "اعتماد رئيس المجلس" : "اعتماد رئيس اللجنة"}</span>
          <b>{m.chair || "—"}</b>
          <div className="line" />
          <small>التوقيع</small>
        </div>
      </div>
    </main>
  );
}
