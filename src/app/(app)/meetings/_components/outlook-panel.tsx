import { CalendarDays, CalendarPlus, Check, CircleAlert, ExternalLink, FileDown, Mail, Users } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import { inviteText, packMail, type MailMeeting } from "@/lib/meeting-mail";
import { outlookWebInvite } from "@/lib/outlook";
import { markPackEmailed } from "../_actions/mail";
import { MailButton } from "./outlook-buttons";
import { Card } from "./overview-cards";

type Props = {
  meetingId: string;
  meeting: MailMeeting;
  minutes: number;
  invitees: { name: string; email: string | null }[];
  items: { title: string; documents: string[] }[];
  deadline: string;
  today: string;
  packEmailedAt: string | null;
};

/** The members' messages, sent from the secretary's Outlook: the calendar invitation and, by the statutory notice date, the pack. */
export function OutlookPanel({ meetingId, meeting, minutes, invitees, items, deadline, today, packEmailedAt }: Props) {
  const to = invitees.flatMap((i) => (i.email ? [i.email] : []));
  const missing = invitees.filter((i) => !i.email).map((i) => i.name);
  const pack = packMail(meeting, items);
  const due = !packEmailedAt && today >= deadline;
  const web = outlookWebInvite({ title: `${meeting.title} – ${meeting.body}`, start: new Date(meeting.startsAt), minutes, location: meeting.place, description: inviteText(meeting, items.map((i) => i.title)), attendees: invitees.flatMap((i) => (i.email ? [{ name: i.name, email: i.email }] : [])) });

  return (
    <Card title="المراسلات عبر Outlook" icon={Mail}>
      {missing.length > 0 && (
        <p className="inline-flex items-start gap-1.5 text-xs text-danger">
          <CircleAlert size={14} aria-hidden="true" className="mt-0.5 shrink-0" /> لا يوجد بريد إلكتروني في ملف: {missing.join("، ")}
        </p>
      )}

      <a href={web} target="_blank" rel="noreferrer" className={buttonClass("primary", "min-h-11 w-full")}>
        <CalendarPlus size={18} aria-hidden="true" /> دعوة الأعضاء في تقويم Outlook
      </a>
      <p className="text-xs leading-6 text-ink-muted">يفتح موعداً جاهزاً بالأعضاء والوقت والمكان وجدول الأعمال. أرفق ملف PDF ثم أرسل الدعوة.</p>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
        <a href={`/print/meetings/${meetingId}/agenda?do=pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
          <FileDown size={14} aria-hidden="true" /> تحميل جدول الأعمال PDF
        </a>
        <span aria-hidden="true" className="h-4 w-px bg-rule" />
        <a href={`/meetings/${meetingId}/invite.ics`} download title="حمّل ملف الدعوة ثم افتحه من قائمة التنزيلات" className="inline-flex items-center gap-1.5 text-primary hover:underline">
          <ExternalLink size={14} aria-hidden="true" /> فتح Outlook على الجهاز
        </a>
      </div>

      <div className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center ${due ? "border-brass bg-brass-soft" : "border-rule"}`}>
        <p className="inline-flex items-center gap-2 font-bold">
          <Users size={18} aria-hidden="true" /> إرسال الحزمة للأعضاء
        </p>
        <p className="-mt-1 text-xs text-ink-muted">جدول الأعمال والمستندات الداعمة</p>
        {packEmailedAt ? (
          <p className="inline-flex items-center gap-1.5 text-xs text-primary">
            <Check size={14} aria-hidden="true" /> أُرسلت الحزمة بالبريد في {packEmailedAt.slice(0, 10)}
          </p>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-surface px-3 py-1 text-xs">
              <CalendarDays size={14} aria-hidden="true" /> آخر موعد: <span className="font-mono">{deadline}</span>
              {due && <strong className="text-brass"> · حان الموعد</strong>}
            </span>
            <MailButton to={to} subject={pack.subject} body={pack.body} label="رسالة الحزمة للأعضاء" variant={due ? "primary" : "secondary"} emptyNote={null} />
            {!to.length && (
              <p className="inline-flex items-center gap-1.5 text-xs text-danger">
                <CircleAlert size={14} aria-hidden="true" />
                {invitees.length ? (
                  "لا يوجد بريد إلكتروني مضاف للأعضاء."
                ) : (
                  <>
                    لا يوجد أعضاء مدعوون لهذا الاجتماع؛{" "}
                    <a href={`/meetings/${meetingId}?tab=invitees`} className="underline">
                      أضفهم من تبويب «المدعوون»
                    </a>
                  </>
                )}
              </p>
            )}
          </>
        )}
        <form action={markPackEmailed.bind(null, meetingId, !packEmailedAt)}>
          <button className="text-xs text-ink-muted hover:underline">{packEmailedAt ? "إلغاء تأكيد الإرسال" : "تأكيد أنها أُرسلت"}</button>
        </form>
      </div>
    </Card>
  );
}
