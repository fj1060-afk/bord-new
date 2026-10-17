import type { Metadata } from "next";
import { englishTime, ITEM_KINDS_EN, MEETING_MODES_EN, MEETING_TYPES_EN } from "@/lib/doc-labels";
import { dateParts } from "@/lib/format";
import { ITEM_KINDS, MEETING_MODES, MEETING_TYPES } from "@/lib/meetings";
import { Clock, FileText, MapPin, Paperclip, User, Users } from "lucide-react";
import { BiText, DocChrome, InfoCard, L, reference, Signatures } from "../../../doc";
import { loadMeeting } from "../_meeting";
import { dayBlock, H2, IssuedLine, longTime, MeetingHead } from "../parts";

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
  const ref = reference(m.isBoard, meeting.number, meeting.starts_at);
  const allDecision = (items ?? []).length > 0 && (items ?? []).every((i) => i.kind === "decision");
  const docCount = (id: string) => (docs ?? []).filter((d) => d.agenda_item_id === id).length;
  const mode = meeting.mode as keyof typeof MEETING_MODES;
  const type = meeting.meeting_type as keyof typeof MEETING_TYPES;
  const d = dateParts(start);

  return (
    <main className="doc">
      <DocChrome bi={bi} header={`${m.body} · ${ref} · جدول الأعمال`} footer={`${ref} · جدول الأعمال`} fileName={`${ref}-جدول-الأعمال`} note={meeting.invited_at ? null : "لم تُصدر الدعوة بعد: يظهر رقم الاجتماع وتاريخ الإصدار عند اعتماد الموعد."} />
      <MeetingHead m={m} title="دعوة وجدول أعمال اجتماع" titleEn="Meeting Invitation and Agenda" badges={[{ ar: "سري", en: "Confidential", tone: "c" }]} />
      <IssuedLine m={m} />
      <InfoCard
        bi={bi}
        caption={["تاريخ الاجتماع", "Meeting Date"]}
        day={dayBlock(start)}
        cells={[
          { ar: "وقت الاجتماع", en: "Meeting Time", icon: Clock, value: longTime(d.time), valueEn: englishTime(start) },
          { ar: "نوع الاجتماع", en: "Meeting Type", icon: FileText, value: MEETING_TYPES[type], valueEn: MEETING_TYPES_EN[type] },
          { ar: "طريقة الانعقاد", en: "Meeting Format", icon: Users, value: MEETING_MODES[mode], valueEn: MEETING_MODES_EN[mode] },
          { ar: "مكان الاجتماع", en: "Meeting Venue", icon: MapPin, value: mode === "virtual" ? "اتصال مرئي" : meeting.location, valueEn: mode === "virtual" ? "Video conference" : meeting.location_en || "—" },
        ]}
      />
      {meeting.agenda_intro && <BiText bi={bi} ar={meeting.agenda_intro} en={meeting.agenda_intro_en} />}
      {meeting.virtual_link && meeting.mode !== "in_person" && (
        <p className="ref">
          {bi ? "رابط الاتصال · Link" : "رابط الاتصال"}: <span className="num" dir="ltr">{meeting.virtual_link}</span>
        </p>
      )}

      <H2 ar="بنود جدول الأعمال" en="Agenda Items" bi={bi} />
      {allDecision && <p className="ref">{bi ? "جميع البنود للقرار · All items are for decision" : "جميع البنود للقرار"}</p>}
      <ol className="doc-items">
        {(items ?? []).map((i) => {
          const kind = i.kind as keyof typeof ITEM_KINDS;
          const label = (ar: string, en: string) => <span className="ml">{bi ? `${ar} / ${en}` : ar}:</span>;
          return (
            <li key={i.id}>
              <div className="ai-head">
                <span className="no num">{i.position}</span>
                <div className="ai-ar">
                  {i.title}
                  {!allDecision && (
                    <span className={kind === "decision" ? "pill" : "pill m"}>
                      {ITEM_KINDS[kind]}
                      {bi && ` · ${ITEM_KINDS_EN[kind]}`}
                    </span>
                  )}
                </div>
                {bi && <div className="ai-en en">{i.title_en?.trim() || <span className="missing">English title not provided.</span>}</div>}
              </div>
              <div className="ai-meta">
                <span>
                  <User size={14} strokeWidth={1.6} aria-hidden="true" /> {label("العرض", "Presenter")} {i.presenter || "—"}
                </span>
                <span>
                  <Clock size={14} strokeWidth={1.6} aria-hidden="true" /> {label("المدة", "Duration")} <b className="num">{i.duration_minutes ?? "—"}</b> {i.duration_minutes ? (bi ? "min" : "دقيقة") : ""}
                </span>
                <span>
                  <Paperclip size={14} strokeWidth={1.6} aria-hidden="true" /> {label("المرفقات", "Attachments")} <b className="num">{docCount(i.id) || "—"}</b>
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="doc-box">
        <L as="div" className="label-row" ar="تنبيهات للأعضاء" en="Notes to members" bi={bi} />
        {NOTES.map(([ar, en], i) => (
          <div key={i} className={bi ? "doc-bi" : undefined}>
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
