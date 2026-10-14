import type { Metadata } from "next";
import { CATEGORIES_EN, englishDate, MEETING_MODES_EN } from "@/lib/doc-labels";
import { dateParts } from "@/lib/format";
import { MEETING_MODES } from "@/lib/meetings";
import { BOARD_CATEGORIES } from "@/lib/org";
import { DocChrome, InfoCard, L, reference } from "../../../doc";
import { loadMeeting } from "../_meeting";
import { AttendancePill, H2, MeetingHead, QuorumBox } from "../parts";

export const metadata: Metadata = { title: "كشف الحضور" };

export default async function AttendancePrint({ params }: PageProps<"/print/meetings/[meetingId]/attendance">) {
  const { meetingId } = await params;
  const m = await loadMeeting(meetingId);
  const { meeting, bi } = m;
  const start = new Date(meeting.starts_at);
  const ref = reference(m.isBoard, meeting.number, meeting.starts_at);
  const mode = meeting.mode as keyof typeof MEETING_MODES;
  const proxyNote = (id: string): [string, string] => {
    if (m.status[id] === "proxy" && m.holderOf[id]) return [`أناب: ${m.names[m.holderOf[id]]}`, `Proxy: ${m.namesEn[m.holderOf[id]] || m.names[m.holderOf[id]]}`];
    const granted = Object.entries(m.holderOf).find(([, holder]) => holder === id);
    return granted ? [`يحمل إنابة: ${m.names[granted[0]]}`, `Holds proxy: ${m.namesEn[granted[0]] || m.names[granted[0]]}`] : ["", ""];
  };

  return (
    <main className="doc">
      <DocChrome bi={bi} footer={`كشف حضور الاجتماع ${ref}`} />
      <MeetingHead m={m} reference={ref} title="كشف حضور اجتماع" titleEn="Meeting Attendance Sheet" date={start} badges={[{ label: "سري · Confidential", tone: "c" }]} />
      <InfoCard
        bi={bi}
        date={start}
        dateEn={bi ? englishDate(start) : undefined}
        cells={[
          ["المكان", mode === "virtual" ? "اتصال مرئي" : meeting.location, "Venue", mode === "virtual" ? "Video conference" : meeting.location_en],
          ["بدأ الاجتماع فعلياً", meeting.started_at ? dateParts(new Date(meeting.started_at)).time : null, "Started"],
          ["انتهى الاجتماع فعلياً", meeting.ended_at ? dateParts(new Date(meeting.ended_at)).time : null, "Ended"],
          ["طريقة الانعقاد", MEETING_MODES[mode], "Format", MEETING_MODES_EN[mode]],
          ["رئيس الاجتماع", m.chair, "Chair", m.chairEn],
          ["أمين السر", m.secretary, "Secretary", m.secretaryEn],
        ]}
      />

      <H2 ar={m.isBoard ? "أعضاء المجلس" : "أعضاء اللجنة"} en={m.isBoard ? "Board Members" : "Committee Members"} bi={bi} />
      <table>
        <thead>
          <tr>
            <th style={{ width: "5%" }}>م</th>
            <th>الاسم</th>
            {bi && <th className="en">Name</th>}
            {m.isBoard && !bi && <th style={{ width: "13%" }}>الصفة</th>}
            <th style={{ width: "14%" }}>
              <L as="div" ar="الحضور" en="Status" bi={bi} />
            </th>
            <th style={{ width: bi ? "17%" : "22%" }}>
              <L as="div" ar="ملاحظة" en="Note" bi={bi} />
            </th>
            <th style={{ width: "14%" }}>
              <L as="div" ar="التوقيع" en="Signature" bi={bi} />
            </th>
          </tr>
        </thead>
        <tbody>
          {m.members.map((p, i) => {
            const category = p.category as keyof typeof BOARD_CATEGORIES | null;
            const [note, noteEn] = proxyNote(p.person_id);
            return (
              <tr key={p.person_id}>
                <td className="num">{i + 1}</td>
                <td>
                  <b>{p.name}</b>
                  <small>{bi && category ? `${p.role} · ${BOARD_CATEGORIES[category]}` : p.role}</small>
                </td>
                {bi && (
                  <td className="en">
                    <b>{p.nameEn}</b>
                    <small className="en">{category ? `${p.roleEn} · ${CATEGORIES_EN[category]}` : p.roleEn}</small>
                  </td>
                )}
                {m.isBoard && !bi && <td>{category ? BOARD_CATEGORIES[category] : "—"}</td>}
                <td>
                  <AttendancePill status={m.status[p.person_id]} bi={bi} />
                </td>
                <td>
                  {note}
                  {bi && note && <span className="note-en">{noteEn}</span>}
                </td>
                <td className="sign" />
              </tr>
            );
          })}
        </tbody>
      </table>

      <H2 ar="التحقق من النصاب" en="Quorum" bi={bi} />
      <QuorumBox q={m.quorum} bi={bi} />

      {m.guests.length > 0 && (
        <>
          <H2 ar="المدعوون من غير الأعضاء" en="Invited Guests" bi={bi} />
          <table>
            <thead>
              <tr>
                <th style={{ width: "5%" }}>م</th>
                <th>الاسم</th>
                {bi && <th className="en">Name</th>}
                <th style={{ width: "28%" }}>
                  <L as="div" ar="الجهة / الصفة" en="Title" bi={bi} />
                </th>
                <th style={{ width: "14%" }}>
                  <L as="div" ar="الحضور" en="Status" bi={bi} />
                </th>
                <th style={{ width: "14%" }}>
                  <L as="div" ar="التوقيع" en="Signature" bi={bi} />
                </th>
              </tr>
            </thead>
            <tbody>
              {m.guests.map((p, i) => (
                <tr key={p.person_id}>
                  <td className="num">{i + 1}</td>
                  <td>
                    <b>{p.name}</b>
                  </td>
                  {bi && (
                    <td className="en">
                      <b>{p.nameEn}</b>
                    </td>
                  )}
                  <td>{p.job ?? "—"}</td>
                  <td>
                    <AttendancePill status={m.status[p.person_id]} bi={bi} />
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
          <L ar="رئيس الاجتماع" en="Chair" bi={bi} />
          <b>{m.chair || "—"}</b>
          <div className="line" />
          <small>{bi ? "التوقيع · Signature" : "التوقيع"}</small>
        </div>
        <div>
          <L ar="أمين السر" en="Secretary" bi={bi} />
          <b>{m.secretary || "—"}</b>
          <div className="line" />
          <small>{bi ? "التوقيع · Signature" : "التوقيع"}</small>
        </div>
      </div>
    </main>
  );
}
