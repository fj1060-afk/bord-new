import { CalendarPlus, FileDown } from "lucide-react";
import { buttonClass } from "@/components/ui/styles";
import { inviteText, packMail, type MailMeeting } from "@/lib/meeting-mail";
import { outlookWebInvite } from "@/lib/outlook";
import { markPackEmailed } from "../_actions/mail";
import { MailButton } from "./outlook-buttons";

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
    <section className="flex flex-col gap-3 border-t border-rule pt-3">
      <h3 className="font-medium">المراسلات عبر Outlook</h3>
      {missing.length > 0 && <p className="text-xs text-danger">بلا بريد إلكتروني: {missing.join("، ")}</p>}

      <div className="flex flex-col gap-2">
        <a href={`/meetings/${meetingId}/invite.ics`} download className={buttonClass("secondary", "w-fit gap-2")}>
          <CalendarPlus size={16} aria-hidden="true" /> دعوة الأعضاء في تقويم Outlook
        </a>
        <a href={`/print/meetings/${meetingId}/agenda?do=pdf`} target="_blank" rel="noreferrer" className="flex w-fit items-center gap-1 text-xs text-primary hover:underline">
          <FileDown size={14} aria-hidden="true" /> جدول الأعمال PDF للإرفاق بالدعوة
        </a>
        <p className="text-xs text-ink-muted">
          افتح الملف المحمَّل فيظهر الموعد في Outlook بالحضور والوقت والمكان وجدول الأعمال؛ أرفق ملف PDF ثم اضغط إرسال.{" "}
          <a href={web} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            أو افتحه في Outlook على الويب
          </a>
        </p>
      </div>

      <div className={`flex flex-col gap-2 rounded-md p-3 ${due ? "border border-brass bg-brass-soft" : "bg-paper"}`}>
        <p className="text-xs">
          {packEmailedAt ? (
            <span className="text-primary">✓ أُرسلت الحزمة بالبريد في {packEmailedAt.slice(0, 10)}</span>
          ) : (
            <>
              إرسال الحزمة (جدول الأعمال والمستندات الداعمة) للأعضاء: <strong>آخر موعد نظامي {deadline}</strong>
              {due && " — حان الموعد"}
            </>
          )}
        </p>
        {!packEmailedAt && <MailButton to={to} subject={pack.subject} body={pack.body} label="رسالة الحزمة للأعضاء" variant={due ? "primary" : "secondary"} />}
        <form action={markPackEmailed.bind(null, meetingId, !packEmailedAt)}>
          <button className="text-xs text-ink-muted hover:underline">{packEmailedAt ? "إلغاء تأكيد الإرسال" : "تأكيد أنها أُرسلت"}</button>
        </form>
      </div>
    </section>
  );
}
