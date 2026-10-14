import type { ReactNode } from "react";
import { ATTENDANCE_EN, englishDate } from "@/lib/doc-labels";
import { dateParts } from "@/lib/format";
import { ATTENDANCE, type AttendanceStatus } from "@/lib/live";
import { DocHead, DocHeadBi, DocTitle, L } from "../../doc";
import type { loadMeeting } from "./_meeting";

type Meeting = Awaited<ReturnType<typeof loadMeeting>>;
const TONE: Record<AttendanceStatus, string> = { present: "pill", remote: "pill", proxy: "pill b", excused: "pill r", absent: "pill r" };

export function AttendancePill({ status, bi = false }: { status?: AttendanceStatus; bi?: boolean }) {
  if (!status) return <span className="pill m">{bi ? "لم يُسجّل · Not recorded" : "لم يُسجّل"}</span>;
  return <span className={TONE[status]}>{bi ? `${ATTENDANCE[status]} · ${ATTENDANCE_EN[status]}` : ATTENDANCE[status]}</span>;
}

/** Letterhead and title for a meeting document, Arabic or bilingual per the company profile. */
export function MeetingHead({ m, reference, title, titleEn, date, badges }: { m: Meeting; reference: string; title: string; titleEn: string; date: Date; badges: { label: string; tone: "c" | "s" | "ok" }[] }) {
  const { meeting } = m;
  const year = meeting.starts_at.slice(0, 4);
  const issuer = m.isBoard ? "أمانة سر مجلس الإدارة" : `أمانة سر ${m.body}`;
  const subtitle: ReactNode = (
    <>
      {m.body} - الاجتماع رقم (<span className="num">{meeting.number}</span>) لعام <span className="num">{year}</span>
    </>
  );
  return m.bi ? (
    <>
      <DocHeadBi company={m.company} companyEn={m.companyEn || m.company} issuer={issuer} issuerEn={m.isBoard ? "Board Secretariat" : "Committee Secretariat"} reference={reference} date={`${dateParts(date).long}م`} dateEn={englishDate(date)} badges={badges} />
      <DocTitle title={title} titleEn={titleEn} subtitle={subtitle} subtitleEn={`Meeting No. ${meeting.number} of ${year}`} />
    </>
  ) : (
    <>
      <DocHead company={m.company} issuer={issuer} reference={reference} date={date} badges={badges.map((b) => ({ ...b, label: b.label.split(" · ")[0] }))} />
      <DocTitle title={title} subtitle={subtitle} />
    </>
  );
}

/** Section heading, with its English title on the end side when bilingual. */
export function H2({ ar, en, bi }: { ar: string; en: string; bi: boolean }) {
  return <L as="h2" ar={ar} en={en} bi={bi} />;
}

/** Members, present, by proxy, required and the result, with the rule it applies. */
export function QuorumBox({ q, bi = false }: { q: { members: number; present: number; byProxy: number; required: number; met: boolean }; bi?: boolean }) {
  const cell = (ar: string, en: string, value: ReactNode, cls?: string) => (
    <div className={cls}>
      <L ar={ar} en={en} bi={bi} />
      <b>{value}</b>
    </div>
  );
  return (
    <>
      <div className="doc-quorum">
        {cell("عدد الأعضاء", "Members", q.members)}
        {cell("حاضرون أصالة", "In person", q.present)}
        {cell("بالإنابة", "By proxy", q.byProxy)}
        {cell("النصاب المطلوب", "Required", q.required)}
        {cell("النتيجة", "Result", bi ? (q.met ? "مكتمل · Met" : "غير مكتمل · Not met") : q.met ? "مكتمل" : "غير مكتمل", q.met ? "met" : "unmet")}
      </div>
      <p className="ref">
        النصاب: نصف الأعضاء أصالة أو نيابة على ألا يقل الحاضرون عن ثلاثة، ما لم يشترط نظام الشركة الأساس أكثر (نظام الشركات م80/2؛ لائحة حوكمة الشركات م30/د)، والإنابة لعضو في المجلس وبإنابة واحدة (م81).
        {bi && <span className="en" style={{ display: "block" }}>Quorum: half of the members in person or by proxy, and no fewer than three present (Companies Law Art. 80/2; CMA Corporate Governance Regulations Art. 30/d).</span>}
      </p>
    </>
  );
}
