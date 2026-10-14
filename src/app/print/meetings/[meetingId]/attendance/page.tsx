import type { Metadata } from "next";
import { dateParts } from "@/lib/format";
import { MEETING_MODES } from "@/lib/meetings";
import { BOARD_CATEGORIES } from "@/lib/org";
import { DocChrome, DocHead, DocTitle, InfoCard, reference } from "../../../doc";
import { loadMeeting } from "../_meeting";
import { AttendancePill, QuorumBox } from "../parts";

export const metadata: Metadata = { title: "كشف الحضور" };

export default async function AttendancePrint({ params }: PageProps<"/print/meetings/[meetingId]/attendance">) {
  const { meetingId } = await params;
  const m = await loadMeeting(meetingId);
  const { meeting } = m;
  const start = new Date(meeting.starts_at);
  const ref = reference(m.isBoard, meeting.number, meeting.starts_at);
  const proxyNote = (id: string) => {
    if (m.status[id] === "proxy" && m.holderOf[id]) return `أناب: ${m.names[m.holderOf[id]]}`;
    const granted = Object.entries(m.holderOf).find(([, holder]) => holder === id);
    return granted ? `يحمل إنابة: ${m.names[granted[0]]}` : "";
  };

  return (
    <main className="doc">
      <DocChrome footer={`كشف حضور الاجتماع ${ref}`} />
      <DocHead company={m.company} issuer={m.isBoard ? "أمانة سر مجلس الإدارة" : `أمانة سر ${m.body}`} reference={ref} date={start} badges={[{ label: "سري", tone: "c" }]} />
      <DocTitle title="كشف حضور اجتماع" subtitle={<>{m.body} - الاجتماع رقم (<span className="num">{meeting.number}</span>) لعام <span className="num">{meeting.starts_at.slice(0, 4)}</span></>} />
      <InfoCard
        date={start}
        cells={[
          ["المكان", meeting.mode === "virtual" ? "اتصال مرئي" : meeting.location],
          ["بدأ الاجتماع فعلياً", meeting.started_at ? dateParts(new Date(meeting.started_at)).time : null],
          ["انتهى الاجتماع فعلياً", meeting.ended_at ? dateParts(new Date(meeting.ended_at)).time : null],
          ["طريقة الانعقاد", MEETING_MODES[meeting.mode as keyof typeof MEETING_MODES]],
          ["رئيس الاجتماع", m.chair],
          ["أمين السر", m.secretary],
        ]}
      />

      <h2>{m.isBoard ? "أعضاء المجلس" : "أعضاء اللجنة"}</h2>
      <table>
        <thead>
          <tr>
            <th style={{ width: "5%" }}>م</th>
            <th>الاسم</th>
            {m.isBoard && <th style={{ width: "13%" }}>الصفة</th>}
            <th style={{ width: "13%" }}>الحضور</th>
            <th style={{ width: "22%" }}>ملاحظة</th>
            <th style={{ width: "17%" }}>التوقيع</th>
          </tr>
        </thead>
        <tbody>
          {m.members.map((p, i) => (
            <tr key={p.person_id}>
              <td className="num">{i + 1}</td>
              <td>
                <b>{p.name}</b>
                <small>{p.role}</small>
              </td>
              {m.isBoard && <td>{p.category ? BOARD_CATEGORIES[p.category as keyof typeof BOARD_CATEGORIES] : "—"}</td>}
              <td>
                <AttendancePill status={m.status[p.person_id]} />
              </td>
              <td>{proxyNote(p.person_id)}</td>
              <td className="sign" />
            </tr>
          ))}
        </tbody>
      </table>

      <h2>التحقق من النصاب</h2>
      <QuorumBox q={m.quorum} />

      {m.guests.length > 0 && (
        <>
          <h2>المدعوون من غير الأعضاء</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: "5%" }}>م</th>
                <th>الاسم</th>
                <th style={{ width: "34%" }}>الجهة / الصفة</th>
                <th style={{ width: "13%" }}>الحضور</th>
                <th style={{ width: "17%" }}>التوقيع</th>
              </tr>
            </thead>
            <tbody>
              {m.guests.map((p, i) => (
                <tr key={p.person_id}>
                  <td className="num">{i + 1}</td>
                  <td>
                    <b>{p.name}</b>
                  </td>
                  <td>{p.job ?? "—"}</td>
                  <td>
                    <AttendancePill status={m.status[p.person_id]} />
                  </td>
                  <td className="sign" />
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="doc-lead">
        <div>
          <span>رئيس الاجتماع</span>
          <b>{m.chair || "—"}</b>
          <div className="line" />
          <small>التوقيع</small>
        </div>
        <div>
          <span>أمين السر</span>
          <b>{m.secretary || "—"}</b>
          <div className="line" />
          <small>التوقيع</small>
        </div>
      </div>
    </main>
  );
}

