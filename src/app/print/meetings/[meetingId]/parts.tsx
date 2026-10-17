import { Clock, MapPin, PenLine, Timer, User, Users } from "lucide-react";
import { englishDayParts, englishTime, MEETING_MODES_EN } from "@/lib/doc-labels";
import { dateParts } from "@/lib/format";
import type { AttendanceStatus } from "@/lib/live";
import { MEETING_MODES } from "@/lib/meetings";
import { DocHead, DocTitle, L, type Badge, type Cell, type Day } from "../../doc";
import type { loadMeeting } from "./_meeting";

export type Meeting = Awaited<ReturnType<typeof loadMeeting>>;

// Attendance has two separate facts: in what capacity a member counted (in own
// right or by proxy) and how they attended (on site or remotely).
const CAPACITY: Record<AttendanceStatus, [string, string, string]> = {
  present: ["أصالة", "In own right", "pill"],
  remote: ["أصالة", "In own right", "pill"],
  proxy: ["بالإنابة", "By proxy", "pill b"],
  excused: ["معتذر", "Excused", "pill r"],
  absent: ["غائب", "Absent", "pill r"],
};
const METHOD: Partial<Record<AttendanceStatus, [string, string]>> = { present: ["في المقر", "On site"], remote: ["عن بُعد", "Remote"] };

export function Capacity({ status, bi }: { status?: AttendanceStatus; bi: boolean }) {
  if (!status) return <span className="pill m">{bi ? "لم يُسجّل · Not recorded" : "لم يُسجّل"}</span>;
  const [ar, en, cls] = CAPACITY[status];
  return <span className={cls}>{bi ? `${ar} · ${en}` : ar}</span>;
}

export function Method({ status, bi }: { status?: AttendanceStatus; bi: boolean }) {
  const m = status && METHOD[status];
  if (!m) return <span className="ref">—</span>;
  return <span className="ref">{bi ? `${m[0]} · ${m[1]}` : m[0]}</span>;
}

export function H2({ ar, en, bi }: { ar: string; en: string; bi: boolean }) {
  return <L as="h2" ar={ar} en={en} bi={bi} />;
}

/** Letterhead and title of a meeting document. */
export function MeetingHead({ m, title, titleEn, badges }: { m: Meeting; title: string; titleEn: string; badges: Badge[] }) {
  const { meeting } = m;
  const year = meeting.starts_at.slice(0, 4);
  return (
    <>
      <DocHead
        bi={m.bi}
        company={m.company}
        companyEn={m.companyEn}
        issuer={m.isBoard ? "أمانة سر مجلس الإدارة" : `أمانة سر ${m.body}`}
        issuerEn={m.isBoard ? "Board Secretariat" : "Committee Secretariat"}
        badges={badges}
      />
      <DocTitle
        bi={m.bi}
        title={title}
        titleEn={titleEn}
        subtitle={
          <>
            {m.body} · الاجتماع رقم (<span className="num">{meeting.number}</span>) لعام <span className="num">{year}</span>
          </>
        }
        subtitleEn={`${m.isBoard ? "Board of Directors" : "Committee"} · Meeting No. ${meeting.number} of ${year}`}
      />
    </>
  );
}

/** The date block for a day: weekday and month in both languages, day, year and Hijri date. */
export function dayBlock(date: Date): Day {
  const d = dateParts(date);
  const en = englishDayParts(date);
  return { weekday: d.weekday, weekdayEn: en.weekday, day: d.day, month: d.month, monthEn: en.month, year: d.year, hijri: d.hijri };
}

/** The date block shows the day the meeting was actually held (or is scheduled). */
export const heldDay = (m: Meeting) => dayBlock(m.held);

const time = (iso: string | null) => (iso ? dateParts(new Date(iso)).time : null);
const timeEn = (iso: string | null) => (iso ? englishTime(new Date(iso)) : null);

/** Card cells for a held meeting: scheduled vs actual time, venue, format, chair and secretary. */
export function heldCells(m: Meeting): Cell[] {
  const { meeting } = m;
  const mode = meeting.mode as keyof typeof MEETING_MODES;
  const actual = meeting.started_at ? <span className="nw">{time(meeting.started_at)} – {time(meeting.ended_at) ?? "…"}</span> : "لم يُعقد";
  const actualEn = meeting.started_at ? <span className="nw">{timeEn(meeting.started_at)} – {timeEn(meeting.ended_at) ?? "…"}</span> : "Not held";
  return [
    { ar: "الموعد المقرر", en: "Scheduled", icon: Clock, value: time(meeting.starts_at), valueEn: timeEn(meeting.starts_at), single: true },
    { ar: "الانعقاد الفعلي", en: "Actual", icon: Timer, value: actual, valueEn: actualEn, single: !!meeting.started_at },
    { ar: "طريقة الانعقاد", en: "Format", icon: Users, value: MEETING_MODES[mode], valueEn: MEETING_MODES_EN[mode] },
    { ar: "المكان", en: "Venue", icon: MapPin, value: mode === "virtual" ? "اتصال مرئي" : meeting.location, valueEn: mode === "virtual" ? "Video conference" : meeting.location_en || "—" },
    { ar: "رئيس الاجتماع", en: "Chair", icon: User, value: m.chair, valueEn: m.chairEn || "—" },
    { ar: "أمين السر", en: "Secretary", icon: PenLine, value: m.secretary, valueEn: m.secretaryEn || "—" },
  ];
}

/** Members, in own right, by proxy, counted, required and the result. */
export function QuorumBox({ q, bi }: { q: Meeting["quorum"]; bi: boolean }) {
  const cell = (ar: string, en: string, value: React.ReactNode, cls?: string) => (
    <div className={cls}>
      <span className="k">
        {ar}
        {bi && <span className="en">{en}</span>}
      </span>
      <b>{value}</b>
    </div>
  );
  return (
    <>
      <div className="doc-quorum">
        {cell("عدد الأعضاء", "Members", q.members)}
        {cell("أصالة", "In own right", q.present)}
        {cell("بالإنابة", "By proxy", q.byProxy)}
        {cell("المحتسبون", "Counted", q.counted)}
        {cell("النصاب المطلوب", "Required", q.required)}
        {cell("النتيجة", "Result", bi ? (
          <>
            {q.met ? "مكتمل" : "غير مكتمل"}
            <span className="en-c" style={{ fontSize: "8pt" }}>{q.met ? "Met" : "Not met"}</span>
          </>
        ) : q.met ? "مكتمل" : "غير مكتمل", q.met ? "met" : "unmet")}
      </div>
      <div className={bi ? "doc-bi" : undefined}>
        <p className="ref">النصاب نصف الأعضاء أصالةً أو نيابةً، ولا يقل الحاضرون عن ثلاثة ما لم يشترط نظام الشركة الأساس أكثر (نظام الشركات م80/2؛ لائحة الحوكمة م30/د). «أصالة» تشمل الحضور في المقر وعن بُعد.</p>
        {bi && <p className="ref en">Quorum is half of the members, in their own right or by proxy, with no fewer than three present (Companies Law Art. 80/2; CMA Art. 30/d). “In own right” covers on-site and remote attendance.</p>}
      </div>
    </>
  );
}
