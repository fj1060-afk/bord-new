import type { Metadata } from "next";
import { CATEGORIES_EN } from "@/lib/doc-labels";
import { BOARD_CATEGORIES } from "@/lib/org";
import { BiText, DocChrome, InfoCard, PersonCell, reference, Signatures, Th } from "../../../doc";
import { loadMeeting } from "../_meeting";
import { Capacity, H2, heldCells, heldDay, MeetingHead, Method, QuorumBox } from "../parts";

export const metadata: Metadata = { title: "كشف الحضور" };

export default async function AttendancePrint({ params }: PageProps<"/print/meetings/[meetingId]/attendance">) {
  const { meetingId } = await params;
  const m = await loadMeeting(meetingId);
  const { meeting, bi } = m;
  const ref = reference(meeting.code, meeting.starts_at);
  const proxyNote = (id: string): [string, string] => {
    if (m.status[id] === "proxy" && m.holderOf[id]) return [`أناب: ${m.names[m.holderOf[id]]}`, `Proxy holder: ${m.namesEn[m.holderOf[id]] || m.names[m.holderOf[id]]}`];
    const granted = Object.entries(m.holderOf).find(([, holder]) => holder === id);
    return granted ? [`يحمل إنابة: ${m.names[granted[0]]}`, `Holds proxy of: ${m.namesEn[granted[0]] || m.names[granted[0]]}`] : ["", ""];
  };
  const th = (ar: string, en: string, width?: string) => <Th ar={ar} en={en} bi={bi} width={width} />;

  return (
    <main className="doc">
      <DocChrome bi={bi} header={`${m.body} · ${ref} · كشف الحضور`} footer={`${ref} · كشف الحضور`} fileName={`${ref}-كشف-الحضور`} />
      <MeetingHead m={m} title="كشف حضور اجتماع" titleEn="Meeting Attendance Sheet" badges={[{ ar: "سري", en: "Confidential", tone: "c" }]} />
      <InfoCard bi={bi} day={heldDay(m)} cells={heldCells(m)} caption={meeting.started_at ? ["تاريخ الانعقاد", "Held on"] : ["تاريخ الاجتماع", "Meeting Date"]} />
      {meeting.attendance_intro && <BiText bi={bi} ar={meeting.attendance_intro} en={meeting.attendance_intro_en} />}

      <H2 ar={m.isBoard ? "أعضاء المجلس" : "أعضاء اللجنة"} en={m.isBoard ? "Board Members" : "Committee Members"} bi={bi} />
      <div className="doc-panel">
        <table>
        <thead>
          <tr>
            <th style={{ width: "4%" }}>م</th>
            {th("الاسم والصفة", "Name and position", "40%")}
            {th("الحضور", "Attendance", "14%")}
            {th("الطريقة", "Method", "10%")}
            {th("ملاحظة", "Note", "18%")}
            {th("التوقيع", "Signature", "14%")}
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
                  <PersonCell bi={bi} name={p.name} nameEn={p.nameEn} role={category ? `${p.role} · ${BOARD_CATEGORIES[category]}` : p.role} roleEn={category ? `${p.roleEn} · ${CATEGORIES_EN[category]}` : p.roleEn} />
                </td>
                <td>
                  <Capacity status={m.status[p.person_id]} bi={bi} />
                </td>
                <td>
                  <Method status={m.status[p.person_id]} bi={bi} />
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
      </div>

      <section className="keep">
        <H2 ar="التحقق من النصاب" en="Quorum" bi={bi} />
        <div className="doc-panel">
          <QuorumBox q={m.quorum} bi={bi} />
        </div>
      </section>

      {m.guests.length > 0 && (
        <>
          <H2 ar="المدعوون من غير الأعضاء" en="Invited Guests" bi={bi} />
          <div className="doc-panel">
            <table>
            <thead>
              <tr>
                <th style={{ width: "4%" }}>م</th>
                {th("الاسم والجهة", "Name and organisation")}
                {th("الحضور", "Attendance", "15%")}
                {th("الطريقة", "Method", "12%")}
                {th("التوقيع", "Signature", "13%")}
              </tr>
            </thead>
            <tbody>
              {m.guests.map((p, i) => (
                <tr key={p.person_id}>
                  <td className="num">{i + 1}</td>
                  <td>
                    <PersonCell bi={bi} name={p.name} nameEn={p.nameEn} role={p.job ?? ""} roleEn="" />
                  </td>
                  <td>
                    {m.status[p.person_id] === "present" || m.status[p.person_id] === "remote" ? <span className="pill">{bi ? "حاضر · Present" : "حاضر"}</span> : <Capacity status={m.status[p.person_id]} bi={bi} />}
                  </td>
                  <td>
                    <Method status={m.status[p.person_id]} bi={bi} />
                  </td>
                  <td className="sign" />
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      <Signatures
        bi={bi}
        signers={[
          { role: "رئيس الاجتماع", roleEn: "Chair", name: m.chair, nameEn: m.chairEn },
          { role: "أمين السر", roleEn: "Secretary", name: m.secretary, nameEn: m.secretaryEn },
        ]}
      />
    </main>
  );
}
