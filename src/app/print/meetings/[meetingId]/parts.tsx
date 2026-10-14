import { ATTENDANCE, type AttendanceStatus } from "@/lib/live";

const TONE: Record<AttendanceStatus, string> = { present: "pill", remote: "pill", proxy: "pill b", excused: "pill r", absent: "pill r" };

export function AttendancePill({ status }: { status?: AttendanceStatus }) {
  return status ? <span className={TONE[status]}>{ATTENDANCE[status]}</span> : <span className="pill m">لم يُسجّل</span>;
}

/** Members, present, by proxy, required and the result, with the rule it applies. */
export function QuorumBox({ q }: { q: { members: number; present: number; byProxy: number; required: number; met: boolean } }) {
  return (
    <>
      <div className="doc-quorum">
        <div>
          <span>عدد الأعضاء</span>
          <b>{q.members}</b>
        </div>
        <div>
          <span>حاضرون أصالة</span>
          <b>{q.present}</b>
        </div>
        <div>
          <span>بالإنابة</span>
          <b>{q.byProxy}</b>
        </div>
        <div>
          <span>النصاب المطلوب</span>
          <b>{q.required}</b>
        </div>
        <div className={q.met ? "met" : "unmet"}>
          <span>النتيجة</span>
          <b>{q.met ? "مكتمل" : "غير مكتمل"}</b>
        </div>
      </div>
      <p className="ref">النصاب: نصف الأعضاء أصالة أو نيابة على ألا يقل الحاضرون عن ثلاثة، ما لم يشترط نظام الشركة الأساس أكثر (نظام الشركات م80/2؛ لائحة حوكمة الشركات م30/د)، والإنابة لعضو في المجلس وبإنابة واحدة (م81).</p>
    </>
  );
}
